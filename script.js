// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDD0mTSuECptBeNzKpiaCDbbCJIoW9SiTg",
    authDomain: "claimpx.firebaseapp.com",
    projectId: "claimpx",
    storageBucket: "claimpx.appspot.com",
    messagingSenderId: "1012471480360",
    appId: "1:1012471480360:web:3b16bc6acc6adcf371b51d",
    measurementId: "G-NYK5SSMCF3"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

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
document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('claimButton')) return;
    
    // Check auth state
    auth.onAuthStateChanged(function(user) {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        // Get user data from Firestore
        db.collection("users").doc(user.uid).get().then(function(doc) {
            if (!doc.exists) {
                window.location.href = 'index.html';
                return;
            }
            
            const telegramUser = doc.data().telegramUser;
            
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
                auth.signOut().then(function() {
                    window.location.href = 'index.html';
                });
            });

            setupEventListeners();
            updateUI(user.uid);
            startCountdown(user.uid);
        });
    });
});

function setupEventListeners() {
    document.getElementById('claimButton').addEventListener('click', startClaimProcess);
    document.getElementById('withdrawButton').addEventListener('click', processWithdrawal);
    document.getElementById('withdrawAddress').addEventListener('input', function() {
        const user = auth.currentUser;
        if (user) updateUI(user.uid);
    });
}

function updateUI(userId) {
    updateBalanceDisplay(userId);
    updateFaucetTimer(userId);
    renderActivityFeed(userId);
}

function updateBalanceDisplay(userId) {
    db.collection("users").doc(userId).get().then(function(doc) {
        if (doc.exists) {
            const userData = doc.data();
            document.getElementById('userBalance').textContent = userData.balance.toFixed(4) + ' MON';
        }
    });
}

function startCountdown(userId) {
    clearInterval(countdownInterval);
    
    db.collection("users").doc(userId).get().then(function(doc) {
        if (!doc.exists) return;
        
        const userData = doc.data();
        const now = Date.now();
        const timeSinceLastClaim = now - (userData.lastClaim || 0);
        
        if (timeSinceLastClaim >= config.claimInterval) {
            document.getElementById('faucetTimer').textContent = '';
            return;
        }
        
        const timeLeft = config.claimInterval - timeSinceLastClaim;
        updateTimerDisplay(timeLeft);
        
        countdownInterval = setInterval(function() {
            db.collection("users").doc(userId).get().then(function(updatedDoc) {
                if (!updatedDoc.exists) return;
                
                const updatedData = updatedDoc.data();
                const remaining = updatedData.lastClaim + config.claimInterval - Date.now();
                
                if (remaining <= 0) {
                    clearInterval(countdownInterval);
                    document.getElementById('faucetTimer').textContent = '';
                    return;
                }
                
                updateTimerDisplay(remaining);
            });
        }, 1000);
    });
}

function updateTimerDisplay(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    document.getElementById('faucetTimer').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startClaimProcess() {
    const user = auth.currentUser;
    if (!user) return;
    
    db.collection("users").doc(user.uid).get().then(function(doc) {
        if (!doc.exists) return;
        
        const userData = doc.data();
        const now = Date.now();
        const timeSinceLastClaim = now - (userData.lastClaim || 0);
        
        if (timeSinceLastClaim < config.claimInterval) {
            showOutput(`Please wait ${formatTime(config.claimInterval - timeSinceLastClaim)} before claiming again`, 'error', 4000);
            return;
        }
        
        if (captchaVerified) {
            claimMON(user.uid);
            return;
        }
        
        document.getElementById('faucetCaptcha').style.display = 'block';
        grecaptcha.reset();
        showOutput('Please complete robot verification first', 'info');
    });
}

function claimMON(userId) {
    const claimBtn = document.getElementById('claimButton');
    claimBtn.disabled = true;
    
    const deviceFingerprint = generateDeviceFingerprint();
    
    db.collection("users").doc(userId).get().then(function(doc) {
        if (!doc.exists) return;
        
        const userData = doc.data();
        
        if (userData.lastDevice && userData.lastDevice !== deviceFingerprint) {
            showOutput('You can only claim from one device per account', 'error', 4000);
            claimBtn.disabled = false;
            return;
        }
        
        showOutput('Claiming MON...', 'info');
        
        // Get current balance first
        const currentBalance = userData.balance || 0;
        const newBalance = currentBalance + config.claimRate;
        
        // Update user data in Firestore
        db.collection("users").doc(userId).update({
            balance: newBalance,
            lastClaim: Date.now(),
            lastDevice: deviceFingerprint
        }).then(function() {
            // Record transaction
            db.collection("transactions").add({
                type: 'claim',
                amount: config.claimRate,
                timestamp: new Date().toISOString(),
                userId: userId
            }).then(function() {
                showOutput(`Success! Claimed ${config.claimRate} MON`, 'success', 4000);
                updateUI(userId); // Update UI immediately
                startCountdown(userId);
                claimBtn.disabled = false;
                captchaVerified = false;
            });
        }).catch(function(error) {
            console.error('Claim error:', error);
            showOutput('Failed to claim MON. Please try again.', 'error', 4000);
            claimBtn.disabled = false;
        });
    });
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
    
    const userDoc = await db.collection("users").doc(user.uid).get();
    if (!userDoc.exists) return;
    
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
        
        // Wait for transaction to be mined
        await tx.wait();
        
        // Record transaction
        await db.collection("transactions").add({
            type: 'withdraw',
            hash: tx.hash,
            to: address,
            amount: userData.balance,
            timestamp: new Date().toISOString(),
            userId: user.uid
        });
        
        // Update balance
        await db.collection("users").doc(user.uid).update({
            balance: 0
        });
        
        showOutput(`Success! ${userData.balance.toFixed(4)} MON sent to ${address}`, 'success', 4000);
        updateUI(user.uid); // Update UI immediately
        
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

function generateDeviceFingerprint() {
    const userAgent = navigator.userAgent;
    const screenWidth = screen.width;
    const screenHeight = screen.height;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    return `${userAgent}-${screenWidth}-${screenHeight}-${timezone}`;
}

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

function renderActivityFeed(userId) {
    const activityFeed = document.getElementById('activityFeed');
    activityFeed.innerHTML = '';
    
    db.collection("transactions")
        .where("userId", "==", userId)
        .orderBy("timestamp", "desc")
        .get()
        .then(function(querySnapshot) {
            if (querySnapshot.empty) {
                activityFeed.innerHTML = '<p style="color: rgba(255,255,255,0.5);">No faucet activity yet</p>';
                return;
            }
            
            querySnapshot.forEach(function(doc) {
                const tx = doc.data();
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