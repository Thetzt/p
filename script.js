document.getElementById("claimButton").addEventListener("click", async function() {
    const evmAddress = document.getElementById("evmAddress").value.trim();
    
    // Basic EVM address validation
    if (!evmAddress || !evmAddress.startsWith("0x") || evmAddress.length !== 42) {
        alert("Please enter a valid EVM address (starting with 0x)!");
        return;
    }

    // Your Cuty.io API Token
    const API_TOKEN = "0037252eb04b18f83ea817f4f";  
    
    // Disable button during processing
    const claimBtn = document.getElementById("claimButton");
    claimBtn.disabled = true;
    claimBtn.textContent = "Processing...";

    try {
        // First, verify/save the address (you might want to send to your backend)
        // await verifyAddress(evmAddress); // Uncomment if you have backend verification
        
        // Create Cuty.io short link
        const LONG_URL = `https://yourdomain.com/success.html?address=${encodeURIComponent(evmAddress)}`;
        
        const response = await fetch("https://api.cuty.io/full", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: API_TOKEN,
                url: LONG_URL,
                alias: generateRandomAlias(), // Custom function to generate alias
                title: "Claim 0.1 mon Reward"
            })
        });

        if (response.ok) {
            const data = await response.json();
            // Redirect to the Cuty.io short link
            window.location.href = data.data.short_url;
        } else {
            const error = await response.json();
            throw new Error(error.message || "Failed to create short link");
        }
    } catch (error) {
        alert("Error: " + error.message);
        claimBtn.disabled = false;
        claimBtn.textContent = "Claim Now";
    }
});

function generateRandomAlias() {
    return 'mon-' + Math.random().toString(36).substring(2, 8);
}

// Optional: Backend verification function
async function verifyAddress(address) {
    const response = await fetch('/verify.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
    });
    if (!response.ok) {
        throw new Error('Address verification failed');
    }
}