<!-- Previous HTML/CSS remains exactly the same until the script section -->
<script>
    // ... (keep all previous Firebase initialization and config)

    // Modified claimMON function with strict cooldown enforcement
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
                
                // Strict cooldown enforcement - won't update lastClaim if cooldown active
                if (userData.lastClaim) {
                    const timeSinceLastClaim = now.toMillis() - userData.lastClaim.toMillis();
                    if (timeSinceLastClaim < config.claimInterval) {
                        throw `Please wait ${formatTime(config.claimInterval - timeSinceLastClaim)} before claiming again`;
                    }
                }
                
                // Calculate new balance
                const newBalance = (userData.balance || 0) + config.claimRate;
                
                // Only update lastClaim if cooldown has passed
                const updates = {
                    balance: newBalance,
                    lastDevice: deviceFingerprint
                };
                
                if (!userData.lastClaim || 
                    (now.toMillis() - userData.lastClaim.toMillis()) >= config.claimInterval) {
                    updates.lastClaim = now;
                }
                
                transaction.update(db.collection("users").doc(userId), updates);
                
                return { 
                    newBalance: newBalance,
                    shouldUpdateLastClaim: !!updates.lastClaim
                };
            });
        }).then(function(result) {
            showOutput(`Success! Claimed ${config.claimRate} MON`, 'success', 4000);
            resetClaimButton(claimBtn);
            captchaVerified = false;
            
            // Only start countdown if we actually updated lastClaim
            if (result.shouldUpdateLastClaim) {
                startCountdown(userId, firebase.firestore.Timestamp.now().toMillis());
            }
        }).catch(function(error) {
            console.error('Claim failed: ', error);
            showOutput(typeof error === 'string' ? error : 'Failed to claim MON. Please try again.', 'error', 4000);
            resetClaimButton(claimBtn);
        });
    }

    // Enhanced checkClaimStatus function
    function checkClaimStatus(userId) {
        db.collection("users").doc(userId).get().then(function(doc) {
            if (doc.exists) {
                const userData = doc.data();
                if (userData.lastClaim) {
                    const now = firebase.firestore.Timestamp.now();
                    const timeSinceLastClaim = now.toMillis() - userData.lastClaim.toMillis();
                    
                    if (timeSinceLastClaim < config.claimInterval) {
                        startCountdown(userId, userData.lastClaim.toMillis());
                        // Disable claim button if cooldown active
                        document.getElementById('claimButton').disabled = true;
                    } else {
                        document.getElementById('faucetTimer').textContent = '';
                        document.getElementById('claimButton').disabled = false;
                    }
                }
            }
        });
    }

    // Modified startClaimProcess with additional checks
    function startClaimProcess() {
        const user = auth.currentUser;
        if (!user) return;
        
        const claimBtn = document.getElementById('claimButton');
        claimBtn.disabled = true;
        
        db.collection("users").doc(user.uid).get().then(function(doc) {
            if (!doc.exists) {
                claimBtn.disabled = false;
                return;
            }
            
            const userData = doc.data();
            const now = firebase.firestore.Timestamp.now();
            
            // Additional check to prevent UI flickering
            if (userData.lastClaim) {
                const timeSinceLastClaim = now.toMillis() - userData.lastClaim.toMillis();
                if (timeSinceLastClaim < config.claimInterval) {
                    showOutput(`Please wait ${formatTime(config.claimInterval - timeSinceLastClaim)} before claiming again`, 'error', 4000);
                    claimBtn.disabled = true;
                    return;
                }
            }
            
            claimBtn.disabled = false;
            
            if (captchaVerified) {
                claimMON(user.uid);
                return;
            }
            
            document.getElementById('faucetCaptcha').style.display = 'block';
            grecaptcha.reset();
            showOutput('Please complete robot verification first', 'info');
        });
    }

    // ... (rest of your existing functions remain the same)
</script>