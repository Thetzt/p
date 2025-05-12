const { ethers } = require('ethers');

exports.handler = async (event) => {
  try {
    // Validate request
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { address, amount } = JSON.parse(event.body);
    
    // Input validation
    if (!ethers.utils.isAddress(address)) {
      return { statusCode: 400, body: 'Invalid address' };
    }
    if (isNaN(amount) || amount <= 0) {
      return { statusCode: 400, body: 'Invalid amount' };
    }

    // Initialize provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.RPC_URL || 'https://testnet-rpc.monad.xyz'
    );
    const wallet = new ethers.Wallet(process.env.MON_PRIVATE_KEY, provider);
    
    // Send transaction
    const tx = await wallet.sendTransaction({
      to: address,
      value: ethers.utils.parseEther(amount.toString())
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        txHash: tx.hash,
        amount: amount
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};