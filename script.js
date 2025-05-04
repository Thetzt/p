// Initialize verification state
let pendingVerificationAddress = '';

// Generate device fingerprint
function getDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('device-fingerprint', 2, 15);
    return canvas.toDataURL();
}

// Get client IP (using a free API)
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Error getting IP:', error);
        return null;
    }
}

// Check verification status when page loads
document.addEventListener('DOMContentLoaded', async function() {
    // Check if returning from verification
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('verificationComplete')) {
        handleVerificationReturn();
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Initialize device fingerprint in localStorage
    if (!localStorage.getItem('deviceFingerprint')) {
        localStorage.setItem('deviceFingerprint', getDeviceFingerprint());
    }
});

function checkPendingVerification() {
    const pendingAddress = localStorage.getItem('pendingVerificationAddress');
    if (pendingAddress) {
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
document.getElementById('verifyBtn').addEventListener('click', async function() {
    const address = document.getElementById('evmAddress').value.trim();
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        document.getElementById('status').textContent = 'Please enter a valid EVM address';
        document.getElementById('status').className = 'error';
        return;
    }

    // First check IP and device
    await checkIPAndDevice(address);
});

async function checkIPAndDevice(address) {
    const statusElement = document.getElementById('status');
    const verifyBtn = document.getElementById('verifyBtn');
    
    verifyBtn.disabled = true;
    statusElement.textContent = 'Checking your device...';
    statusElement.className = 'processing';

    try {
        // Get current IP and device fingerprint
        const [currentIP, currentDevice] = await Promise.all([
            getClientIP(),
            localStorage.getItem('deviceFingerprint')
        ]);

        // Get stored verification records
        const verificationRecords = JSON.parse(localStorage.getItem('verificationRecords')) || {};
        
        // Check if this IP/device already verified an address
        if (verificationRecords[currentIP] || verificationRecords[currentDevice]) {
            const existingAddress = verificationRecords[currentIP] || verificationRecords[currentDevice];
            if (existingAddress !== address) {
                throw new Error('This device/IP has already verified a different address');
            }
        }

        // If checks pass, proceed to Cuty.io verification
        await startVerification(address, currentIP, currentDevice);

    } catch (error) {
        statusElement.textContent = `Verification failed: ${error.message}`;
        statusElement.className = 'error';
        verifyBtn.disabled = false;
    }
}

async function startVerification(address, ip, device) {
    const statusElement = document.getElementById('status');
    
    statusElement.textContent = 'Starting robot verification...';
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
        
        // Store verification record before redirecting
        const verificationRecords = JSON.parse(localStorage.getItem('verificationRecords')) || {};
        verificationRecords[ip] = address;
        verificationRecords[device] = address;
        localStorage.setItem('verificationRecords', JSON.stringify(verificationRecords));
        
        window.location.href = data.data.short_url;

    } catch (error) {
        statusElement.textContent = `Error: ${error.message}`;
        statusElement.className = 'error';
        localStorage.removeItem('pendingVerificationAddress');
    }
}

// Claim button handler (same as before)
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