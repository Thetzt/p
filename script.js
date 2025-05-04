// Global state
let verifiedAddresses = JSON.parse(localStorage.getItem('verifiedAddresses')) || [];

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    // Only run on claim page
    if (!document.getElementById('claimBtn')) return;
    
    // Check URL for verification completion
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('verificationComplete')) {
        handleVerificationReturn();
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Set up event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Address input handler
    document.getElementById('evmAddress').addEventListener('input', function() {
        const address = this.value.trim();
        updateButtonStates(address);
    });

    // Verify button handler
    document.getElementById('verifyBtn').addEventListener('click', verifyAddress);

    // Claim button handler
    document.getElementById('claimBtn').addEventListener('click', processClaim);
}

function updateButtonStates(address) {
    const isVerified = verifiedAddresses.includes(address);
    document.getElementById('verifyBtn').style.display = isVerified ? 'none' : 'block';
    document.getElementById('verifySuccessBtn').style.display = isVerified ? 'block' : 'none';
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
        showStatus('Verification successful!', 'success');
        
        // Clear pending verification
        localStorage.removeItem('pendingVerificationAddress');
    }
}

async function verifyAddress() {
    const address = document.getElementById('evmAddress').value.trim();
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        showStatus('Please enter a valid EVM address', 'error');
        return;
    }

    const verifyBtn = document.getElementById('verifyBtn');
    verifyBtn.disabled = true;
    showStatus('Preparing verification...', 'processing');

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
                title: 'MON Claim Verification'
            })
        });

        if (!response.ok) throw new Error('Failed to create verification link');

        const data = await response.json();
        window.location.href = data.data.short_url;

    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
        document.getElementById('verifyBtn').disabled = false;
        localStorage.removeItem('pendingVerificationAddress');
    }
}

async function processClaim() {
    const address = document.getElementById('evmAddress').value.trim();
    
    if (!address) {
        showStatus('Please enter your EVM address', 'error');
        return;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        showStatus('Invalid EVM address format', 'error');
        return;
    }
    
    if (!verifiedAddresses.includes(address)) {
        showStatus('Please complete verification first', 'error');
        return;
    }

    const claimBtn = document.getElementById('claimBtn');
    claimBtn.disabled = true;
    showStatus('Processing your claim...', 'processing');

    // Simulate blockchain transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    showStatus(`Success! 0.1 MON sent to ${address}`, 'success');
    claimBtn.textContent = 'Claimed!';
    
    // Reset after 5 seconds
    setTimeout(() => {
        claimBtn.disabled = false;
        claimBtn.textContent = 'Claim 0.1 MON';
        clearStatus();
    }, 5000);
}

function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = type;
}

function clearStatus() {
    document.getElementById('