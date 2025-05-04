// Configuration
const CUTY_API_KEY = "0037252eb04b18f83ea817f4f364deae4c7d1a9f";
const RETURN_URL = "https://claimpx.netlify.app/?verificationComplete=true";

// State management
let pendingVerificationAddress = '';

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    // Check if returning from verification
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('verificationComplete')) {
        await handleVerificationReturn();
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Initialize UI for current address
    const address = document.getElementById('evmAddress').value.trim();
    if (address) updateButtonStates(address);
});

// Update button visibility based on verification status
function updateButtonStates(address) {
    const verifiedAddresses = JSON.parse(localStorage.getItem('verifiedAddresses')) || [];
    const isVerified = verifiedAddresses.includes(address);
    
    document.getElementById('verifyBtn').style.display = isVerified ? 'none' : 'block';
    document.getElementById('verifySuccessBtn').style.display = isVerified ? 'block' : 'none';
}

// Handle returning from Cuty.io verification
async function handleVerificationReturn() {
    const pendingAddress = localStorage.getItem('pendingVerificationAddress');
    if (!pendingAddress) return;
    
    try {
        const isVerified = await checkCutyVerification(pendingAddress);
        
        if (isVerified) {
            // Mark address as verified
            const verifiedAddresses = JSON.parse(localStorage.getItem('verifiedAddresses')) || [];
            if (!verifiedAddresses.includes(pendingAddress)) {
                verifiedAddresses.push(pendingAddress);
                localStorage.setItem('verifiedAddresses', JSON.stringify(verifiedAddresses));
            }
            
            // Update UI
            document.getElementById('evmAddress').value = pendingAddress;
            updateButtonStates(pendingAddress);
            
            // Show success message
            document.getElementById('status').textContent = 'Verification successful!';
            document.getElementById('status').className = 'success';
        } else {
            document.getElementById('status').textContent = 'Verification failed - no valid visits recorded';
            document.getElementById('status').className = 'error';
        }
    } finally {
        // Clear pending verification
        localStorage.removeItem('pendingVerificationAddress');
    }
}

// Check Cuty.io analytics for valid visits
async function checkCutyVerification(address) {
    try {
        // In a real implementation, you would call Cuty.io's analytics API
        // This is a simulation - replace with actual API call
        const response = await fetch(`https://api.cuty.io/analytics?token=${CUTY_API_KEY}&address=${encodeURIComponent(address)}`);
        
        if (response.ok) {
            const data = await response.json();
            return data.validVisits > 0; // Verification successful if at least 1 valid visit
        }
        return false;
    } catch (error) {
        console.error('Error checking verification:', error);
        return false;
    }
}

// Start verification process
async function startVerification(address) {
    const statusElement = document.getElementById('status');
    const verifyBtn = document.getElementById('verifyBtn');
    
    verifyBtn.disabled = true;
    statusElement.textContent = 'Starting verification...';
    statusElement.className = 'processing';

    try {
        // Store the address we're verifying
        localStorage.setItem('pendingVerificationAddress', address);

        const response = await fetch('https://api.cuty.io/full', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: CUTY_API_KEY,
                url: RETURN_URL,
                title: `Verification for ${address}`,
                metadata: JSON.stringify({ evmAddress: address })
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

// Process the final claim
async function processClaim(address) {
    const statusElement = document.getElementById('status');
    const claimBtn = document.getElementById('claimBtn');
    
    claimBtn.disabled = true;
    statusElement.textContent = 'Sending 0.1 MON...';
    statusElement.className = 'processing';

    // Simulate blockchain transaction
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

// Event listeners
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