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
    faucetAmount: '0.1',
    explorerUrl: 'https://testnet.monadexplorer.com',
    verificationExpiryTime: 120000 // 2 minutes in ms
};

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', async function() {
    if (!document.getElementById('requestButton')) return;
    
    // Check authentication
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    if (!telegramUser) {
        window.location.href = 'index.html';
        return;
    }

    // Set up profile
    setupProfile(telegramUser);

    // Check URL for verification completion
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('verificationComplete')) {
        handleVerificationReturn();
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Initialize UI
    updateUI();
    setupEventListeners();
});

function setupProfile(telegramUser) {
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
}

function setupEventListeners() {
    document.getElementById('address').addEventListener('input', function() {
        const address = this.value.trim();
        updateButtonStates(address);
        updateUI();
    });

    document.getElementById('verifyBtn').addEventListener('click', verifyAddress);
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
        if (!verifiedAddresses.includes(pendingAddress)) {
            verifiedAddresses.push(pendingAddress);
            localStorage.setItem('verifiedAddresses', JSON.stringify(verifiedAddresses));
        }
        
        verificationExpiry[pendingAddress] = Date.now() + config.verificationExpiryTime;
        localStorage.setItem('verificationExpiry', JSON.stringify(verificationExpiry));
        
        document.getElementById('address').value = pendingAddress;
        updateUI();
        
        localStorage.removeItem('pendingVerificationAddress');
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
    
    // Validation checks
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

    // Daily limit check
    const today = new Date().toDateString();
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    const userKey = telegramUser.id.toString();
    const userTodayRequests = userRequests[userKey] || { date: today, count: 0 };
    
    if (userTodayRequests.date !== today) {
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
        // Initialize blockchain connection
        const { provider, wallet } = await initBlockchainConnection();
        
        // Check balance and send transaction
        const { tx, receipt } = await sendTransaction(provider, wallet, address);
        
        // Record successful transaction
        recordTransaction(userKey, address, tx.hash, receipt.status);
        
        // Update request count
        if (receipt.status === 1) {
            userTodayRequests.count++;
            userRequests[userKey] = userTodayRequests;
            localStorage.setItem('userRequests', JSON.stringify(userRequests));
        }
        
        // Update UI and show success
        updateUI();
        showSuccessMessage(address, tx.hash, requestBtn);

    } catch (error) {
        handleTransactionError(error, requestBtn);
    } finally {
        resetRequestButton(requestBtn);
    }
}

async function initBlockchainConnection() {
    try {
        const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl, {
            chainId: config.chainId,
            name: 'monad-testnet'
        });
        const wallet = new ethers.Wallet(config.privateKey, provider);
        return { provider, wallet };
    } catch (error) {
        console.error('Blockchain connection error:', error);
        throw new Error('Failed to connect to blockchain network');
    }
}

async function sendTransaction(provider, wallet, address) {
    // Check faucet balance
    const faucetBalance = await provider.getBalance(wallet.address);
    const formattedBalance = ethers.utils.formatEther(faucetBalance);
    
    if (parseFloat(formattedBalance) < parseFloat(config.faucetAmount)) {
        throw new Error(`Faucet has insufficient funds (${formattedBalance} MON available)`);
    }

    // Prepare transaction
    const txParams = {
        to: address,
        value: ethers.utils.parseEther(config.faucetAmount),
        gasLimit: 21000,
        gasPrice: await provider.getGasPrice()
    };

    // Send and wait for transaction
    const tx = await wallet.sendTransaction(txParams);
    showOutput(`Transaction submitted: ${tx.hash}\nWaiting for confirmation...`, 'info', 8000);
    
    const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Transaction timeout after 60 seconds')), 60000)
    ]);
    
    if (receipt.status === 0) {
        throw new Error('Transaction failed (status 0)');
    }

    return { tx, receipt };
}

function recordTransaction(userKey, address, txHash, status) {
    const txRecord = {
        hash: txHash,
        to: address,
        amount: config.faucetAmount,
        timestamp: new Date().toISOString(),
        status: status === 1 ? 'success' : 'failed'
    };
    
    const userTx = userTransactions[userKey] || [];
    userTx.push(txRecord);
    userTransactions[userKey] = userTx;
    localStorage.setItem('userTransactions', JSON.stringify(userTransactions));
}

function showSuccessMessage(address, txHash, requestBtn) {
    const successMsg = `Success! 0.1 MON sent to ${address}\n\nTX Hash: ${txHash}\nExplore: ${config.explorerUrl}/tx/${txHash}`;
    showOutput(successMsg, 'success', 8000);
    requestBtn.textContent = 'Requested!';
}

function handleTransactionError(error, requestBtn) {
    console.error('Transaction error:', error);
    let errorMsg = 'Transaction failed. MON not sent. Please try again.';
    
    if (error.message.includes('insufficient funds')) {
        errorMsg = 'Faucet has insufficient funds. MON not sent.';
    } else if (error.message.includes('underpriced')) {
        errorMsg = 'Network congestion. MON not sent. Please try again.';
    } else if (error.message.includes('rejected')) {
        errorMsg = 'Transaction rejected. MON not sent.';
    } else if (error.message.includes('timeout')) {
        errorMsg = 'Transaction taking too long. Check later.';
    }
    
    if (error.transactionHash) {
        errorMsg += `\n\nTX Hash: ${error.transactionHash}\nExplore: ${config.explorerUrl}/tx/${error.transactionHash}`;
    }
    
    showOutput(errorMsg, 'error', 8000);
}

function resetRequestButton(requestBtn) {
    requestBtn.disabled = false;
    setTimeout(() => {
        requestBtn.textContent = 'Request 0.1 MON';
    }, 4000);
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