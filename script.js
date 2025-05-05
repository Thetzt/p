document.getElementById("claimButton").addEventListener("click", async function() {
    const evmAddress = document.getElementById("evmAddress").value.trim();
    const statusElement = document.getElementById("status");
    const claimBtn = document.getElementById("claimButton");
    
    // Basic EVM address validation
    if (!evmAddress || !evmAddress.startsWith("0x") || evmAddress.length !== 42) {
        statusElement.textContent = "Please enter a valid EVM address (starting with 0x and 42 characters long)";
        statusElement.style.color = "red";
        return;
    }

    // UI feedback
    claimBtn.disabled = true;
    claimBtn.textContent = "Processing...";
    statusElement.textContent = "Creating your claim link...";
    statusElement.style.color = "blue";

    try {
        // Your Cuty.io API Token - REPLACE WITH YOUR ACTUAL TOKEN
        const API_TOKEN = "f9fbeac16a6604104025b25fe";
        
        // Create a unique destination URL
        const LONG_URL = `https://claimpx.netlify.app/?address=${encodeURIComponent(evmAddress)}`;
        
        const response = await fetch("https://api.cuty.io/full", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: API_TOKEN,
                url: LONG_URL,
                title: "Claim 0.1 mon Reward"
            })
        });

        if (response.ok) {
            const data = await response.json();
            statusElement.textContent = "Redirecting to claim page...";
            statusElement.style.color = "green";
            
            // Redirect to the Cuty.io short link
            window.location.href = data.data.short_url;
        } else {
            const error = await response.text();
            throw new Error(error || "Failed to create short link");
        }
    } catch (error) {
        statusElement.textContent = "Error: " + error.message;
        statusElement.style.color = "red";
        claimBtn.disabled = false;
        claimBtn.textContent = "Try Again";
    }
});