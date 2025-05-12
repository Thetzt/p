<!DOCTYPE html>
<html>
<head>
    <title>MON Faucet</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://www.google.com/recaptcha/api.js" async defer></script>
    <style>
        /* (Keep all your existing CSS styles the same) */
    </style>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
</head>
<body>
    <!-- (Keep all your existing HTML structure the same) -->

    <script src="https://cdn.ethers.io/lib/ethers-5.7.umd.min.js"></script>
    <script>
        if (typeof ethers === 'undefined') {
            document.write('<script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"><\/script>');
        }
    </script>
    <script>
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
        let unsubscribeUserListener;

        // Configuration
        const config = {
            privateKey: 'ef29a3c19bf04ed62d1e2fa26301b5aeb6468c33afa072730dde55012f3053eb',
            rpcUrl: 'https://testnet-rpc.monad.xyz',
            chainId: 10143,
            claimRate: 0.001, // MON per hour
            claimInterval: 60 * 60 * 1000, // 1 hour in ms
            minWithdraw: 0.01, // Minimum withdrawal amount
            captchaDuration: 5 * 60 * 1000, // 5 minutes for captcha
            explorerUrl: 'https://testnet.monadexplorer.com',
            referralBonus: 0.01 // MON per referral
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
                
                // Clear any existing intervals
                clearInterval(countdownInterval);
                
                // Setup real-time listener for user data
                setupRealtimeListener(user.uid);
                
                // Initial setup
                setupProfile(user.uid);
                setupInviteLink(user.uid);
                setupEventListeners();
                
                // Initial check of claim status
                checkClaimStatus(user.uid);
            });
        });











        function checkClaimStatus(userId) {
            db.collection("users").doc(userId).get().then(function(doc) {
                if (doc.exists) {
                    const userData = doc.data();
                    if (userData.lastClaim) {
                        const now = firebase.firestore.Timestamp.now();
                        const timeSinceLastClaim = now.toMillis() - userData.lastClaim.toMillis();
                        
                        if (timeSinceLastClaim < config.claimInterval) {
                            startCountdown(userId, userData.lastClaim.toMillis());
                        } else {
                            document.getElementById('faucetTimer').textContent = '';
                        }
                    }
                }
            });
        }

        function startClaimProcess() {
            const user = auth.currentUser;
            if (!user) {
                showOutput('Please login first', 'error', 4000);
                return;
            }

            // Immediately check claim status from Firestore
            db.collection("users").doc(user.uid).get().then(function(doc) {
                if (!doc.exists) {
                    showOutput('User data not found', 'error', 4000);
                    return;
                }

                const userData = doc.data();
                const now = firebase.firestore.Timestamp.now();
                const lastClaim = userData.lastClaim || firebase.firestore.Timestamp.fromMillis(0);
                const timeSinceLastClaim = now.toMillis() - lastClaim.toMillis();

                // Check if 1 hour has passed since last claim
                if (timeSinceLastClaim < config.claimInterval) {
                    const remainingTime = config.claimInterval - timeSinceLastClaim;
                    showOutput(`Please wait ${formatTime(remainingTime)} before claiming again`, 'error', 4000);
                    startCountdown(user.uid, lastClaim.toMillis());
                    return;
                }

                // If captcha is not verified, show it
                if (!captchaVerified) {
                    document.getElementById('faucetCaptcha').style.display = 'block';
                    grecaptcha.reset();
                    showOutput('Please complete robot verification first', 'info');
                    return;
                }

                // If all checks pass, proceed with claim
                claimMON(user.uid);
            }).catch(function(error) {
                console.error('Error checking claim status:', error);
                showOutput('Failed to check claim status. Please try again.', 'error', 4000);
            });
        }

        function claimMON(userId) {
            const claimBtn = document.getElementById('claimButton');
            claimBtn.disabled = true;
            claimBtn.classList.add('button-loading');
            claimBtn.textContent = 'Claiming...';
            
            const deviceFingerprint = generateDeviceFingerprint();
            
            db.runTransaction(function(transaction) {
                return transaction.get(db.collection("users").doc(userId)).then(function(doc) {
                    if (!doc.exists) throw "Document does not exist!";
                    
                    const userData = doc.data();
                    const now = firebase.firestore.Timestamp.now();
                    const lastClaim = userData.lastClaim || firebase.firestore.Timestamp.fromMillis(0);
                    const timeSinceLastClaim = now.toMillis() - lastClaim.toMillis();
                    
                    // Final verification before claiming
                    if (timeSinceLastClaim < config.claimInterval) {
                        throw `Please wait ${formatTime(config.claimInterval - timeSinceLastClaim)} before claiming again`;
                    }
                    
                    // Check device fingerprint
                    if (userData.lastDevice && userData.lastDevice !== deviceFingerprint) {
                        throw "You can only claim from one device per account";
                    }
                    
                    // Calculate new balance
                    const newBalance = (userData.balance || 0) + config.claimRate;
                    
                    // Update user data
                    transaction.update(db.collection("users").doc(userId), {
                        balance: newBalance,
                        lastClaim: now,
                        lastDevice: deviceFingerprint
                    });
                    
                    return now;
                });
            }).then(function(lastClaimTime) {
                showOutput(`Success! Claimed ${config.claimRate} MON`, 'success', 4000);
                resetClaimButton(claimBtn);
                captchaVerified = false;
                
                // Start countdown with the new lastClaim time
                startCountdown(userId, lastClaimTime.toMillis());
            }).catch(function(error) {
                console.error('Claim failed: ', error);
                showOutput(typeof error === 'string' ? error : 'Failed to claim MON. Please try again.', 'error', 4000);
                resetClaimButton(claimBtn);
            });
        }

        function startCountdown(userId, lastClaimMillis) {
            clearInterval(countdownInterval);
            
            const updateCountdown = () => {
                const now = Date.now();
                const remaining = lastClaimMillis + config.claimInterval - now;
                
                if (remaining <= 0) {
                    clearInterval(countdownInterval);
                    document.getElementById('faucetTimer').textContent = '';
                    return;
                }
                
                updateTimerDisplay(remaining);
            };
            
            // Initial update
            updateCountdown();
            
            // Set interval for continuous updates
            countdownInterval = setInterval(updateCountdown, 1000);
        }

        // (Keep all other existing functions the same)
    </script>
    <script type='text/javascript' src='//pl26588542.profitableratecpm.com/16/0f/6b/160f6bfa3fd6a89824e441d2914b127c.js'></script>
</body>
</html>