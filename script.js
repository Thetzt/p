// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getAuth, 
    signInWithCustomToken,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDD0mTSuECptBeNzKpiaCDbbCJIoW9SiTg",
    authDomain: "claimpx.firebaseapp.com",
    projectId: "claimpx",
    storageBucket: "claimpx.appspot.com",
    messagingSenderId: "1012471480360",
    appId: "1:1012471480360:web:3b16bc6acc6adcf371b51d",
    measurementId: "G-NYK5SSMCF3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Global state
let countdownInterval;
let captchaVerified = false;

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
    
    // Check auth state
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
            window.location.href = 'index.html';
            return;
        }
        
        const telegramUser = userDoc.data().telegramUser;
        
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
            signOut(auth);
            window.location.href = 'index.html';
        });

        setupEventListeners();
        updateUI(user.uid);
        startCountdown(user.uid);
    });
});

function setupEventListeners() {
    document.getElementById('claimButton').addEventListener('click', startClaimProcess);
    document.getElementById('withdrawButton').addEventListener('click', processWithdrawal);
    document.getElementById('withdrawAddress').addEventListener('input', updateUI);
}

async function updateUI(userId) {
    await updateBalanceDisplay(userId);
    await updateFaucetTimer(userId);
    await renderActivityFeed(userId);
}

async function updateBalanceDisplay(userId) {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
        const userData = userDoc.data();
        document.getElementById('userBalance').textContent = userData.balance.toFixed(4) + ' MON';
    }
}

async function startCountdown(userId) {
    clearInterval(countdownInterval);
    
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return;
    
    const userData = userDoc.data();
    const now = Date.now();
    const timeSinceLastClaim = now - (userData.lastClaim || 0);
    
    // If it's been more than claim interval, show empty timer
    if (timeSinceLastClaim >= config.claimInterval) {
        document.getElementById('faucetTimer').textContent = '';
        return;
    }
    
    // Otherwise start countdown
    const timeLeft = config.claimInterval - timeSinceLastClaim;
    updateTimerDisplay(timeLeft);
    
    countdownInterval = setInterval(async () => {
        const updatedDoc = await getDoc(doc(db, "users", userId));
        if (!updatedDoc.exists()) return;
        
        const updatedData = updatedDoc.data();
        const remaining = updatedData.lastClaim + config.claimInterval - Date.now();
        
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
    const user = auth.currentUser;
    if (!user) return;
    
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) return;
    
    const userData = userDoc.data();
    const now = Date.now();
    const timeSinceLastClaim = now - (userData.lastClaim || 0);
    
    if (timeSinceLastClaim < config.claimInterval) {
        showOutput(`Please wait ${formatTime(config.claimInterval - timeSinceLastClaim)} before claiming again`, 'error', 4000);
        return;
    }
    
    // Check if already verified
    if (captchaVerified) {
        claimMON(user.uid);
        return;
    }
    
    // Show reCAPTCHA
    document.getElementById('faucetCaptcha').style.display = 'block';
    grecaptcha.reset();
    showOutput('Please complete robot verification first', 'info');
}

async function claimMON(userId) {
    const claimBtn = document.getElementById('claimButton');
    claimBtn.disabled = true;
    
    // Generate device fingerprint
    const deviceFingerprint = generateDeviceFingerprint();
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return;
    
    const userData = userDoc.data();
    
    // Check if this is a different device
    if (userData.lastDevice && userData.lastDevice !== deviceFingerprint) {
        showOutput('You can only claim from one device per account', 'error', 4000);
        claimBtn.disabled = false;
        return;
    }
    
    showOutput('Claiming MON...', 'info');
    
    try {
        // Update user data in Firestore
        const newBalance = (userData.balance || 0) + config.claimRate;
        await updateDoc(doc(db, "users", userId), {
            balance: newBalance,
            lastClaim: Date.now(),
            lastDevice: deviceFingerprint
        });
        
        // Record transaction
        await addDoc(collection(db, "transactions"), {
            type: 'claim',
            amount: config.claimRate,
            timestamp: new Date().toISOString(),
            userId: userId
        });
        
        showOutput(`Success! Claimed ${config.claimRate} MON`, 'success', 4000);
        updateUI(userId);
        startCountdown(userId);
    } catch (error) {
        console.error('Claim error:', error);
        showOutput('Failed to claim MON. Please try again.', 'error', 4000);
    } finally {
        claimBtn.disabled = false;
        captchaVerified = false;
    }
}

function generateDeviceFingerprint() {
    // Simple device fingerprint based on browser and screen properties
    const userAgent = navigator.userAgent;
    const screenWidth = screen.width;
    const screenHeight = screen.height;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    return `${userAgent}-${screenWidth}-${screenHeight}-${timezone}`;
}

async function processWithdrawal() {
    const address = document.getElementById('withdrawAddress').value.trim();
    const user = auth.currentUser;
    
    if (!user) {
        showOutput('Please login with Telegram first', 'error', 4000);
        return;
    }
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        showOutput('Invalid MON address format', 'error', 4000);
        return;
    }
    
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) return;
    
    const userData = userDoc.data();
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
        await addDoc(collection(db, "transactions"), {
            type: 'withdraw',
            hash: tx.hash,
            to: address,
            amount: userData.balance,
            timestamp: new Date().toISOString(),
            userId: user.uid
        });
        
        // Update balance
        await updateDoc(doc(db, "users", user.uid), {
            balance: 0
        });
        
        updateUI(user.uid);
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

async function renderActivityFeed(userId) {
    const activityFeed = document.getElementById('activityFeed');
    activityFeed.innerHTML = '';
    
    const q = query(collection(db, "transactions"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        activityFeed.innerHTML = '<p style="color: rgba(255,255,255,0.5);">No faucet activity yet</p>';
        return;
    }
    
    const transactions = [];
    querySnapshot.forEach(doc => {
        transactions.push({ id: doc.id, ...doc.data() });
    });
    
    transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    transactions.forEach(tx => {
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