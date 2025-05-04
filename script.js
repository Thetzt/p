// Global state variables
let telegramUser = null;
let pendingVerificationAddress = '';
let verifiedAddresses = JSON.parse(localStorage.getItem('verifiedAddresses')) || [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    
    // If coming back from verification
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('verificationComplete')) {
        handleVerificationReturn();
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // If logged in, show claim section
    if (telegramUser) {
        showClaimSection();
    } else {
        // Initialize Telegram login widget
        initTelegramLogin();
    }
});

// Telegram login handler
function onTelegramAuth(user) {
    if (!user || !user.id) {
        showError("Telegram login failed. Please try again.");
        return;
    }
    
    // Store user data
    telegramUser = user;
    localStorage.setItem('telegramUser', JSON.stringify(user));
    
    // Show claim section
    showClaimSection();
}

function initTelegramLogin() {
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?19';
    script.setAttribute('data-telegram-login', 'uxxucc_bot');
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    document.body.appendChild(script);
}

function showClaimSection() {
    document.getElementById('telegramAuth').classList.add('hidden');
    document.getElementById('claimSection').classList.remove('hidden');
    
    // Check for pending verification
    checkPendingVerification();
}

function checkPendingVerification() {
    const pendingAddress = localStorage.getItem('pendingVerificationAddress');
    if (pendingAddress && !verifiedAddresses.includes(pendingAddress)) {
        // Verification was interrupted
        localStorage.removeItem('pendingVerificationAddress');
        showError("Previous verification was interrupted. Please verify again.");
    }
}

function handleVerificationReturn() {
    const pendingAddress = localStorage.getItem('pendingVerificationAddress');
    if (pendingAddress && /^0x[a-fA-F0-9]{40}$/.test(pendingAddress)) {
        // Mark address as verified
        if (!verifiedAddresses.includes(pendingAddress)) {
            verifiedAddresses.push(pendingAddress);
            localStorage.setItem('verifiedAddresses', JSON.stringify(verifiedAddresses));
        }
        
        // Update UI
        document.getElementById('evmAddress').value = pendingAddress;
        updateButtonStates(pendingAddress);
        localStorage.removeItem('pendingVerificationAddress');
        showSuccess("Verification successful!");
    }
}

function updateButtonStates(address) {
    const isVerified = verifiedAddresses.includes(address);
    document.getElementById('verifyBtn').style.display = isVerified ? 'none' : 'block';
    document.getElementById('verifySuccessBtn').style.display = isVerified ? 'block' : 'none';
}

// Event Listeners
document.getElementById('evmAddress').addEventListener('input', function() {
    const address = this.value.trim();
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
        updateButtonStates(address);
    } else {
        document.getElementById('verifyBtn').style.display = 'none';
        document.getElementById('verifySuccessBtn').style.display = 'none';
    }
});

document.getElementById('verifyBtn').addEventListener('click', function() {
    const address = document.getElementById('evmAddress').value.trim();
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        showError("Please enter a valid EVM address");
        return;
    }

    startVerification(address);
});

document.getElementById('claimBtn').addEventListener('click', function() {
    const address = document.getElementById('evmAddress').value.trim();
    
    if (!address) {
        showError("Please enter your EVM address");
        return;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        showError("Invalid EVM address format");
        return;
    }
    
    if (!verifiedAddresses.includes(address)) {
        showError("Please complete robot verification first");
        return;
    }

    processClaim(address);
});

// Core Functions
async function startVerification(address) {
    const verifyBtn = document.getElementById('verifyBtn');
    verifyBtn.disabled = true;
    showStatus("Preparing verification...", 'processing');

    try {
        localStorage.setItem('pendingVerificationAddress', address);
        pendingVerificationAddress = address;

        const API_TOKEN = "0037252eb04b18f83ea817f4f";
        const RETURN_URL = `${window.location.origin}${window.location.pathname}?verificationComplete=true`;
        
        const response = await fetch('https://api.cuty.io/full', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: API_TOKEN,
                url: RETURN_URL,
                title: 'Robot Verification for 0.1 MON Claim'
            })
        });

        if (!response.ok) throw new Error('Failed to create verification link');

        const data = await response.json();
        window.location.href = data.data.short_url;

    } catch (error) {
        showError(`Error: ${error.message}`);
        verifyBtn.disabled = false;
        localStorage.removeItem('pendingVerificationAddress');
    }
}

async function processClaim(address) {
    const claimBtn = document.getElementById('claimBtn');
    claimBtn.disabled = true;
    showStatus("Sending 0.1 MON...", 'processing');

    // Simulate blockchain transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    showSuccess(`Success! 0.1 MON sent to ${address}`);
    claimBtn.textContent = 'Claimed!';
    
    setTimeout(() => {
        claimBtn.disabled = false;
        claimBtn.textContent = 'Claim 0.1 MON';
        clearStatus();
    }, 5000);
}

// UI Helpers
function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = type;
}

function showError(message) {
    showStatus(message, 'error');
}

function showSuccess(message) {
    showStatus(message, 'success');
}

function clearStatus() {
    document.getElementById('status').textContent = '';
}