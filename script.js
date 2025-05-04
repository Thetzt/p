// Global state
let isVerified = false;
let currentAddress = '';

document.getElementById('verifyBtn').addEventListener('click', startVerification);
document.getElementById('claimBtn').addEventListener('click', processClaim);

async function startVerification() {
    const address = document.getElementById('evmAddress').value.trim();
    const statusElement = document.getElementById('status');
    const verifyBtn = document.getElementById('verifyBtn');
    
    // Validate address
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        statusElement.textContent = 'Invalid EVM address format';
        statusElement.className = 'error';
        return;
    }

    currentAddress = address;
    verifyBtn.disabled = true;
    statusElement.textContent = 'Preparing verification...';
    statusElement.className = 'processing';

    try {
        // Create Cuty.io verification link
        const API_TOKEN = "0037252eb04b18f83ea817f4f";
        const VERIFICATION_URL = `https://claimpx.netlify.app/?address=${encodeURIComponent(address)}`;
        
        const response = await fetch('https://api.cuty.io/full', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: API_TOKEN,
                url: VERIFICATION_URL,
                title: 'Robot Verification for 0.1 MON Claim'
            })
        });

        if (!response.ok) throw new Error('Failed to create verification link');

        const data = await response.json();
        const verificationWindow = window.open(data.data.short_url, '_blank', 'width=500,height=600');

        // Check for verification completion every second
        const verificationCheck = setInterval(() => {
            if (verificationWindow.closed) {
                clearInterval(verificationCheck);
                completeVerification();
            }
        }, 1000);

    } catch (error) {
        statusElement.textContent = `Error: ${error.message}`;
        statusElement.className = 'error';
        verifyBtn.disabled = false;
    }
}

function completeVerification() {
    isVerified = true;
    document.getElementById('status').textContent = '✓ Verification passed!';
    document.getElementById('status').className = 'success';
    document.getElementById('verifyBtn').style.display = 'none';
    document.getElementById('claimBtn').style.display = 'block';
}

async function processClaim() {
    if (!isVerified) return;
    
    const statusElement = document.getElementById('status');
    const claimBtn = document.getElementById('claimBtn');
    
    claimBtn.disabled = true;
    statusElement.textContent = 'Sending 0.1 MON...';
    statusElement.className = 'processing';

    // Simulate blockchain transaction (2 second delay)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    statusElement.textContent = `Success! 0.1 MON sent to ${currentAddress}`;
    statusElement.className = 'success';
    claimBtn.textContent = 'Claimed!';
    
    // Reset after 5 seconds
    setTimeout(() => {
        isVerified = false;
        currentAddress = '';
        document.getElementById('verifyBtn').style.display = 'block';
        document.getElementById('verifyBtn').disabled = false;
        document.getElementById('claimBtn').style.display = 'none';
        document.getElementById('claimBtn').disabled = false;
        document.getElementById('claimBtn').textContent = 'Claim 0.1 MON';
        statusElement.textContent = '';
    }, 5000);
}