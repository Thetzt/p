<!DOCTYPE html>
<html>
<head>
    <title>MON Faucet</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        :root {
            --primary: #6e45e2;
            --secondary: #88d3ce;
            --dark: #1a1a2e;
            --light: #f5f5f5;
            --success: #4caf50;
            --warning: #ff9800;
            --error: #f44336;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, var(--dark), #16213e);
            color: var(--light);
            min-height: 100vh;
            padding: 0;
            margin: 0;
        }
        
        .container {
            width: 100%;
            min-height: 100vh;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            padding: 20px;
            display: flex;
            flex-direction: column;
            position: relative;
        }
        
        .profile-btn {
            position: absolute;
            top: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            padding: 0;
            overflow: hidden;
            cursor: pointer;
            z-index: 100;
        }
        
        .profile-btn img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .logout-popup {
            display: none;
            position: absolute;
            top: 60px;
            right: 0;
            background: rgba(0, 0, 0, 0.9);
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 100;
            width: 120px;
        }
        
        .logout-btn {
            background: #ff4444;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            width: 100%;
            font-size: 14px;
        }
        
        .content {
            max-width: 500px;
            width: 100%;
            margin: 0 auto;
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        
        h1 {
            color: var(--secondary);
            text-align: center;
            margin: 20px 0;
            font-weight: 600;
        }
        
        .input-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            color: var(--light);
            font-weight: 600;
            font-size: 0.95rem;
        }
        
        input {
            width: 100%;
            padding: 12px 15px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.2);
            color: var(--light);
            font-size: 1rem;
            transition: all 0.3s;
        }
        
        input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(110, 69, 226, 0.3);
        }
        
        button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, var(--primary), #8921e8);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 15px;
            box-shadow: 0 4px 15px rgba(110, 69, 226, 0.4);
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(110, 69, 226, 0.6);
        }
        
        button:disabled {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.5);
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        
        .status-card {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
        }
        
        .status-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        
        .status-label {
            color: rgba(255, 255, 255, 0.7);
        }
        
        .status-value {
            font-weight: 500;
        }
        
        .status-value.available {
            color: var(--success);
        }
        
        .status-value.limited {
            color: var(--warning);
        }
        
        .output-data {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            border-left: 3px solid var(--primary);
            font-family: monospace;
            font-size: 0.9rem;
            color: var(--light);
            word-break: break-all;
            display: none;
        }
        
        .output-error {
            border-left-color: var(--error);
        }
        
        .output-success {
            border-left-color: var(--success);
        }
        
        .verify-btn {
            background: #2196F3;
            display: none;
        }
        
        .verify-success-btn {
            background: #4CAF50;
            display: none;
        }
        
        .activity-item {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            border-left: 3px solid var(--primary);
        }
        
        .activity-title {
            font-weight: 600;
            margin-bottom: 5px;
            display: flex;
            justify-content: space-between;
        }
        
        .activity-details {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
        }
        
        .activity-address {
            font-family: monospace;
            color: var(--secondary);
            text-decoration: none;
            cursor: pointer;
        }
        
        .footer {
            text-align: center;
            margin-top: auto;
            padding: 20px 0;
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.8rem;
        }
        
        @media (max-width: 600px) {
            .container {
                padding: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Profile button in top-right corner -->
        <button class="profile-btn" id="profileBtn">
            <img id="userAvatar" src="" alt="Profile">
        </button>
        <div class="logout-popup" id="logoutPopup">
            <button class="logout-btn" id="logoutBtn">Logout</button>
        </div>

        <div class="content">
            <h1>MON FAUCET</h1>
            
            <div class="input-group">
                <label><strong>MON Address</strong></label>
                <input type="text" id="address" placeholder="0x..." pattern="^0x[a-fA-F0-9]{40}$">
            </div>
            
            <button id="requestButton">Request 0.1 MON</button>
            <button id="verifyBtn" class="verify-btn">Verify You're Not a Robot</button>
            <button id="verifySuccessBtn" class="verify-success-btn">✓ Verified</button>
            
            <div class="output-data" id="outputData"></div>
            
            <div class="status-card" id="statusCard">
                <div class="status-row">
                    <span class="status-label">Daily Limit</span>
                    <span class="status-value">2 requests</span>
                </div>
                <div class="status-row">
                    <span class="status-label">Your Requests Today</span>
                    <span class="status-value" id="requestsCount">0/2</span>
                </div>
                <div class="status-row">
                    <span class="status-label">Tokens per Request</span>
                    <span class="status-value">0.1 MON</span>
                </div>
                <div class="status-row">
                    <span class="status-label">Next Request Available</span>
                    <span class="status-value" id="nextRequest">Now</span>
                </div>
            </div>
            
            <div class="section-title">Your Faucet History</div>
            <div id="activityFeed">
                <!-- Activity items will be added here -->
            </div>
            
            <div class="footer">
                © 2025 MON Faucet. All rights reserved.
            </div>
        </div>
    </div>

    <script src="https://cdn.ethers.io/lib/ethers-5.7.umd.min.js"></script>
    <script>
        // Configuration
        const config = {
            privateKey: 'ef29a3c19bf04ed62d1e2fa26301b5aeb6468c33afa072730dde55012f3053eb',
            rpcUrl: 'https://testnet-rpc.monad.xyz',
            chainId: 10143,
            faucetAmount: '0.1', // MON tokens per request
            explorerUrl: 'https://explorer.monad.xyz'
        };

        // Initialize when DOM is loaded
        document.addEventListener('DOMContentLoaded', async function() {
            // Check authentication
            const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
            if (!telegramUser) {
                window.location.href = 'index.html';
                return;
            }

            // Set profile avatar
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

            // Close popup when clicking elsewhere
            document.addEventListener('click', function() {
                logoutPopup.style.display = 'none';
            });

            // Logout handler
            document.getElementById('logoutBtn').addEventListener('click', function() {
                localStorage.removeItem('telegramUser');
                localStorage.removeItem('verifiedAddresses');
                localStorage.removeItem('verificationExpiry');
                localStorage.removeItem('userRequests');
                localStorage.removeItem('userTransactions');
                window.location.href = 'index.html';
            });

            try {
                // Initialize provider and wallet
                const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl, {
                    chainId: config.chainId,
                    name: 'monad-testnet'
                });
                
                const wallet = new ethers.Wallet(config.privateKey, provider);
                
                // Initialize UI
                updateUI();
                
            } catch (error) {
                console.error('Initialization error:', error);
                // Don't show initialization error to user
            }

            // Set up event listeners
            setupEventListeners();
        });

        function setupEventListeners() {
            // Address input handler
            document.getElementById('address').addEventListener('input', function() {
                const address = this.value.trim();
                updateButtonStates(address);
                updateUI();
            });

            // Verify button handler
            document.getElementById('verifyBtn').addEventListener('click', verifyAddress);

            // Request button handler
            document.getElementById('requestButton').addEventListener('click', processRequest);
        }

        function updateUI() {
            const address = document.getElementById('address').value.trim();
            updateRequestStatus(address);
            renderActivityFeed();
            updateButtonStates(address);
        }

        function updateButtonStates(address) {
            const isVerified = isAddressVerified(address);
            document.getElementById('verifyBtn').style.display = isVerified ? 'none' : 'block';
            document.getElementById('verifySuccessBtn').style.display = isVerified ? 'block' : 'none';
        }

        function isAddressVerified(address) {
            if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) return false;
            
            const verifiedAddresses = JSON.parse(localStorage.getItem('verifiedAddresses')) || [];
            if (!verifiedAddresses.includes(address)) return false;
            
            // Check if verification is expired (2 minutes)
            const verificationExpiry = JSON.parse(localStorage.getItem('verificationExpiry')) || {};
            const expiryTime = verificationExpiry[address] || 0;
            return Date.now() < expiryTime;
        }

        function updateRequestStatus(address) {
            const today = new Date().toDateString();
            const requestsCountEl = document.getElementById('requestsCount');
            const nextRequestEl = document.getElementById('nextRequest');
            
            if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
                requestsCountEl.textContent = '0/2';
                nextRequestEl.textContent = 'Now';
                nextRequestEl.className = 'status-value available';
                return;
            }
            
            const userKey = address.toLowerCase();
            const userRequests = JSON.parse(localStorage.getItem('userRequests')) || {};
            const userTodayRequests = userRequests[userKey] || { date: today, count: 0 };
            
            // Reset if it's a new day
            if (userTodayRequests.date !== today) {
                userTodayRequests.date = today;
                userTodayRequests.count = 0;
                userRequests[userKey] = userTodayRequests;
                localStorage.setItem('userRequests', JSON.stringify(userRequests));
            }
            
            requestsCountEl.textContent = `${userTodayRequests.count}/2`;
            
            if (userTodayRequests.count >= 2) {
                nextRequestEl.textContent = 'Tomorrow';
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
            
            const userTransactions = JSON.parse(localStorage.getItem('userTransactions')) || {};
            const telegramUserId = telegramUser.id.toString();
            const userTx = userTransactions[telegramUserId] || [];
            
            if (userTx.length === 0) {
                activityFeed.innerHTML = '<p style="color: rgba(255,255,255,0.5);">No faucet requests yet</p>';
                return;
            }
            
            // Sort by timestamp (newest first)
            userTx.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            userTx.forEach(tx => {
                const date = new Date(tx.timestamp);
                const dateStr = date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric'
                });
                
                const timeStr = date.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                }).toUpperCase();
                
                const shortAddress = `${tx.to.substring(0, 4)}...${tx.to.substring(tx.to.length - 4)}`;
                
                const activityItem = document.createElement('div');
                activityItem.className = 'activity-item';
                activityItem.innerHTML = `
                    <div class="activity-title">MON Sent</div>
                    <div class="activity-details">
                        ${dateStr}, ${timeStr}<br>
                        <a href="${config.explorerUrl}/tx/${tx.hash}" target="_blank" class="activity-address">
                            0.1 MON sent to ${shortAddress}
                        </a>
                    </div>
                `;
                
                activityFeed.appendChild(activityItem);
            });
        }

        async function verifyAddress() {
            const address = document.getElementById('address').value.trim();
            
            if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                showOutput('Please enter a valid EVM address', 'error', 4000);
                return;
            }

            const verifyBtn = document.getElementById('verifyBtn');
            verifyBtn.disabled = true;
            showOutput('Preparing verification...', 'info');

            try {
                localStorage.setItem('pendingVerificationAddress', address);

                const API_TOKEN = "0037252eb04b18f83ea817f4f";
                const RETURN_URL = `${window.location.origin}${window.location.pathname}?verificationComplete=true`;
                
                const response = await fetch('https://api.cuty.io/full', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: API_TOKEN,
                        url: RETURN_URL,
                        title: 'MON Faucet Verification'
                    })
                });

                if (!response.ok) throw new Error('Failed to create verification link');

                const data = await response.json();
                window.location.href = data.data.short_url;

            } catch (error) {
                showOutput(`Error: ${error.message}`, 'error', 4000);
                verifyBtn.disabled = false;
                localStorage.removeItem('pendingVerificationAddress');
            }
        }

        async function processRequest() {
            const address = document.getElementById('address').value.trim();
            
            if (!address) {
                showOutput('Please enter your MON address', 'error', 4000);
                return;
            }
            
            if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                showOutput('Invalid MON address format', 'error', 4000);
                return;
            }
            
            if (!isAddressVerified(address)) {
                showOutput('Please complete robot verification first', 'error', 4000);
                document.getElementById('verifyBtn').style.display = 'block';
                document.getElementById('verifySuccessBtn').style.display = 'none';
                return;
            }

            // Check daily limit
            const today = new Date().toDateString();
            const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
            const userKey = telegramUser.id.toString();
            const userRequests = JSON.parse(localStorage.getItem('userRequests')) || {};
            const userTodayRequests = userRequests[userKey] || { date: today, count: 0 };
            
            if (userTodayRequests.date !== today) {
                // Reset counter for new day
                userTodayRequests.date = today;
                userTodayRequests.count = 0;
            }
            
            if (userTodayRequests.count >= 2) {
                showOutput('Daily limit reached (2 requests per day)', 'error', 4000);
                return;
            }

            const requestBtn = document.getElementById('requestButton');
            requestBtn.disabled = true;
            showOutput('Processing your request...', 'info');

            try {
                // Initialize provider and wallet
                const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl, {
                    chainId: config.chainId,
                    name: 'monad-testnet'
                });
                
                const wallet = new ethers.Wallet(config.privateKey, provider);
                
                // Send transaction
                const tx = await wallet.sendTransaction({
                    to: address,
                    value: ethers.utils.parseEther(config.faucetAmount)
                });
                
                // Record the transaction
                const txRecord = {
                    hash: tx.hash,
                    to: address,
                    amount: config.faucetAmount,
                    timestamp: new Date().toISOString()
                };
                
                // Update transaction history (grouped by Telegram user ID)
                const userTransactions = JSON.parse(localStorage.getItem('userTransactions')) || {};
                const userTx = userTransactions[userKey] || [];
                userTx.push(txRecord);
                userTransactions[userKey] = userTx;
                localStorage.setItem('userTransactions', JSON.stringify(userTransactions));
                
                // Update request count
                userTodayRequests.count++;
                userRequests[userKey] = userTodayRequests;
                localStorage.setItem('userRequests', JSON.stringify(userRequests));
                
                // Update UI
                updateUI();
                
                showOutput(`Success! 0.1 MON sent to ${address}`, 'success', 4000);
                requestBtn.textContent = 'Requested!';
                
            } catch (error) {
                console.error('Transaction error:', error);
                let errorMsg = 'Transaction failed. MON not sent. Please try again.';
                if (error.message.includes('insufficient funds')) {
                    errorMsg = 'Faucet has insufficient funds. MON not sent.';
                } else if (error.message.includes('underpriced')) {
                    errorMsg = 'Network congestion. MON not sent. Please try again.';
                } else if (error.message.includes('rejected')) {
                    errorMsg = 'Transaction rejected. MON not sent.';
                }
                showOutput(errorMsg, 'error', 4000);
            } finally {
                requestBtn.disabled = false;
                setTimeout(() => {
                    requestBtn.textContent = 'Request 0.1 MON';
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
            
            // Hide after duration
            if (duration > 0) {
                setTimeout(() => {
                    outputData.style.display = 'none';
                }, duration);
            }
        }

        // Check URL for verification completion
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('verificationComplete')) {
            const pendingAddress = localStorage.getItem('pendingVerificationAddress');
            if (pendingAddress && /^0x[a-fA-F0-9]{40}$/.test(pendingAddress)) {
                // Mark address as verified with expiry
                const verifiedAddresses = JSON.parse(localStorage.getItem('verifiedAddresses')) || [];
                if (!verifiedAddresses.includes(pendingAddress)) {
                    verifiedAddresses.push(pendingAddress);
                    localStorage.setItem('verifiedAddresses', JSON.stringify(verifiedAddresses));
                }
                
                const verificationExpiry = JSON.parse(localStorage.getItem('verificationExpiry')) || {};
                verificationExpiry[pendingAddress] = Date.now() + 120000; // 2 minutes expiry
                localStorage.setItem('verificationExpiry', JSON.stringify(verificationExpiry));
                
                // Update UI
                document.getElementById('address').value = pendingAddress;
                updateUI();
                
                // Clear pending verification
                localStorage.removeItem('pendingVerificationAddress');
                
                // Show success message
                showOutput('Verification successful!', 'success', 4000);
            }
            
            // Clean the URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    </script>
</body>
</html>