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
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': 'https://claimpx.netlify.app',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }

  // Main request handler
  try {
    const { hash, ...userData } = JSON.parse(event.body);
    
    // 1. Verify Telegram hash
    const dataCheckString = Object.keys(userData)
      .sort()
      .map(key => `${key}=${userData[key]}`)
      .join('\n');
    
    const secretKey = crypto.createHash('sha256')
      .update(process.env.TELEGRAM_BOT_TOKEN)
      .digest();
    
    const computedHash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) {
      return {
        statusCode: 401,
        headers: { 'Access-Control-Allow-Origin': 'https://claimpx.netlify.app' },
        body: JSON.stringify({ error: 'Invalid Telegram authentication' })
      };
    }

    // 2. Create Firebase token
    const uid = `telegram:${userData.id}`;
    const token = await admin.auth().createCustomToken(uid, {
      telegram_id: userData.id,
      authenticated: true
    });

    return {
      statusCode: 200,
      headers: { 
        'Access-Control-Allow-Origin': 'https://claimpx.netlify.app',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': 'https://claimpx.netlify.app' },
      body: JSON.stringify({ 
        error: 'auth/internal-error',
        details: error.message 
      })
    };
  }
};