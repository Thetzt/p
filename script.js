// Global configuration
const config = {
    privateKey: 'ef29a3c19bf04ed62d1e2fa26301b5aeb6468c33afa072730dde55012f3053eb',
    rpcUrl: 'https://testnet-rpc.monad.xyz',
    chainId: 10143,
    claimRate: 0.001, // MON per hour
    claimInterval: 60 * 60 * 1000, // 1 hour in ms
    minWithdraw: 0.01, // Minimum withdrawal amount
    captchaDuration: 5 * 60 * 1000, // 5 minutes for captcha
    explorerUrl: 'https://testnet.monadexplorer.com'
};

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', async function() {
    if (!document.getElementById('claimButton')) return;
    
    const telegramUser = getTelegramUser();
    if (!telegramUser) {
        window.location.href = 'index.html';
        return;
    }

    setupProfile();
    setupEventListeners();
    initializeUserData(telegramUser.id);
    updateUI();
    startCountdown();
    
    // Sync data every 5 seconds
    setInterval(() => {
        updateUI();
    }, 5000);
});

// Helper functions
function getTelegramUser() {
    return JSON.parse(localStorage.getItem('telegramUser'));
}

function getFaucetData() {
    return JSON.parse(localStorage.getItem('faucetData')) || {};
}

function getUserTransactions() {
    return JSON.parse(localStorage.getItem('userTransactions')) || {};
}

function saveFaucetData(data) {
    localStorage.setItem('faucetData', JSON.stringify(data));
}

function saveUserTransactions(transactions) {
    localStorage.setItem('userTransactions', JSON.stringify(transactions));
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
}

function setupEventListeners() {
    document.getElementById('claimButton').addEventListener('click', startClaimProcess);
    document.getElementById('withdrawButton').addEventListener('click', processWithdrawal);
    document.getElementById('withdrawAddress').addEventListener('input', updateUI);
}

function initializeUserData(telegramId) {
    const faucetData = getFaucetData();
    
    if (!faucetData[telegramId]) {
        faucetData[telegramId] = {
            balance: 0,
            lastClaim: 0
        };
        saveFaucetData(faucetData);
    }
}

function updateUI() {
    const telegramUser = getTelegramUser();
    if (!telegramUser) return;
    
    const faucetData = getFaucetData();
    const userData = faucetData[telegramUser.id] || { balance: 0, lastClaim: 0 };
    
    // Update balance display
    document.getElementById('userBalance').textContent = userData.balance.toFixed(4) + ' MON';
    
    // Update timer
    updateFaucetTimer();
    
    // Update activity feed
    renderActivityFeed();
}

function updateFaucetTimer() {
    clearInterval(countdownInterval);
    
    const telegramUser = getTelegramUser();
    if (!telegramUser) return;
    
    const faucetData = getFaucetData();
    const userData = faucetData[telegramUser.id] || { lastClaim: 0 };
    const now = Date.now();
    const timeSinceLastClaim = now - userData.lastClaim;
    
    if (timeSinceLastClaim >= config.claimInterval) {
        document.getElementById('faucetTimer').textContent = '';
        return;
    }
    
    const timeLeft = config.claimInterval - timeSinceLastClaim;
    updateTimerDisplay(timeLeft);
    
    countdownInterval = setInterval(() => {
        const remaining = userData.lastClaim + config.claimInterval - Date.now();
        
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            document.getElementById('faucetTimer').textContent = '';
            return;
        }
        
        updateTimerDisplay(remaining);
    }, 1000);
}

function updateTimerDisplay(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    document.getElementById('faucetTimer').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startClaimProcess() {
    const telegramUser = getTelegramUser();
    if (!telegramUser) return;
    
    const faucetData = getFaucetData();
    const userData = faucetData[telegramUser.id] || { lastClaim: 0 };
    const now = Date.now();
    const timeSinceLastClaim = now - userData.lastClaim;
    
    if (timeSinceLastClaim < config.claimInterval) {
        showOutput(`Please wait ${formatTime(config.claimInterval - timeSinceLastClaim)} before claiming again`, 'error', 4000);
        return;
    }
    
    if (window.captchaVerified) {
        processClaim();
        return;
    }
    
    document.getElementById('faucetCaptcha').style.display = 'block';
    grecaptcha.reset();
    showOutput('Please complete robot verification first', 'info');
}

function processClaim() {
    const telegramUser = getTelegramUser();
    if (!telegramUser) return;
    
    const claimBtn = document.getElementById('claimButton');
    claimBtn.disabled = true;
    
    showOutput('Claiming MON...', 'info');
    
    setTimeout(() => {
        const faucetData = getFaucetData();
        const userData = faucetData[telegramUser.id] || { balance: 0, lastClaim: 0 };
        
        // Update balance and last claim time
        userData.balance += config.claimRate;
        userData.lastClaim = Date.now();
        faucetData[telegramUser.id] = userData;
        saveFaucetData(faucetData);
        
        // Record transaction
        const userTransactions = getUserTransactions();
        const txRecord = {
            type: 'claim',
            amount: config.claimRate,
            timestamp: new Date().toISOString(),
            telegramId: telegramUser.id
        };
        
        const userTx = userTransactions[telegramUser.id] || [];
        userTx.push(txRecord);
        userTransactions[telegramUser.id] = userTx;
        saveUserTransactions(userTransactions);
        
        showOutput(`Success! Claimed ${config.claimRate} MON`, 'success', 4000);
        updateUI();
        startCountdown();
        claimBtn.disabled = false;
        window.captchaVerified = false;
    }, 1500);
}

async function processWithdrawal() {
    const address = document.getElementById('withdrawAddress').value.trim();
    const telegramUser = getTelegramUser();
    
    if (!telegramUser) {
        showOutput('Please login with Telegram first', 'error', 4000);
        return;
    }
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        showOutput('Invalid MON address format', 'error', 4000);
        return;
    }
    
    const faucetData = getFaucetData();
    const userData = faucetData[telegramUser.id] || { balance: 0 };
    
    if (userData.balance < config.minWithdraw) {
        showOutput(`Minimum withdrawal is ${config.minWithdraw} MON`, 'error', 4000);
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
        const userTransactions = getUserTransactions();
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
        saveUserTransactions(userTransactions);
        
        // Update balance
        userData.balance = 0;
        faucetData[telegramUser.id] = userData;
        saveFaucetData(faucetData);
        
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
    document.getElementById('faucetCaptcha').style.display = 'none';
    window.captchaVerified = true;
    showOutput('Verification successful! Click Claim MON again to receive your MON', 'success', 4000);
    
    setTimeout(() => {
        if (window.captchaVerified) {
            window.captchaVerified = false;
            showOutput('Verification expired. Please complete reCAPTCHA again.', 'error', 4000);
        }
    }, config.captchaDuration);
}

function onCaptchaExpired() {
    window.captchaVerified = false;
    showOutput('Verification expired. Please complete reCAPTCHA again.', 'error', 4000);
}

function renderActivityFeed() {
    const activityFeed = document.getElementById('activityFeed');
    activityFeed.innerHTML = '';
    
    const telegramUser = getTelegramUser();
    if (!telegramUser) return;
    
    const userTransactions = getUserTransactions();
    const userTx = userTransactions[telegramUser.id] || [];
    
    if (userTx.length === 0) {
        activityFeed.innerHTML = '<p style="color: rgba(255,255,255,0.5);">No faucet activity yet</p>';
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