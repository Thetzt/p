const crypto = require('crypto');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const BOT_TOKEN = "7666230446:AAHyavRyTRP6n0703ZxZg-Q4q_FI6LlAizs";
    const { hash, ...userData } = JSON.parse(event.body);

    // Verify Telegram data
    const dataCheckString = Object.keys(userData)
      .sort()
      .map(key => `${key}=${userData[key]}`)
      .join('\n');
    
    const secretKey = crypto.createHash('sha256')
      .update(BOT_TOKEN)
      .digest();
    
    const computedHash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid Telegram authentication' })
      };
    }

    // Create Firebase custom token
    const uid = `telegram:${userData.id}`;
    const token = await admin.auth().createCustomToken(uid);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        token,
        user: {
          id: userData.id,
          username: userData.username,
          first_name: userData.first_name
        }
      })
    };
    
  } catch (error) {
    console.error('Verification error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};