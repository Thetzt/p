// Check URL parameters on load (for return from Cuty.io)
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const verifiedAddress = urlParams.get('verified');
    
    if (verifiedAddress) {
        // Add to whitelist
        const whitelist = JSON.parse(localStorage.getItem('whitelist') || [];
        if (!whitelist.includes(verifiedAddress)) {
            whitelist.push(verifiedAddress);
            localStorage.setItem('whitelist', JSON.stringify(whitelist));
        }
        
        // Auto-fill address and show verified status
        document.getElementById('evmAddress').value = verifiedAddress;
        checkVerificationStatus(verifiedAddress);
    }
});

// Check if address is already verified
function checkVerificationStatus(address) {
    const whitelist = JSON.parse(localStorage.getItem('whitelist')) || [];
    const isVerified = whitelist.includes(address);
    
    if (isVerified) {
        document.getElementById('verifiedBadge').style.display = 'inline-block';
        document.getElementById('verifyBtn').style.display = 'none';
    } else {
        document.getElementById('verifiedBadge').style.display = 'none';
        document.getElementById('verifyBtn').style.display = 'block';
    }
}

// Address input handler
document.getElementById('evmAddress').addEventListener('input', function() {
    const address = this.value.trim();
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
        checkVerificationStatus(address);
    } else {
        document.getElementById('verifiedBadge').style.display = 'none';
        document.getElementById('verifyBtn').style.display = 'block';
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
    processClaim(address);
});

async function startVerification(address) {
    const statusElement = document.getElementById('status');
    const verifyBtn = document.getElementById('verifyBtn');
    
    verifyBtn.disabled = true;
    statusElement.textContent = 'Preparing verification...';
    statusElement.className = 'processing';

    try {
        // Create Cuty.io verification link with return URL
        const API_TOKEN = "0037252eb04b18f83ea817f4f";
        const RETURN_URL = `https://claimpx.netlify.app/?verified=${encodeURIComponent(address)}`;
        
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
        window.location.href = data.data.short_url; // Redirect to Cuty.io

    } catch (error) {
        statusElement.textContent = `Error: ${error.message}`;
        statusElement.className = 'error';
        verifyBtn.disabled = false;
    }
}

async function processClaim(address) {
    const statusElement = document.getElementById('status');
    const claimBtn = document.getElementById('claimBtn');
    
    // Verify address is whitelisted
    const whitelist = JSON.parse(localStorage.getItem('whitelist')) || [];
    if (!whitelist.includes(address)) {
        statusElement.textContent = 'Please complete verification first';
        statusElement.className = 'error';
        return;
    }

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