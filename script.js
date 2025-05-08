// Global state
let verificationExpiry = JSON.parse(localStorage.getItem('verificationExpiry')) || {};
let miningData = JSON.parse(localStorage.getItem('miningData')) || {};
let userTransactions = JSON.parse(localStorage.getItem('userTransactions')) || {};
let miningInterval;
let countdownInterval;

// Configuration
const config = {
    privateKey: 'ef29a3c19bf04ed62d1e2fa26301b5aeb6468c33afa072730dde55012f3053eb',
    rpcUrl: 'https://testnet-rpc.monad.xyz',
    chainId: 10143,
    miningRate: 0.0001, // MON per 2 hours
    miningInterval: 2 * 60 * 60 * 1000, // 2 hours in ms
    explorerUrl: 'https://testnet.monadexplorer.com'
};

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', async function() {
    if (!document.getElementById('claimButton')) return;
    
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

    // Initialize mining data for user if not exists
    if (!miningData[telegramUser.id]) {
        miningData[telegramUser.id] = {
            balance: 0,
            lastClaim: 0
        };
        localStorage.setItem('miningData', JSON.stringify(miningData));
    }

    setupEventListeners();
    updateUI();
    startMiningTimer();
});

function setupEventListeners() {
    document.getElementById('claimButton').addEventListener('click', startClaimProcess);
    document.getElementById('withdrawButton').addEventListener('click', processWithdrawal);
    document.getElementById('withdrawAddress').addEventListener('input', updateUI);
}

function updateUI() {
    updateBalanceDisplay();
    updateMiningTimer();
    updateVerificationStatus();
    renderActivityFeed();
}

function updateBalanceDisplay() {
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    if (!telegramUser) return;
    
    const userData = miningData[telegramUser.id] || { balance: 0 };
    document.getElementById('userBalance').textContent = userData.balance.toFixed(4) + ' MON';
}

function updateVerificationStatus() {
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    if (!telegramUser) return;
    
    const statusEl = document.getElementById('verificationStatus');
    const isVerified = isTelegramVerified(telegramUser.id);
    
    if (isVerified) {
        const expiryTime = new Date(verificationExpiry[telegramUser.id]);
        const timeLeft = Math.floor((expiryTime - Date.now()) / (60 * 1000));
        
        if (timeLeft > 0) {
            statusEl.textContent = `✓ Verified (expires in ${timeLeft} minutes)`;
            statusEl.className = 'verification-status verified';
        } else {
            statusEl.textContent = 'Verification expired. Please complete reCAPTCHA again.';
            statusEl.className = 'verification-status expired';
        }
    } else {
        statusEl.textContent = 'Please complete the reCAPTCHA verification';
        statusEl.className = 'verification-status expired';
    }
}

function startMiningTimer() {
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    if (!telegramUser) return;
    
    const userData = miningData[telegramUser.id] || { lastClaim: 0 };
    const now = Date.now();
    const timeSinceLastClaim = now - userData.lastClaim;
    
    // If it's been more than mining interval, reset timer
    if (timeSinceLastClaim >= config.miningInterval) {
        document.getElementById('miningTimer').textContent = 'Ready to claim!';
        return;
    }
    
    // Otherwise start countdown
    const timeLeft = config.miningInterval - timeSinceLastClaim;
    startCountdown(timeLeft);
}

