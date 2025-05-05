// Global state
let verifiedAddresses = JSON.parse(localStorage.getItem('verifiedAddresses')) || [];
let verificationExpiry = JSON.parse(localStorage.getItem('verificationExpiry')) || {};
let userRequests = JSON.parse(localStorage.getItem('userRequests')) || {};

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    // Only run on claim page
    if (!document.getElementById('requestButton')) return;
    
    // Check URL for verification completion
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('verificationComplete')) {
        handleVerificationReturn();
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Check for expired verifications
    checkVerificationExpiry();
});

function setupEventListeners() {
    // Address input handler
    document.getElementById('address').addEventListener('input', function() {
        const address = this.value.trim();
        updateButtonStates(address);
    });

    // Verify button handler
    document.getElementById('verifyBtn').addEventListener('click', verifyAddress);

    // Request button handler
    document.getElementById('requestButton').addEventListener('click', processRequest);
}

function updateButtonStates(address) {
    const isVerified = isAddressVerified(address);
    document.getElementById('verifyBtn').style.display = isVerified ? 'none' : 'block';
    document.getElementById('verifySuccessBtn').style.display = isVerified ? 'block' : 'none';
}

function isAddressVerified(address) {
    if (!verifiedAddresses.includes(address)) return false;
    
    // Check if verification is expired (2 minutes)
    const expiryTime = verificationExpiry[address] || 0;
    return Date.now() < expiryTime;
}

function handleVerificationReturn() {
    const pendingAddress = localStorage.getItem('pendingVerificationAddress');
    if (pendingAddress && /^0x[a-fA-F0-9]{40}$/.test(pendingAddress)) {
        // Mark address as verified with expiry
        verifiedAddresses.push(pendingAddress);
        verificationExpiry[pendingAddress] = Date.now() + 120000; // 2 minutes
        localStorage.setItem('verifiedAddresses', JSON.stringify(verifiedAddresses));
        localStorage.setItem('verificationExpiry', JSON.stringify(verificationExpiry));
        
        // Update UI
        document.getElementById('address').value = pendingAddress;
        updateButtonStates(pendingAddress);
        showOutput('Verification successful!', 'success');
        
        // Clear pending verification
        localStorage.removeItem('pendingVerificationAddress');
    }
}

function checkVerificationExpiry() {
    const now = Date.now();
    let needsUpdate = false;
    
    // Remove expired verifications
    verifiedAddresses = verifiedAddresses.filter(address => {
        const expiryTime = verificationExpiry[address] || 0;
        if (expiryTime < now) {
            delete verificationExpiry[address];
            needsUpdate = true;
            return false;
        }
        return true;
    });
    
    if (needsUpdate) {
        localStorage.setItem('verifiedAddresses', JSON.stringify(verifiedAddresses));
        localStorage.setItem('verificationExpiry', JSON.stringify(verificationExpiry));
    }
}

async function verifyAddress() {
    const address = document.getElementById('address').value.trim();
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        showOutput('Please enter a valid EVM address', 'error');
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
        showOutput(`Error: ${error.message}`, 'error');
        document.getElementById('verifyBtn').disabled = false;
        localStorage.removeItem('pendingVerificationAddress');
    }
}

async function processRequest() {
    const address = document.getElementById('address').value.trim();
    
    if (!address) {
        showOutput('Please enter your MON address', 'error');
        return;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        showOutput('Invalid MON address format', 'error');
        return;
    }
    
    if (!isAddressVerified(address)) {
        showOutput('Please complete robot verification first', 'error');
        document.getElementById('verifyBtn').style.display = 'block';
        document.getElementById('verifySuccessBtn').style.display = 'none';
        return;
    }

    // Check daily limit
    const today = new Date().toDateString();
    const userKey = address.toLowerCase();
    const userTodayRequests = userRequests[userKey] || { date: today, count: 0 };
    
    if (userTodayRequests.date !== today) {
        // Reset counter for new day
        userTodayRequests.date = today;
        userTodayRequests.count = 0;
    }
    
    if (userTodayRequests.count >= 2) {
        showOutput('Daily limit reached (2 requests per day)', 'error');
        return;
    }

    const requestBtn = document.getElementById('requestButton');
    requestBtn.disabled = true;
    showOutput('Processing your request...', 'info');

    // Simulate blockchain transaction (replace with real implementation)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update request count
    userTodayRequests.count++;
    userRequests[userKey] = userTodayRequests;
    localStorage.setItem('userRequests', JSON.stringify(userRequests));
    
    showOutput('Success! 0.1 MON sent to your address', 'success');
    requestBtn.textContent = 'Requested!';
    
    // Reset after 5 seconds
    setTimeout(() => {
        requestBtn.disabled = false;
        requestBtn.textContent = 'Request 0.1 MON';
    }, 5000);
}

function showOutput(message, type) {
    const outputData = document.getElementById('outputData');
    outputData.textContent = message;
    outputData.className = 'output-data';
    
    if (type === 'error') {
        outputData.classList.add('output-error');
    } else if (type === 'success') {
        outputData.classList.add('output-success');
    }
}