// Initialize verification state
let pendingVerificationAddress = '';
const CUTY_API_KEY = "0037252eb04b18f83ea817f4f";

document.addEventListener('DOMContentLoaded', async function() {
    // Check if returning from verification
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('verificationComplete')) {
        await handleVerificationReturn();
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check for pending verification
    checkPendingVerification();
    
    // Initialize UI for current address
    const address = document.getElementById('evmAddress').value.trim();
    if (address) updateButtonStates(address);
});

async function checkPendingVerification() {
    const pendingAddress = localStorage.getItem('pendingVerificationAddress');
    if (pendingAddress) {
        // Check if verification was completed
        const isVerified = await checkCutyVerification(pendingAddress);
        if (isVerified) {
            handleVerificationSuccess(pendingAddress);
        } else {
            document.getElementById('status').textContent = 'Verification not completed';
            document.getElementById('status').className = 'error';
        }
    }
}

async function checkCutyVerification(address) {
    try {
        // Get Cuty.io link stats for this address
        const response = await fetch(`https://api.cuty.io/analytics?token=${CUTY_API_KEY}&address=${encodeURIComponent(address)}`);
        
        if (response.ok) {
            const data = await response.json();
            // Check if there's at least 1 valid visit
            return data.validVisits > 0;
        }
        return false;
    } catch (error) {
        console.error('Error checking Cuty verification:', error);
        return false;
    }
}

async function handleVerificationReturn() {
    const pendingAddress = localStorage.getItem('pendingVerificationAddress');
    if (pendingAddress && /^0x[a-fA-F0-9]{40}$/.test(pendingAddress)) {
        const isVerified = await checkCutyVerification(pendingAddress);
        
        if (isVerified) {
            handleVerificationSuccess(pendingAddress);
        } else {
            document.getElementById('status').textContent = 'Verification failed - no valid visits recorded';
            document.getElementById('status').className = 'error';
        }
        
        // Clear pending verification
        localStorage.removeItem('pendingVerificationAddress');
    }
}

function handleVerificationSuccess(address) {
    // Mark address as verified
    const verifiedAddresses = JSON.parse(localStorage.getItem('verifiedAddresses')) || [];
    if (!verifiedAddresses.includes(address)) {
        verifiedAddresses.push(address);
        localStorage.setItem('verifiedAddresses', JSON.stringify(verifiedAddresses));
    }
    
    // Update UI
    document.getElementById('evmAddress').value = address;
    updateButtonStates(address);
    
    // Show success message
    document.getElementById('status').textContent = 'Verification successful!';
    document.getElementById('status').className = 'success';
}

// Rest of your existing functions (updateButtonStates, startVerification, processClaim) remain similar
// but update startVerification to include address in Cuty.io link metadata:

async function startVerification(address) {
    const statusElement = document.getElementById('status');
    const verifyBtn = document.getElementById('verifyBtn');
    
    verifyBtn.disabled = true;
    statusElement.textContent = 'Starting verification...';
    statusElement.className = 'processing';

    try {
        // Store the address we're verifying
        localStorage.setItem('pendingVerificationAddress', address);

        const RETURN_URL = `https://claimpx.netlify.app/?verificationComplete=true`;
        
        const response = await fetch('https://api.cuty.io/full', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: CUTY_API_KEY,
                url: RETURN_URL,
                title: `Verification for ${address}`,
                metadata: JSON.stringify({ evmAddress: address }) // Store address in link metadata
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