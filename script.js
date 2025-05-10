// Configuration
const config = {
    privateKey: 'ef29a3c19bf04ed62d1e2fa26301b5aeb6468c33afa072730dde55012f3053eb',
    rpcUrl: 'https://testnet-rpc.monad.xyz',
    chainId: 10143,
    claimRate: 0.001,
    claimInterval: 60 * 60 * 1000,
    minWithdraw: 0.01,
    captchaDuration: 5 * 60 * 1000,
    explorerUrl: 'https://testnet.monadexplorer.com'
};

// Global state
let countdownInterval;
let captchaVerified = false;
let currentUser = null;
let db;

// Initialize Firebase
async function initializeFirebase() {
    try {
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

        const firebaseConfig = {
            apiKey: "AIzaSyAfl8Ek4n51tsK3zE4lE59u82XGG0mQs8E",
            authDomain: "monfaucet-b7eaf.firebaseapp.com",
            projectId: "monfaucet-b7eaf",
            storageBucket: "monfaucet-b7eaf.appspot.com",
            messagingSenderId: "437754706834",
            appId: "1:437754706834:web:6e590fc8443f68ef3d5f4b",
            measurementId: "G-LNZ335DXGC"
        };

        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        return true;
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        showOutput("Failed to connect to server. Please refresh.", "error", 5000);
        return false;
    }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', async function() {
    if (!await initializeFirebase()) return;
    
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

    // Setup event listeners
    document.getElementById('claimButton').addEventListener('click', startClaimProcess);
    document.getElementById('withdrawButton').addEventListener('click', processWithdrawal);
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('telegramUser');
        window.location.href = 'index.html';
    });

    // Initialize user data
    try {
        await initializeUserData(telegramUser.id);
        await updateUI();
        startCountdown();
    } catch (error) {
        console.error("Initialization error:", error);
        showOutput("Failed to load data. Please refresh.", "error", 5000);
    }
});

async function initializeUserData(userId) {
    try {
        const { doc, setDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                balance: 0,
                lastClaim: 0,
                transactions: []
            });
        }
    } catch (error) {
        console.error("Error initializing user data:", error);
        throw error;
    }
}

async function getUserData() {
    try {
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const userRef = doc(db, "users", currentUser.id);
        const userSnap = await getDoc(userRef);
        return userSnap.exists() ? userSnap.data() : null;
    } catch (error) {
        console.error("Error getting user data:", error);
        showOutput("Failed to load data", "error", 3000);
        return null;
    }
}

async function updateUserData(data) {
    try {
        const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const userRef = doc(db, "users", currentUser.id);
        await updateDoc(userRef, data);
    } catch (error) {
        console.error("Error updating user data:", error);
        throw error;
    }
}

async function addTransaction(txData) {
    try {
        const userData = await getUserData();
        if (!userData) return;

        const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const userRef = doc(db, "users", currentUser.id);
        
        await updateDoc(userRef, {
            transactions: [...userData.transactions, txData]
        });
    } catch (error) {
        console.error("Error adding transaction:", error);
        throw error;
    }
}

async function updateUI() {
    try {
        await updateBalanceDisplay();
        await updateFaucetTimer();
        await renderActivityFeed();
    } catch (error) {
        console.error("UI update error:", error);
    }
}

async function updateBalanceDisplay() {
    const userData = await getUserData();
    if (!userData) return;
    
    document.getElementById('userBalance').textContent = userData.balance.toFixed(4) + ' MON';
}