function startCountdown(timeLeft) {
    clearInterval(countdownInterval);
    
    const timerElement = document.getElementById('miningTimer');
    const endTime = Date.now() + timeLeft;
    
    countdownInterval = setInterval(() => {
        const remaining = endTime - Date.now();
        
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            timerElement.textContent = 'Ready to claim!';
            return;
        }
        
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function startClaimProcess() {
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    if (!telegramUser) return;
    
    const userData = miningData[telegramUser.id] || { lastClaim: 0 };
    const now = Date.now();
    const timeSinceLastClaim = now - userData.lastClaim;
    
    if (timeSinceLastClaim < config.miningInterval) {
        showOutput(`Please wait ${formatTime(config.miningInterval - timeSinceLastClaim)} before claiming again`, 'error', 4000);
        return;
    }
    
    if (!isTelegramVerified(telegramUser.id)) {
        document.getElementById('miningCaptcha').style.display = 'block';
        showOutput('Please complete the reCAPTCHA verification', 'error', 4000);
        return;
    }
    
    claimMON();
}

function claimMON() {
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    if (!telegramUser) return;
    
    const claimBtn = document.getElementById('claimButton');
    claimBtn.disabled = true;
    showOutput('Claiming MON...', 'info');
    
    setTimeout(() => {
        // Update mining data
        const userData = miningData[telegramUser.id] || { balance: 0, lastClaim: 0 };
        userData.balance += config.miningRate;
        userData.lastClaim = Date.now();
        miningData[telegramUser.id] = userData;
        localStorage.setItem('miningData', JSON.stringify(miningData));
        
        // Record transaction
        const txRecord = {
            type: 'claim',
            amount: config.miningRate,
            timestamp: new Date().toISOString(),
            telegramId: telegramUser.id
        };
        
        const userTx = userTransactions[telegramUser.id] || [];
        userTx.push(txRecord);
        userTransactions[telegramUser.id] = userTx;
        localStorage.setItem('userTransactions', JSON.stringify(userTransactions));
        
        showOutput(`Success! Claimed ${config.miningRate} MON`, 'success', 4000);
        updateUI();
        startCountdown(config.miningInterval);
        claimBtn.disabled = false;
    }, 1500); // Simulate network delay
}

async function processWithdrawal() {
    const address = document.getElementById('withdrawAddress').value.trim();
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    
    if (!telegramUser) {
        showOutput('Please login with Telegram first', 'error', 4000);
        return;
    }
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        showOutput('Invalid MON address format', 'error', 4000);
        return;
    }
    
    const userData = miningData[telegramUser.id] || { balance: 0 };
    if (userData.balance <= 0) {
        showOutput('No MON balance to withdraw', 'error', 4000);
        return;
    }
    
    const withdrawBtn = document.getElementById('withdrawButton');
    withdrawBtn.disabled = true;
    showOutput('Processing withdrawal...', 'info');

    try {
        const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl, {
            chainId: config.chainId,
            name: 'monad-testnet'
        });
        
        const wallet = new ethers.Wallet(config.privateKey, provider);
        
        const faucetBalance = await provider.getBalance(wallet.address);
        if (ethers.utils.formatEther(faucetBalance) < userData.balance) {
            throw new Error('Faucet has insufficient funds');
        }
        
        const tx = await wallet.sendTransaction({
            to: address,
            value: ethers.utils.parseEther(userData.balance.toString())
        });
        
        // Record transaction
        const txRecord = {
            type: 'withdraw',
            hash: tx.hash,
            to: address,
            amount: userData.balance,
            timestamp: new Date().toISOString(),
            telegramId: telegramUser.id
        };
        
        const userTx = userTransactions[telegramUser.id] || [];
        userTx.push(txRecord);
        userTransactions[telegramUser.id] = userTx;
        localStorage.setItem('userTransactions', JSON.stringify(userTransactions));
        
        // Update balance
        userData.balance = 0;
        miningData[telegramUser.id] = userData;
        localStorage.setItem('miningData', JSON.stringify(miningData));
        
        updateUI();
        showOutput(`Success! ${userData.balance.toFixed(4)} MON sent to ${address}`, 'success', 4000);
        
    } catch (error) {
        console.error('Withdrawal error:', error);
        let errorMsg = 'Withdrawal failed. Please try again.';
        
        if (error.message.includes('insufficient funds')) {
            errorMsg = 'Faucet has insufficient funds.';
        } else if (error.message.includes('underpriced')) {
            errorMsg = 'Network congestion. Please try again.';
        }
        
        showOutput(errorMsg, 'error', 4000);
    } finally {
        withdrawBtn.disabled = false;
    }
}

// reCAPTCHA callbacks
function onCaptchaSuccess(token) {
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    if (!telegramUser) return;
    
    // Hide captcha
    document.getElementById('miningCaptcha').style.display = 'none';
    
    // Set verification to expire in 1 hour
    verificationExpiry[telegramUser.id] = Date.now() + (60 * 60 * 1000);
    localStorage.setItem('verificationExpiry', JSON.stringify(verificationExpiry));
    
    showOutput('Verification successful!', 'success', 4000);
    updateVerificationStatus();
    
    // Proceed with claim
    claimMON();
}

function onCaptchaExpired() {
    showOutput('Verification expired. Please complete reCAPTCHA again.', 'error', 4000);
    updateVerificationStatus();
}

function isTelegramVerified(telegramId) {
    const expiryTime = verificationExpiry[telegramId] || 0;
    return Date.now() < expiryTime;
}

function renderActivityFeed() {
    const activityFeed = document.getElementById('activityFeed');
    activityFeed.innerHTML = '';
    
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    if (!telegramUser) return;
    
    const userTx = userTransactions[telegramUser.id] || [];
    
    if (userTx.length === 0) {
        activityFeed.innerHTML = '<p style="color: rgba(255,255,255,0.5);">No mining activity yet</p>';
        return;
    }
    
    userTx.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    userTx.forEach(tx => {
        const date = new Date(tx.timestamp);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        if (tx.type === 'claim') {
            activityItem.innerHTML = `
                <div class="activity-title">MON Claimed</div>
                <div class="activity-details">
                    ${dateStr}, ${timeStr}<br>
                    ${tx.amount} MON added to your balance
                </div>
            `;
        } else if (tx.type === 'withdraw') {
            const shortAddress = `${tx.to.substring(0, 4)}...${tx.to.substring(tx.to.length - 4)}`;
            activityItem.innerHTML = `
                <div class="activity-title">MON Withdrawn</div>
                <div class="activity-details">
                    ${dateStr}, ${timeStr}<br>
                    <a href="${config.explorerUrl}/tx/${tx.hash}" target="_blank" class="activity-address">
                        ${tx.amount.toFixed(4)} MON sent to ${shortAddress}
                    </a>
                </div>
            `;
        }
        
        activityFeed.appendChild(activityItem);
    });
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

function formatTime(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
}