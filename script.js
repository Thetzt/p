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
let firebaseInitialized = false;

// Debugging function
function debugLog(message, data = null) {
    console.log(`[DEBUG] ${message}`, data || '');
}

// Initialize Firebase
async function initializeFirebase() {
    try {
        debugLog("Initializing Firebase...");
        
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const { getFirestore, enableIndexedDbPersistence } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

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
        
        // Enable offline persistence
        try {
            await enableIndexedDbPersistence(db);
            debugLog("Firebase offline persistence enabled");
        } catch (err) {
            debugLog("Firebase offline persistence error:", err);
        }
        
        firebaseInitialized = true;
        debugLog("Firebase initialized successfully");
        return true;
    } catch (error) {
        debugLog("Firebase initialization failed:", error);
        showOutput("Failed to connect to server. Please refresh.", "error", 5000);
        return false;
    }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', async function() {
    debugLog("DOM content loaded");
    
    if (!await initializeFirebase()) {
        debugLog("Initialization failed - stopping execution");
        return;
    }

    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    if (!telegramUser) {
        debugLog("No Telegram user found - redirecting to login");
        window.location.href = 'index.html';
        return;
    }

    currentUser = telegramUser;
    debugLog("User authenticated:", {id: telegramUser.id, username: telegramUser.username});

    // Profile setup
    const userAvatar = document.getElementById('userAvatar');
    if (telegramUser.photo_url) {
        userAvatar.src = telegramUser.photo_url;
        debugLog("Set user avatar from photo_url");
    } else {
        userAvatar.src = 'https://telegram.org/img/t_logo.png';
        userAvatar.style.objectFit = 'contain';
        userAvatar.style.padding = '8px';
        userAvatar.style.backgroundColor = '#0088cc';
        debugLog("Set default Telegram avatar");
    }

    // Setup event listeners
    document.getElementById('claimButton').addEventListener('click', startClaimProcess);
    document.getElementById('withdrawButton').addEventListener('click', processWithdrawal);
    document.getElementById('logoutBtn').addEventListener('click', function() {
        debugLog("User logged out");
        localStorage.removeItem('telegramUser');
        window.location.href = 'index.html';
    });

    // Initialize user data
    try {
        debugLog("Initializing user data...");
        await initializeUserData(telegramUser.id);
        debugLog("User data initialized");
        
        debugLog("Updating UI...");
        await updateUI();
        debugLog("UI updated");
        
        debugLog("Starting countdown...");
        startCountdown();
        debugLog("Countdown started");
    } catch (error) {
        debugLog("Initialization error:", error);
        showOutput("Failed to load data. Please refresh.", "error", 5000);
    }
});

async function initializeUserData(userId) {
    try {
        debugLog(`Initializing data for user ${userId}`);
        const { doc, setDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            debugLog("Creating new user document");
            await setDoc(userRef, {
                balance: 0,
                lastClaim: 0,
                transactions: [],
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            });
            debugLog("New user document created");
        } else {
            debugLog("Existing user document found");
        }
    } catch (error) {
        debugLog("Error initializing user data:", error);
        throw error;
    }
}

async function getUserData() {
    try {
        debugLog("Getting user data...");
        if (!firebaseInitialized) {
            throw new Error("Firebase not initialized");
        }
        
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const userRef = doc(db, "users", currentUser.id);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            debugLog("User document doesn't exist");
            return null;
        }
        
        debugLog("User data retrieved successfully");
        return userSnap.data();
    } catch (error) {
        debugLog("Error getting user data:", error);
        showOutput("Failed to load data", "error", 3000);
        return null;
    }
}

async function updateUserData(data) {
    try {
        debugLog("Updating user data:", data);
        const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const userRef = doc(db, "users", currentUser.id);
        await updateDoc(userRef, {
            ...data,
            lastUpdated: new Date().toISOString()
        });
        debugLog("User data updated successfully");
    } catch (error) {
        debugLog("Error updating user data:", error);
        throw error;
    }
}

async function addTransaction(txData) {
    try {
        debugLog("Adding transaction:", txData);
        const userData = await getUserData();
        if (!userData) return;

        const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const userRef = doc(db, "users", currentUser.id);
        
        await updateDoc(userRef, {
            transactions: [...userData.transactions, txData],
            lastUpdated: new Date().toISOString()
        });
        debugLog("Transaction added successfully");
    } catch (error) {
        debugLog("Error adding transaction:", error);
        throw error;
    }
}

async function updateUI() {
    try {
        await updateBalanceDisplay();
        await updateFaucetTimer();
        await renderActivityFeed();
    } catch (error) {
        debugLog("UI update error:", error);
        throw error;
    }
}

async function updateBalanceDisplay() {
    const userData = await getUserData();
    if (!userData) {
        document.getElementById('userBalance').textContent = "Error loading";
        return;
    }
    
    document.getElementById('userBalance').textContent = userData.balance.toFixed(4) + ' MON';
    debugLog("Balance display updated");
}

async function startCountdown() {
    clearInterval(countdownInterval);
    
    const userData = await getUserData();
    if (!userData) {
        document.getElementById('faucetTimer').textContent = "Error loading";
        return;
    }
    
    const now = Date.now();
    const timeSinceLastClaim = now - userData.lastClaim;
    
    if (timeSinceLastClaim >= config.claimInterval) {
        document.getElementById('faucetTimer').textContent = 'Ready to claim';
        debugLog("Countdown: Ready to claim");
        return;
    }
    
    const timeLeft = config.claimInterval - timeSinceLastClaim;
    updateTimerDisplay(timeLeft);
    
    countdownInterval = setInterval(async () => {
        const userData = await getUserData();
        if (!userData) {
            clearInterval(countdownInterval);
            return;
        }
        
        const remaining = userData.lastClaim + config.claimInterval - Date.now();
        
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            document.getElementById('faucetTimer').textContent = 'Ready to claim';
            debugLog("Countdown expired - ready to claim");
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
        debugLog("Claim process error:", error);
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
        debugLog("Claim error:", error);
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
        debugLog("Withdrawal error:", error);
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
    if (!userData || !userData.transactions) {
        activityFeed.innerHTML = '<p style="color: rgba(255,255,255,0.5);">Error loading history</p>';
        return;
    }
    
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
    debugLog(`UI Output [${type}]: ${message}`);
    const outputData = document.getElementById('outputData');
    if (!outputData) {
        debugLog("Output data element not found!");
        return;
    }
    
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