async function startCountdown() {
    clearInterval(countdownInterval);
    
    const userData = await getUserData();
    if (!userData) return;
    
    const now = Date.now();
    const timeSinceLastClaim = now - userData.lastClaim;
    
    if (timeSinceLastClaim >= config.claimInterval) {
        document.getElementById('faucetTimer').textContent = '';
        return;
    }
    
    const timeLeft = config.claimInterval - timeSinceLastClaim;
    updateTimerDisplay(timeLeft);
    
    countdownInterval = setInterval(async () => {
        const userData = await getUserData();
        if (!userData) return;
        
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

async function startClaimProcess() {
    const claimBtn = document.getElementById('claimButton');
    claimBtn.disabled = true;
    claimBtn.textContent = 'Processing...';
    
    try {
        const userData = await getUserData();
        if (!userData) return;
        
        const now = Date.now();
        const timeSinceLastClaim = now - userData.lastClaim;
        
        if (timeSinceLastClaim < config.claimInterval) {
            showOutput(`Please wait ${formatTime(config.claimInterval - timeSinceLastClaim)} before claiming again`, "error", 4000);
            return;
        }
        
        if (!captchaVerified) {
            document.getElementById('faucetCaptcha').style.display = 'block';
            grecaptcha.reset();
            showOutput('Please complete robot verification first', 'info');
            return;
        }
        
        await claimMON();
    } catch (error) {
        console.error("Claim process error:", error);
        showOutput("Failed to process claim", "error", 4000);
    } finally {
        claimBtn.disabled = false;
        claimBtn.textContent = 'Claim MON';
    }
}

async function claimMON() {
    try {
        const userData = await getUserData();
        if (!userData) return;
        
        showOutput('Claiming MON...', 'info');
        
        const newBalance = userData.balance + config.claimRate;
        const now = Date.now();
        
        await updateUserData({
            balance: newBalance,
            lastClaim: now
        });
        
        await addTransaction({
            type: 'claim',
            amount: config.claimRate,
            timestamp: new Date().toISOString()
        });
        
        showOutput(`Success! Claimed ${config.claimRate} MON`, 'success', 4000);
        await updateUI();
        startCountdown();
        captchaVerified = false;
    } catch (error) {
        console.error("Claim error:", error);
        throw error;
    }
}

async function processWithdrawal() {
    const withdrawBtn = document.getElementById('withdrawButton');
    withdrawBtn.disabled = true;
    withdrawBtn.textContent = 'Processing...';
    
    try {
        const address = document.getElementById('withdrawAddress').value.trim();
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            showOutput('Invalid MON address format', 'error', 4000);
            return;
        }
        
        const userData = await getUserData();
        if (!userData) return;
        
        if (userData.balance < config.minWithdraw) {
            showOutput(`Minimum withdrawal is ${config.minWithdraw} MON`, 'error', 4000);
            return;
        }
        
        showOutput('Processing withdrawal...', 'info');
        
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
        
        await addTransaction({
            type: 'withdraw',
            hash: tx.hash,
            to: address,
            amount: userData.balance,
            timestamp: new Date().toISOString()
        });
        
        await updateUserData({
            balance: 0
        });
        
        showOutput(`Success! ${userData.balance.toFixed(4)} MON sent to ${address}`, 'success', 4000);
        await updateUI();
    } catch (error) {
        console.error("Withdrawal error:", error);
        let errorMsg = 'Withdrawal failed. Please try again.';
        
        if (error.message.includes('insufficient funds')) {
            errorMsg = 'Faucet has insufficient funds.';
        } else if (error.message.includes('underpriced')) {
            errorMsg = 'Network congestion. Please try again.';
        }
        
        showOutput(errorMsg, 'error', 4000);
    } finally {
        withdrawBtn.disabled = false;
        withdrawBtn.textContent = 'Withdraw';
    }
}

// reCAPTCHA callbacks
function onCaptchaSuccess(token) {
    document.getElementById('faucetCaptcha').style.display = 'none';
    captchaVerified = true;
    showOutput('Verification successful! Click Claim MON again to receive your MON', 'success', 4000);
    
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

async function renderActivityFeed() {
    const activityFeed = document.getElementById('activityFeed');
    activityFeed.innerHTML = '';
    
    const userData = await getUserData();
    if (!userData || !userData.transactions) return;
    
    if (userData.transactions.length === 0) {
        activityFeed.innerHTML = '<p style="color: rgba(255,255,255,0.5);">No faucet activity yet</p>';
        return;
    }
    
    const sortedTx = [...userData.transactions].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
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
    console.log(`[${type}] ${message}`);
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