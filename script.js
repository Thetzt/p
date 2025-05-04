// Store verification state
let verificationInProgress = false;
let pendingVerificationAddress = '';

document.addEventListener('DOMContentLoaded', function() {
    // Check localStorage for pending verification
    const pendingAddress = localStorage.getItem('pendingVerificationAddress');
    if (pendingAddress) {
        const verifiedAddresses = JSON.parse(localStorage.getItem('verifiedAddresses')) || [];
        if (!verifiedAddresses.includes(pendingAddress)) {
            // Verification was interrupted - reset
            localStorage.removeItem('pendingVerificationAddress');
        }
    }

    // Check if we're returning from Cuty.io
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('verificationComplete')) {
        handleVerificationReturn();
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

function handleVerificationReturn() {
    const pendingAddress = localStorage.getItem('pendingVerificationAddress');
    if (pendingAddress) {
        // Mark as verified
        const verifiedAddresses = JSON.parse(localStorage.getItem('verifiedAddresses')) || [];
        if (!verifiedAddresses.includes(pendingAddress)) {
            verifiedAddresses.push(pendingAddress);
            localStorage.setItem('verifiedAddresses', JSON.stringify(verifiedAddresses));
        }
        
        // Update UI
        document.getElementById('evmAddress').value = pendingAddress;
        updateButtonStates(pendingAddress);
        
        // Clear pending verification
        localStorage.removeItem('pendingVerificationAddress');
        
        // Show success message
        document.getElementById('status').textContent = 'Verification successful!';
        document.getElementById('status').className = 'success';
    }
}

function updateButtonStates(address) {
    const verifiedAddresses = JSON.parse(localStorage.getItem('verifiedAddresses')) || [];
    const isVerified = verifiedAddresses.includes(address);
    
    document.getElementById('verifyBtn').style.display = isVerified ? 'none' : 'block';
    document.getElementById('verifySuccessBtn').style.display = isVerified ? 'block' : 'none';
}

document.getElementById('evmAddress').addEventListener('input', function() {
    const address = this.value.trim();
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
        updateButtonStates(address);
    } else {
        document.getElementById('verifyBtn').style.display = 'block';
        document.getElementById('verifySuccessBtn').style.display = 'none';
    }
});

document.getElementById('verifyBtn').addEventListener('click', function() {
    const address = document.getElementById('evmAddress').value.trim();
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        document.getElementById('status').textContent = 'Please enter a valid EVM address';
        document.getElementById('status').className = 'error';
        return;
    }

    startVerification(address);
});

async function startVerification(address) {
    const statusElement = document.getElementById('status');
    const verifyBtn = document.getElementById('verifyBtn');
    
    verifyBtn.disabled = true;
    statusElement.textContent = 'Starting verification...';
    statusElement.className = 'processing';

    try {
        // Store the address we're verifying
        localStorage.setItem('pendingVerificationAddress', address);
        verificationInProgress = true;
        pendingVerificationAddress = address;

        const API_TOKEN = "0037252eb04b18f83ea817f4f";
        const RETURN_URL = `https://claimpx.netlify.app/?verificationComplete=true`;
        
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
        statusElement.textContent = `Error: ${error.message}`;
        statusElement.className = 'error';
        verifyBtn.disabled = false;
        localStorage.removeItem('pendingVerificationAddress');
        verificationInProgress = false;
    }
}

// Rest of your claim button handling remains the same