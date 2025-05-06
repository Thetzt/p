// Global state
let verificationExpiry = JSON.parse(localStorage.getItem('verificationExpiry')) || {};
let telegramRequests = JSON.parse(localStorage.getItem('telegramRequests')) || {};
let userTransactions = JSON.parse(localStorage.getItem('userTransactions')) || {};

// Configuration
const config = {
    privateKey: 'ef29a3c19bf04ed62d1e2fa26301b5aeb6468c33afa072730dde55012f3053eb',
    rpcUrl: 'https://testnet-rpc.monad.xyz',
    chainId: 10143,
    faucetAmount: '0.01',
    dailyLimit: 1,
    explorerUrl: 'https://testnet.monadexplorer.com',
    verificationApiToken: '42cedc31154967c9acc72e0e3a4b6e06b8ee9eb5'
};

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', async function() {
    if (!document.getElementById('requestButton')) return;
    
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    if (!telegramUser) {
        window.location.href = 'index.html';
        return;
    }

    // Profile setup
    const userAvatar = document.getElementById('userAvatar');
    if (telegramUser.photo_url) {
        userAvatar.src = telegramUser.photo_url;
    } else {
        userAvatar.src = 'https://telegram.org/img/t_logo.png';
        userAvatar.style.objectFit = 'contain';
        userAvatar.style.padding = '8px';
        userAvatar.style.backgroundColor = '#0088cc';
    }

    // Profile click handler
    const profileBtn = document.getElementById('profileBtn');
    const logoutPopup = document.getElementById('logoutPopup');
    
    profileBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        logoutPopup.style.display = logoutPopup.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', function() {
        logoutPopup.style.display = 'none';
    });

    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('telegramUser');
        window.location.href = 'index.html';
    });

    // Check verification
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('verificationComplete')) {
        const telegramId = urlParams.get('tgid');
        if (telegramId) {
            verificationExpiry[telegramId] = Date.now() + (24 * 60 * 60 * 1000);
            localStorage.setItem('verificationExpiry', JSON.stringify(verificationExpiry));
            showOutput('Verification successful!', 'success', 4000);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    updateUI();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('address').addEventListener('input', updateUI);
    document.getElementById('verifyBtn').addEventListener('click', verifyTelegramAccount);
    document.getElementById('requestButton').addEventListener('click', processRequest);
}

function updateUI() {
    updateRequestStatus();
    renderActivityFeed();
    updateButtonStates();
}

function updateButtonStates() {
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    if (!telegramUser) return;
    
    const isVerified = isTelegramVerified(telegramUser.id);
    document.getElementById('verifyBtn').style.display = isVerified ? 'none' : 'block';
    document.getElementById('verifySuccessBtn').style.display = isVerified ? 'block' : 'none';
}

function isTelegramVerified(telegramId) {
    const expiryTime = verificationExpiry[telegramId] || 0;
    return Date.now() < expiryTime;
}

function updateRequestStatus() {
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    if (!telegramUser) return;
    
    const requestsCountEl = document.getElementById('requestsCount');
    const nextRequestEl = document.getElementById('nextRequest');
    
    const userRequest = telegramRequests[telegramUser.id] || { lastRequest: 0 };
    const lastRequestTime = new Date(userRequest.lastRequest);
    const now = new Date();
    
    if ((now - lastRequestTime) >= 24 * 60 * 60 * 1000) {
        userRequest.lastRequest = 0;
        telegramRequests[telegramUser.id] = userRequest;
        localStorage.setItem('telegramRequests', JSON.stringify(telegramRequests));
    }
    
    requestsCountEl.textContent = userRequest.lastRequest ? '1/1' : '0/1';
    
    if (userRequest.lastRequest) {
        const nextAvailable = new Date(lastRequestTime.getTime() + 24 * 60 * 60 * 1000);
        nextRequestEl.textContent = nextAvailable.toLocaleTimeString() + ', ' + nextAvailable.toLocaleDateString();
        nextRequestEl.className = 'status-value limited';
    } else {
        nextRequestEl.textContent = 'Now';
        nextRequestEl.className = 'status-value available';
    }
}

function renderActivityFeed() {
    const activityFeed = document.getElementById('activityFeed');
    activityFeed.innerHTML = '';
    
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    if (!telegramUser) return;
    
    const userTx = userTransactions[telegramUser.id] || [];
    
    if (userTx.length === 0) {
        activityFeed.innerHTML = '<p style="color: rgba(255,255,255,0.5);">No faucet requests yet</p>';
        return;
    }
    
    userTx.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    userTx.forEach(tx => {
        const date = new Date(tx.timestamp);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        const shortAddress = `${tx.to.substring(0, 4)}...${tx.to.substring(tx.to.length - 4)}`;
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-title">MON Sent</div>
            <div class="activity-details">
                ${dateStr}, ${timeStr}<br>
                <a href="${config.explorerUrl}/tx/${tx.hash}" target="_blank" class="activity-address">
                    0.01 MON sent to ${shortAddress}
                </a>
            </div>
        `;
        activityFeed.appendChild(activityItem);
    });
}

async function verifyTelegramAccount() {
    const verifyBtn = document.getElementById('verifyBtn');
    verifyBtn.disabled = true;
    showOutput('Preparing verification...', 'info');

    try {
        const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
        if (!telegramUser) throw new Error('No Telegram user found');
        
        const RETURN_URL = encodeURIComponent(
            `https://claimpx.netlify.app/renew.html?tgid=${telegramUser.id}`
        );
        
        const apiUrl = `https://exe.io/api?api=${config.verificationApiToken}&url=${RETURN_URL}&alias=MONFaucetVeri`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to create verification link');

        const data = await response.json();
        if (data.status === 'error') throw new Error(data.message);
        
        window.location.href = data.shortenedUrl;
    } catch (error) {
        showOutput(`Error: ${error.message}`, 'error', 4000);
        verifyBtn.disabled = false;
    }
}

async function processRequest() {
    const address = document.getElementById('address').value.trim();
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    
    if (!telegramUser) {
        showOutput('Please login with Telegram first', 'error', 4000);
        return;
    }
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        showOutput('Invalid MON address format', 'error', 4000);
        return;
    }
    
    if (!isTelegramVerified(telegramUser.id)) {
        showOutput('Please complete robot verification first', 'error', 4000);
        return;
    }

    // Check 24 hour limit
    const userRequest = telegramRequests[telegramUser.id] || { lastRequest: 0 };
    const lastRequestTime = new Date(userRequest.lastRequest);
    const now = new Date();
    
    if ((now - lastRequestTime) < 24 * 60 * 60 * 1000) {
        const nextAvailable = new Date(lastRequestTime.getTime() + 24 * 60 * 60 * 1000);
        showOutput(`You can request again at ${nextAvailable.toLocaleString()}`, 'error', 4000);
        return;
    }

    const requestBtn = document.getElementById('requestButton');
    requestBtn.disabled = true;
    showOutput('Processing your request...', 'info');

    try {
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
        
        // Record transaction
        const txRecord = {
            hash: tx.hash,
            to: address,
            amount: config.faucetAmount,
            timestamp: new Date().toISOString(),
            telegramId: telegramUser.id
        };
        
        const userTx = userTransactions[telegramUser.id] || [];
        userTx.push(txRecord);
        userTransactions[telegramUser.id] = userTx;
        localStorage.setItem('userTransactions', JSON.stringify(userTransactions));
        
        // Update request time
        userRequest.lastRequest = Date.now();
        telegramRequests[telegramUser.id] = userRequest;
        localStorage.setItem('telegramRequests', JSON.stringify(telegramRequests));
        
        updateUI();
        showOutput(`Success! ${config.faucetAmount} MON sent to ${address}`, 'success', 4000);
        requestBtn.textContent = 'Requested!';
        
    } catch (error) {
        console.error('Transaction error:', error);
        let errorMsg = 'Transaction failed. Please try again.';
        
        if (error.message.includes('insufficient funds')) {
            errorMsg = 'Faucet has insufficient funds.';
        } else if (error.message.includes('underpriced')) {
            errorMsg = 'Network congestion. Please try again.';
        }
        
        showOutput(errorMsg, 'error', 4000);
    } finally {
        requestBtn.disabled = false;
        setTimeout(() => {
            requestBtn.textContent = 'Request 0.01 MON';
        }, 4000);
    }
}

function showOutput(message, type, duration = 4000) {
    const outputData = document.getElementById('outputData');
    outputData.textContent = message;
    outputData.className = 'output-data';
    
    if (type === 'error') {
        outputData.classList.add('output-error');
    } else if (type === 'success') {
        outputData.classList.add('output-success');
    }
    
    outputData.style.display = 'block';
    
    if (duration > 0) {
        setTimeout(() => {
            outputData.style.display = 'none';
        }, duration);
    }
}