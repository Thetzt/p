const ethers = require('ethers');

exports.handler = async (event) => {
    try {
        // Validate the request
        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, body: 'Method Not Allowed' };
        }

        const { address, amount, userId } = JSON.parse(event.body);
        
        // Validate inputs
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return { statusCode: 400, body: 'Invalid address format' };
        }
        if (isNaN(amount) {
            return { statusCode: 400, body: 'Invalid amount' };
        }

        // Initialize provider and wallet
        const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || 'https://testnet-rpc.monad.xyz');
        const wallet = new ethers.Wallet(process.env.MON_PRIVATE_KEY, provider);
        
        // Send transaction
        const tx = await wallet.sendTransaction({
            to: address,
            value: ethers.utils.parseEther(amount.toString())
        });

        // Wait for transaction to be mined
        const receipt = await tx.wait();

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                txHash: tx.hash,
                amount: amount
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message
            })
        };
    }
};