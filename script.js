// Global state
let verificationExpiry = JSON.parse(localStorage.getItem('verificationExpiry')) || {};
let telegramRequests = JSON.parse(localStorage.getItem('telegramRequests')) || {};
let userTransactions = JSON.parse(localStorage.getItem('userTransactions')) || {};

// Configuration
const config = {
    privateKey: 'ef29a3c19bf04ed62d1e2fa26301b5aeb6468c33afa072730dde55012f3053eb',
    rpcUrl: 'https://testnet-rpc.monad.xyz',
    chainId: 10143,
    faucetAmount: '0.01',
    dailyLimit: 1,
    explorerUrl: 'https://testnet.monadexplorer.com'
};

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', async function() {
    if (!document.getElementById('requestButton')) return;
    
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    if (!telegramUser) {
        window.location.href = 'index.html';
        return;
    }

    // ... (keep existing profile setup code) ...

    updateUI();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('address').addEventListener('input', updateUI);
    document.getElementById('requestButton').addEventListener('click', processRequest);
}

function updateUI() {
    updateRequestStatus();
    renderActivityFeed();
    updateVerificationStatus();
}

function updateVerificationStatus() {
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    if (!telegramUser) return;
    
    const statusEl = document.getElementById('verificationStatus');
    const isVerified = isTelegramVerified(telegramUser.id);
    
    if (isVerified) {
        const expiryTime = new Date(verificationExpiry[telegramUser.id]);
        const timeLeft = Math.floor((expiryTime - Date.now()) / (60 * 1000));
        
        if (timeLeft > 0) {
            statusEl.textContent = `✓ Verified (expires in ${timeLeft} minutes)`;
            statusEl.className = 'verification-status verified';
        } else {
            statusEl.textContent = 'Verification expired. Please complete reCAPTCHA again.';
            statusEl.className = 'verification-status expired';
        }
    } else {
        statusEl.textContent = 'Please complete the reCAPTCHA verification';
        statusEl.className = 'verification-status expired';
    }
}

// reCAPTCHA callbacks
function onCaptchaSuccess(token) {
    const telegramUser = JSON.parse(localStorage.getItem('telegramUser'));
    if (!telegramUser) return;
    
    // Set verification to expire in 1 hour
    verificationExpiry[telegramUser.id] = Date.now() + (60 * 60 * 1000);
    localStorage.setItem('verificationExpiry', JSON.stringify(verificationExpiry));
    
    showOutput('Verification successful!', 'success', 4000);
    updateVerificationStatus();
}

function onCaptchaExpired() {
    showOutput('Verification expired. Please complete reCAPTCHA again.', 'error', 4000);
    updateVerificationStatus();
}

function isTelegramVerified(telegramId) {
    const expiryTime = verificationExpiry[telegramId] || 0;
    return Date.now() < expiryTime;
}

// ... (keep all other existing functions the same) ...