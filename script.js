// Main Claim Page Functionality
if (document.getElementById('claimButton')) {
    document.getElementById('claimButton').addEventListener('click', handleClaim);
}

async function handleClaim() {
    const evmAddress = document.getElementById('evmAddress').value.trim();
    const statusElement = document.getElementById('status');
    const claimBtn = document.getElementById('claimButton');
    
    // Clear previous status
    statusElement.className = '';
    statusElement.textContent = '';
    
    // EVM address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(evmAddress)) {
        statusElement.textContent = 'Invalid EVM address format';
        statusElement.className = 'error';
        return;
    }

    // UI feedback
    claimBtn.disabled = true;
    claimBtn.textContent = 'Processing...';
    statusElement.textContent = 'Starting verification...';
    statusElement.className = 'processing';

    try {
        // Create verification link
        const API_TOKEN = "0037252eb04b18f83ea817f4f";
        const VERIFICATION_URL = `https://claimpx.netlify.app/verify.html?address=${encodeURIComponent(evmAddress)}`;
        
        const response = await fetch('https://api.cuty.io/full', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: API_TOKEN,
                url: VERIFICATION_URL,
                title: 'Robot Verification'
            })
        });

        if (!response.ok) throw new Error('Failed to create verification link');

        const data = await response.json();
        const verificationWindow = window.open(data.data.short_url, '_blank', 'width=500,height=600');

        // Check for verification completion
        const verificationCheck = setInterval(() => {
            if (localStorage.getItem('verifiedAddress') === evmAddress) {
                clearInterval(verificationCheck);
                completeClaim(evmAddress);
            }
        }, 1000);

    } catch (error) {
        statusElement.textContent = `Error: ${error.message}`;
        statusElement.className = 'error';
        claimBtn.disabled = false;
        claimBtn.textContent = 'Try Again';
    }
}

async function completeClaim(address) {
    const statusElement = document.getElementById('status');
    const claimBtn = document.getElementById('claimButton');
    
    statusElement.textContent = 'Verification complete! Sending 0.1 mon...';
    statusElement.className = 'processing';
    
    // Simulate blockchain transaction (replace with real API call)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    statusElement.textContent = 'Success! 0.1 mon sent to your address.';
    statusElement.className = 'success';
    claimBtn.textContent = 'Claimed!';
    
    // Clear verification status
    localStorage.removeItem('verifiedAddress');
}

// Listen for verification complete message from popup
window.addEventListener('message', (event) => {
    if (event.data.type === 'verificationComplete') {
        completeClaim(event.data.address);
    }
});