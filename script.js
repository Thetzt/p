// Global state - uses Telegram ID as key for all data
let state = JSON.parse(localStorage.getItem('faucetState')) || {};

// Configuration
const config = {
    privateKey: 'ef29a3c19bf04ed62d1e2fa26301b5aeb6468c33afa072730dde55012f3053eb',
    rpcUrl: 'https://testnet-rpc.monad.xyz',
    chainId: 10143,
    faucetAmount: '0.01',
    dailyLimit: 1,
    explorerUrl: 'https://testnet.monadexplorer.com',
    recaptchaSiteKey: '6Lcs7zErAAAAAFjdySIXvv-1JWcAFeBXPu5H0rH3',
    verificationEndpoint: 'verify.php',
    verificationExpiryHours: 1
};

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', async function() {
    const telegramUser = getTelegramUser();
    if (!telegramUser) return;
    
    setupProfile();
    updateUI();
    setupEventListeners();
});

function getTelegramUser() {
    const user = JSON.parse(localStorage.getItem('telegramUser'));
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    return user;
}

function setupProfile() {
    const telegramUser = getTelegramUser();
    const userAvatar = document.getElementById('userAvatar');
    
    if (telegramUser.photo_url) {
        userAvatar.src = telegramUser.photo_url;
    } else {
        userAvatar.src = 'https://telegram.org/img/t_logo.png';
        userAvatar.style.objectFit = 'contain';
        userAvatar.style.padding = '8px';
        userAvatar.style.backgroundColor = '#0088cc';
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('telegramUser');
        window.location.href = 'index.html';
    });
}

function setupEventListeners() {
    document.getElementById('address').addEventListener('input', updateUI);
    document.getElementById('requestButton').addEventListener('click', processRequest);
}

function updateUI() {
    updateVerificationStatus();
    updateRequestStatus();
    renderActivityFeed();
}

function updateVerificationStatus() {
    const telegramUser = getTelegramUser();
    const statusEl = document.getElementById('verificationStatus');
    
    if (isVerified(telegramUser.id)) {
        statusEl.textContent = 'Verified';
        statusEl.className = 'verification-status verified';
    } else {
        statusEl.textContent = 'Please complete verification';
        statusEl.className = 'verification-status';
    }
}

function updateRequestStatus() {
    const telegramUser = getTelegramUser();
    const userData = getUserData(telegramUser.id);
    
    document.getElementById('requestsCount').textContent = 
        userData.lastRequest ? '1/1' : '0/1';
    
    if (userData.lastRequest) {
        const nextAvailable = new Date(userData.lastRequest + 24 * 60 * 60 * 1000);
        document.getElementById('nextRequest').textContent = 
            nextAvailable.toLocaleTimeString() + ', ' + nextAvailable.toLocaleDateString();
        document.getElementById('nextRequest').className = 'status-value limited';
    } else {
        document.getElementById('nextRequest').textContent = 'Now';
        document.getElementById('nextRequest').className = 'status-value available';
    }
}

function renderActivityFeed() {
    const telegramUser = getTelegramUser();
    const userData = getUserData(telegramUser.id);
    const activityFeed = document.getElementById('activityFeed');
    
    activityFeed.innerHTML = userData.transactions?.length ? 
        userData.transactions.map(tx => `
            <div class="activity-item">
                <div class="activity-title">MON Sent</div>
                <div class="activity-details">
                    ${new Date(tx.timestamp).toLocaleString()}<br>
                    <a href="${config.explorerUrl}/tx/${tx.hash}" target="_blank" class="activity-address">
                        0.01 MON sent to ${tx.to.substring(0, 6)}...${tx.to.substring(38)}
                    </a>
                </div>
            </div>
        `).join('') : '<p style="color: rgba(255,255,255,0.5);">No faucet requests yet</p>';
}

function getUserData(telegramId) {
    if (!state[telegramId]) {
        state[telegramId] = {
            lastRequest: 0,
            verificationExpiry: 0,
            transactions: []
        };
        saveState();
    }
    return state[telegramId];
}

function isVerified(telegramId) {
    const userData = getUserData(telegramId);
    return Date.now() < userData.verificationExpiry;
}

async function verifyUser() {
    const telegramUser = getTelegramUser();
    
    try {
        const token = await new Promise((resolve, reject) => {
            grecaptcha.ready(() => {
                grecaptcha.execute(config.recaptchaSiteKey, {action: 'request'})
                    .then(resolve)
                    .catch(reject);
            });
        });

        const response = await fetch(config.verificationEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `token=${encodeURIComponent(token)}`
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Verification failed');

        // Update verification expiry (1 hour from now)
        const userData = getUserData(telegramUser.id);
        userData.verificationExpiry = Date.now() + (config.verificationExpiryHours * 60 * 60 * 1000);
        saveState();

        return true;
    } catch (error) {
        console.error('Verification error:', error);
        throw error;
    }
}

async function processRequest() {
    const telegramUser = getTelegramUser();
    const userData = getUserData(telegramUser.id);
    const address = document.getElementById('address').value.trim();
    const requestBtn = document.getElementById('requestButton');
    
    // Validate inputs
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        showOutput('Invalid MON address format', 'error', 4000);
        return;
    }

    // Check cooldown
    if (Date.now() < userData.lastRequest + 24 * 60 * 60 * 1000) {
        const nextAvailable = new Date(userData.lastRequest + 24 * 60 * 60 * 1000);
        showOutput(`You can request again at ${nextAvailable.toLocaleString()}`, 'error', 4000);
        return;
    }

    requestBtn.disabled = true;
    
    try {
        // Verify user if needed
        if (!isVerified(telegramUser.id)) {
            showOutput('Verifying...', 'info');
            await verifyUser();
            updateVerificationStatus();
        }

        // Process transaction
        showOutput('Processing your request...', 'info');
        
        const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl, {
            chainId: config.chainId,
            name: 'monad-testnet'
        });
        
        const wallet = new ethers.Wallet(config.privateKey, provider);
        
        const faucetBalance = await provider.getBalance(wallet.address);
        if (ethers.utils.formatEther(faucetBalance) < config.faucetAmount) {
            throw new Error('Faucet has insufficient funds');
        }
        
        const tx = await wallet.sendTransaction({
            to: address,
            value: ethers.utils.parseEther(config.faucetAmount)
        });
        
        // Update state
        userData.lastRequest = Date.now();
        userData.transactions.unshift({
            hash: tx.hash,
            to: address,
            amount: config.faucetAmount,
            timestamp: new Date().toISOString()
        });
        saveState();
        
        // Update UI
        updateUI();
        showOutput(`Success! ${config.faucetAmount} MON sent to ${address}`, 'success', 4000);
        requestBtn.textContent = 'Requested!';
        
    } catch (error) {
        console.error('Error:', error);
        showOutput(error.message || 'Transaction failed', 'error', 4000);
    } finally {
        requestBtn.disabled = false;
        setTimeout(() => {
            requestBtn.textContent = 'Request 0.01 MON';
        }, 4000);
    }
}

function saveState() {
    localStorage.setItem('faucetState', JSON.stringify(state));
}

function showOutput(message, type, duration = 4000) {
    const outputData = document.getElementById('outputData');
    outputData.textContent = message;
    outputData.className = `output-data ${type === 'error' ? 'output-error' : type === 'success' ? 'output-success' : ''}`;
    outputData.style.display = 'block';
    
    if (duration > 0) {
        setTimeout(() => {
            outputData.style.display = 'none';
        }, duration);
    }
}