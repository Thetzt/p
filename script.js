// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDD0mTSuECptBeNzKpiaCDbbCJIoW9SiTg",
  authDomain: "claimpx.firebaseapp.com",
  projectId: "claimpx",
  storageBucket: "claimpx.firebasestorage.app",
  messagingSenderId: "1012471480360",
  appId: "1:1012471480360:web:3b16bc6acc6adcf371b51d",
  measurementId: "G-NYK5SSMCF3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Global state
let countdownInterval;
let captchaVerified = false;
let currentUser = null;
let userData = null;
let userTransactions = [];

// Configuration
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
    
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    if (!telegramUser) {
        window.location.href = 'index.html';
        return;
    }

    currentUser = telegramUser;

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

    // Load user data from Firebase
    await loadUserData();
    setupEventListeners();
    updateUI();
    startCountdown();
});

async function loadUserData() {
    const userRef = database.ref('users/' + currentUser.id);
    
    return new Promise((resolve) => {
        userRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                userData = data;
                if (!userData.balance) userData.balance = 0;
                if (!userData.lastClaim) userData.lastClaim = 0;
            } else {
                // Initialize new user
                userData = {
                    balance: 0,
                    lastClaim: 0
                };
                userRef.set(userData);
            }
            
            // Load transactions
            const txRef = database.ref('transactions/' + currentUser.id);
            txRef.on('value', (txSnapshot) => {
                const txData = txSnapshot.val();
                userTransactions = txData ? Object.values(txData) : [];
                resolve();
            });
        });
    });
}

function setupEventListeners() {
    document.getElementById('claimButton').addEventListener('click', startClaimProcess);
    document.getElementById('withdrawButton').addEventListener('click', processWithdrawal);
    document.getElementById('withdrawAddress').addEventListener('input', updateUI);
}

function updateUI() {
    updateBalanceDisplay();
    updateFaucetTimer();
    renderActivityFeed();
}

function updateBalanceDisplay() {
    if (!userData) return;
    document.getElementById('userBalance').textContent = userData.balance.toFixed(4) + ' MON';
}

function startCountdown() {
    clearInterval(countdownInterval);
    
    if (!userData) return;
    
    const now = Date.now();
    const timeSinceLastClaim = now - userData.lastClaim;
    
    // If it's been more than claim interval, show empty timer
    if (timeSinceLastClaim >= config.claimInterval) {
        document.getElementById('faucetTimer').textContent = '';
        return;
    }
    
    // Otherwise start countdown
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
    if (!userData) return;
    
    const now = Date.now();
    const timeSinceLastClaim = now - userData.lastClaim;
    
    if (timeSinceLastClaim < config.claimInterval) {
        showOutput(`Please wait ${formatTime(config.claimInterval - timeSinceLastClaim)} before claiming again`, 'error', 4000);
        return;
    }
    
    // Check if already verified
    if (captchaVerified) {
        claimMON();
        return;
    }
    
    // Show reCAPTCHA
    document.getElementById('faucetCaptcha').style.display = 'block';
    grecaptcha.reset();
    showOutput('Please complete robot verification first', 'info');
}

async function claimMON() {
    if (!userData || !currentUser) return;
    
    const claimBtn = document.getElementById('claimButton');
    claimBtn.disabled = true;
    
    showOutput('Claiming MON...', 'info');
    
    try {
        // Update user data in Firebase
        const updates = {};
        const newBalance = userData.balance + config.claimRate;
        const now = Date.now();
        
        updates['users/' + currentUser.id + '/balance'] = newBalance;
        updates['users/' + currentUser.id + '/lastClaim'] = now;
        
        // Create transaction record
        const txId = database.ref('transactions/' + currentUser.id).push().key;
        const txRecord = {
            type: 'claim',
            amount: config.claimRate,
            timestamp: now,
            telegramId: currentUser.id
        };
        
        updates['transactions/' + currentUser.id + '/' + txId] = txRecord;
        
        // Update all data in one transaction
        await database.ref().update(updates);
        
        // Update local state
        userData.balance = newBalance;
        userData.lastClaim = now;
        userTransactions.push(txRecord);
        
        showOutput(`Success! Claimed ${config.claimRate} MON`, 'success', 4000);
        updateUI();
        startCountdown();
        captchaVerified = false;
    } catch (error) {
        console.error('Claim error:', error);
        showOutput('Failed to claim MON. Please try again.', 'error', 4000);
    } finally {
        claimBtn.disabled = false;
    }
}

async function processWithdrawal() {
    const address = document.getElementById('withdrawAddress').value.trim();
    
    if (!currentUser) {
        showOutput('Please login with Telegram first', 'error', 4000);
        return;
    }
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        showOutput('Invalid MON address format', 'error', 4000);
        return;
    }
    
    if (!userData || userData.balance < config.minWithdraw) {
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
        
        // Update Firebase data
        const updates = {};
        const txId = database.ref('transactions/' + currentUser.id).push().key;
        const txRecord = {
            type: 'withdraw',
            hash: tx.hash,
            to: address,
            amount: userData.balance,
            timestamp: Date.now(),
            telegramId: currentUser.id
        };
        
        updates['users/' + currentUser.id + '/balance'] = 0;
        updates['transactions/' + currentUser.id + '/' + txId] = txRecord;
        
        await database.ref().update(updates);
        
        // Update local state
        userData.balance = 0;
        userTransactions.push(txRecord);
        
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
    captchaVerified = true;
    showOutput('Verification successful! Click Claim MON again to receive your MON', 'success', 4000);
    
    // Auto-expire after 5 minutes
    setTimeout(() => {
        if (captchaVerified) {
            captchaVerified = false;
            showOutput('Verification expired. Please complete reCAPTCHA again.', 'error', 4000);
        }
    }, config.captchaDuration);
}

function onCaptchaExpired() {
    captchaVerified = false;
    showOutput('Verification expired. Please complete reCAPTCHA again.', 'error', 4000);
}

function renderActivityFeed() {
    const activityFeed = document.getElementById('activityFeed');
    activityFeed.innerHTML = '';
    
    if (!currentUser) return;
    
    if (userTransactions.length === 0) {
        activityFeed.innerHTML = '<p style="color: rgba(255,255,255,0.5);">No faucet activity yet</p>';
        return;
    }
    
    // Sort transactions by timestamp (newest first)
    const sortedTx = [...userTransactions].sort((a, b) => b.timestamp - a.timestamp);
    
    sortedTx.forEach(tx => {
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