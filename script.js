// Global state
let verifiedAddresses = JSON.parse(localStorage.getItem('verifiedAddresses')) || [];
let verificationExpiry = JSON.parse(localStorage.getItem('verificationExpiry')) || {};
let userRequests = JSON.parse(localStorage.getItem('userRequests')) || {};
let userTransactions = JSON.parse(localStorage.getItem('userTransactions')) || {};



// Update the profile button click handler
profileBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    
    // Add bounce animation
    profileBtn.style.transform = 'scale(0.9)';
    setTimeout(() => {
        profileBtn.style.transform = 'scale(1.1)';
        setTimeout(() => {
            profileBtn.style.transform = 'scale(1)';
            logoutPopup.style.display = logoutPopup.style.display === 'block' ? 'none' : 'block';
        }, 100);
    }, 100);
});

// Add hover effect via JavaScript instead of CSS for better compatibility
profileBtn.addEventListener('mouseenter', () => {
    profileBtn.style.transform = 'scale(1.1)';
});

profileBtn.addEventListener('mouseleave', () => {
    if (logoutPopup.style.display !== 'block') {
        profileBtn.style.transform = 'scale(1)';
    }
});

// Configuration
const config = {
    privateKey: 'ef29a3c19bf04ed62d1e2fa26301b5aeb6468c33afa072730dde55012f3053eb',
    rpcUrl: 'https://testnet-rpc.monad.xyz',
    chainId: 10143,
    faucetAmount: '0.1',
    explorerUrl: 'https://testnet.monadexplorer.com'
};

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', async function() {
    if (!document.getElementById('requestButton')) return;
    
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

    // Profile handlers
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
        localStorage.removeItem('verifiedAddresses');
        localStorage.removeItem('verificationExpiry');
        localStorage.removeItem('userRequests');
        localStorage.removeItem('userTransactions');
        window.location.href = 'index.html';
    });

    // Check verification completion
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('verificationComplete')) {
        handleVerificationReturn();
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    updateUI();
    setupEventListeners();
});

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
    nextRequestEl.textContent = userTodayRequests.count >= 2 ? 'Tomorrow' : 'Now';
    nextRequestEl.className = userTodayRequests.count >= 2 ? 'status-value limited' : 'status-value available';
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
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        
        verificationExpiry[pendingAddress] = Date.now() + 120000;
        localStorage.setItem('verificationExpiry', JSON.stringify(verificationExpiry));
        
        document.getElementById('address').value = pendingAddress;
        updateUI();
        localStorage.removeItem('pendingVerificationAddress');
        showOutput('Verification successful!', 'success', 4000);
    }
}

async function verifyAddress() {
    const address = document.getElementById('address').value.trim();
    const verifyBtn = document.getElementById('verifyBtn');
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        showOutput('Please enter a valid EVM address', 'error', 4000);
        return;
    }

    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<span class="loader"></span> Verifying...';
    showOutput('Preparing verification...', 'info');

    try {
        localStorage.setItem('pendingVerificationAddress', address);
        const API_TOKEN = "0037252eb04b18f83ea817f4f";
        const RETURN_URL = `${window.location.origin}${window.location.pathname}?verificationComplete=true`;
        
        const response = await fetch('https://api.cuty.io/full', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                token: API_TOKEN,
                url: RETURN_URL,
                title: 'MON Faucet Verification'
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Verification service unavailable');
        }

        const data = await response.json();
        if (!data.data?.short_url) throw new Error('Invalid response from verification service');
        window.location.href = data.data.short_url;

    } catch (error) {
        console.error('Verification error:', error);
        let errorMessage = 'Verification failed. Please try again.';
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('Verification service unavailable')) {
            errorMessage = 'Verification service is currently unavailable. Please try again later.';
        }
        
        showOutput(`Error: ${errorMessage}`, 'error', 5000);
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify You\'re Not a Robot';
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
        const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl, {
            chainId: config.chainId,
            name: 'monad-testnet'
        });
        
        const wallet = new ethers.Wallet(config.privateKey, provider);
        const faucetBalance = await provider.getBalance(wallet.address);
        
        if (ethers.utils.formatEther(faucetBalance) < config.faucetAmount) {
            throw new Error('Faucet has insufficient funds');
        }
        
        const tx = await wallet.sendTransaction({
            to: address,
            value: ethers.utils.parseEther(config.faucetAmount)
        });
        
        const receipt = await tx.wait();
        
        // Record transaction
        const txRecord = {
            hash: tx.hash,
            to: address,
            amount: config.faucetAmount,
            timestamp: new Date().toISOString()
        };
        
        // Update transaction history
        const userTx = userTransactions[userKey] || [];
        userTx.push(txRecord);
        userTransactions[userKey] = userTx;
        localStorage.setItem('userTransactions', JSON.stringify(userTransactions));
        
        // Update request count
        userTodayRequests.count++;
        userRequests[userKey] = userTodayRequests;
        localStorage.setItem('userRequests', JSON.stringify(userRequests));
        
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
        
        if (error.transactionHash) {
            debugInfo = `\n\nTX Hash: ${error.transactionHash}\nExplore: ${config.explorerUrl}/tx/${error.transactionHash}`;
        } else if (error.receipt?.transactionHash) {
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
    
    if (duration > 0) {
        setTimeout(() => {
            outputData.style.display = 'none';
        }, duration);
    }
}