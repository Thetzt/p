// Global state
let verifiedAddresses = JSON.parse(localStorage.getItem('verifiedAddresses')) || [];
let verificationExpiry = JSON.parse(localStorage.getItem('verificationExpiry')) || {};
let userRequests = JSON.parse(localStorage.getItem('userRequests')) || {};
let userTransactions = JSON.parse(localStorage.getItem('userTransactions')) || {};

// Configuration
const config = {
    privateKey: 'ef29a3c19bf04ed62d1e2fa26301b5aeb6468c33afa072730dde55012f3053eb',
    rpcUrl: 'https://testnet-rpc.monad.xyz',
    chainId: 10143,
    faucetAmount: '0.1', // MON tokens per request
    explorerUrl: 'https://testnet.monadexplorer.com'
};

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', async function() {
    // Only run on claim page
    if (!document.getElementById('requestButton')) return;
    
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

    // Check URL for verification completion
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('verificationComplete')) {
        handleVerificationReturn();
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Initialize UI
    updateUI();
    
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
    
    if (!verifiedAddresses.includes(address)) return false;
    
    // Check if verification is expired (2 minutes)
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
    
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    const userKey = telegramUser.id.toString();
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

function handleVerificationReturn() {
    const pendingAddress = localStorage.getItem('pendingVerificationAddress');
    if (pendingAddress && /^0x[a-fA-F0-9]{40}$/.test(pendingAddress)) {
        // Mark address as verified with expiry
        if (!verifiedAddresses.includes(pendingAddress)) {
            verifiedAddresses.push(pendingAddress);
            localStorage.setItem('verifiedAddresses', JSON.stringify(verifiedAddresses));
        }
        
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
        
        // Check faucet balance first
        const faucetBalance = await provider.getBalance(wallet.address);
        if (ethers.utils.formatEther(faucetBalance) < config.faucetAmount) {
            throw new Error('Faucet has insufficient funds');
        }
        
        // Send transaction
        const tx = await wallet.sendTransaction({
            to: address,
            value: ethers.utils.parseEther(config.faucetAmount)
        });
        
        console.log('Transaction submitted:', tx.hash);
        
        // Wait for transaction to be mined
        const receipt = await tx.wait();
        console.log('Transaction mined:', receipt.transactionHash);
        
        // Record the transaction
        const txRecord = {
            hash: tx.hash,
            to: address,
            amount: config.faucetAmount,
            timestamp: new Date().toISOString()
        };
        
        // Update transaction history (grouped by Telegram user ID)
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
        let debugInfo = '';
        
        if (error.message.includes('insufficient funds')) {
            errorMsg = 'Faucet has insufficient funds. MON not sent.';
        } else if (error.message.includes('underpriced')) {
            errorMsg = 'Network congestion. MON not sent. Please try again.';
        } else if (error.message.includes('rejected')) {
            errorMsg = 'Transaction rejected. MON not sent.';
        }
        
        // Add debug info for transaction errors
        if (error.transactionHash) {
            debugInfo = `\n\nTX Hash: ${error.transactionHash}\nExplore: ${config.explorerUrl}/tx/${error.transactionHash}`;
        } else if (error.receipt && error.receipt.transactionHash) {
            debugInfo = `\n\nTX Hash: ${error.receipt.transactionHash}\nExplore: ${config.explorerUrl}/tx/${error.receipt.transactionHash}`;
        }
        
        showOutput(`${errorMsg}${debugInfo}`, 'error', 6000);
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