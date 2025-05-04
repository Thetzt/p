document.getElementById("claimButton").addEventListener("click", async function() {
    const evmAddress = document.getElementById("evmAddress").value.trim();
    const statusElement = document.getElementById("status");
    const claimBtn = document.getElementById("claimButton");
    
    // Clear previous status
    statusElement.className = "";
    statusElement.textContent = "";
    
    // Basic EVM address validation
    if (!evmAddress || !evmAddress.startsWith("0x") || evmAddress.length !== 42) {
        statusElement.textContent = "Please enter a valid EVM address (starting with 0x and 42 characters long)";
        statusElement.className = "error";
        return;
    }

    // UI feedback
    claimBtn.disabled = true;
    claimBtn.textContent = "Processing...";
    statusElement.textContent = "Verifying robot check...";
    statusElement.className = "processing";

    try {
        // Step 1: Create verification Cuty.io link
        const API_TOKEN = "0037252eb04b18f83ea817f4f"; // Your Cuty.io token
        const VERIFICATION_URL = `https://claimpx.netlify.app/verify.html?address=${encodeURIComponent(evmAddress)}`;
        
        const verificationResponse = await fetch("https://api.cuty.io/full", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: API_TOKEN,
                url: VERIFICATION_URL,
                title: "Robot Verification for 0.1 mon Claim"
            })
        });

        if (!verificationResponse.ok) {
            throw new Error("Failed to create verification link");
        }

        const verificationData = await verificationResponse.json();
        const verificationShortUrl = verificationData.data.short_url;
        
        // Step 2: Open verification in new tab
        const verificationWindow = window.open(verificationShortUrl, "_blank");
        
        // Step 3: Check for verification completion
        const checkVerification = setInterval(async () => {
            try {
                // In a real implementation, you would check your backend 
                // or use localStorage to verify completion
                // This is a simplified version
                
                // Assume verification is complete after visiting the link
                clearInterval(checkVerification);
                
                // Step 4: Process successful claim
                statusElement.textContent = "Verification successful! Sending 0.1 mon...";
                statusElement.className = "processing";
                
                // Simulate sending crypto (in real app, this would be a backend call)
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                statusElement.textContent = "Success! 0.1 mon sent to your address.";
                statusElement.className = "success";
                claimBtn.textContent = "Claimed!";
                
            } catch (error) {
                clearInterval(checkVerification);
                statusElement.textContent = "Error: " + error.message;
                statusElement.className = "error";
                claimBtn.disabled = false;
                claimBtn.textContent = "Try Again";
            }
        }, 2000); // Check every 2 seconds

    } catch (error) {
        statusElement.textContent = "Error: " + error.message;
        statusElement.className = "error";
        claimBtn.disabled = false;
        claimBtn.textContent = "Try Again";
    }
});