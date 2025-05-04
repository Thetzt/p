// Initialize verification state
let pendingVerificationAddress = '';

// Check verification status when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if returning from verification
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('verificationComplete')) {
        handleVerificationReturn();
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check for pending verification
    checkPendingVerification();
});

function checkPendingVerification() {
    const pendingAddress = localStorage.getItem('pendingVerificationAddress');
    if (pendingAddress) {
        // If we have a pending address but no verificationComplete flag,
        // it means verification was interrupted
        localStorage.removeItem('pendingVerificationAddress');
    }
}

function handleVerificationReturn() {
    const pendingAddress = localStorage.getItem('pendingVerificationAddress');
    if (pendingAddress && /^0x[a-fA-F0-9]{40}$/.test(pendingAddress)) {
        // Mark address as verified
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

// Address input handler
document.getElementById('evmAddress').addEventListener('input', function() {
    const address = this.value.trim();
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
        updateButtonStates(address);
    } else {
        document.getElementById('verifyBtn').style.display = 'block';
        document.getElementById('verifySuccessBtn').style.display = 'none';
    }
});

// Verify button handler
document.getElementById('verifyBtn').addEventListener('click', function() {
    const address = document.getElementById('evmAddress').value.trim();
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        document.getElementById('status').textContent = 'Please enter a valid EVM address';
        document.getElementById('status').className = 'error';
        return;
    }

    startVerification(address);
});

// Claim button handler
document.getElementById('claimBtn').addEventListener('click', function() {
    const address = document.getElementById('evmAddress').value.trim();
    const verifiedAddresses = JSON.parse(localStorage.getItem('verifiedAddresses')) || [];
    
    if (!address) {
        document.getElementById('status').textContent = 'Please enter your EVM address';
        document.getElementById('status').className = 'error';
        return;
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        document.getElementById('status').textContent = 'Invalid EVM address format';
        document.getElementById('status').className = 'error';
        return;
    }
    
    if (!verifiedAddresses.includes(address)) {
        document.getElementById('status').textContent = 'Please complete robot verification first';
        document.getElementById('status').className = 'error';
        return;
    }

    processClaim(address);
});

async function startVerification(address) {
    const statusElement = document.getElementById('status');
    const verifyBtn = document.getElementById('verifyBtn');
    
    verifyBtn.disabled = true;
    statusElement.textContent = 'Preparing verification...';
    statusElement.className = 'processing';

    try {
        // Store the address we're verifying
        localStorage.setItem('pendingVerificationAddress', address);
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
    }
}

async function processClaim(address) {
    const statusElement = document.getElementById('status');
    const claimBtn = document.getElementById('claimBtn');
    
    claimBtn.disabled = true;
    statusElement.textContent = 'Sending 0.1 MON...';
    statusElement.className = 'processing';

    // Simulate blockchain transaction (2 second delay)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    statusElement.textContent = `Success! 0.1 MON sent to ${address}`;
    statusElement.className = 'success';
    claimBtn.textContent = 'Claimed!';
    
    // Reset after 5 seconds
    setTimeout(() => {
        claimBtn.disabled = false;
        claimBtn.textContent = 'Claim 0.1 MON';
        statusElement.textContent = '';
    }, 5000);
}