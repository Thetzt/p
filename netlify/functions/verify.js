const crypto = require('crypto');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

exports.handler = async (event) => {
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

  try {
    const { hash, ...userData } = JSON.parse(event.body);
    
    // Verify Telegram hash
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

    // Check for referral
    const refId = event.queryStringParameters?.ref;
    let referralUpdate = {};
    
    if (refId && refId !== userData.id.toString()) {
      referralUpdate = {
        [`referrals.${userData.id}`]: {
          username: userData.username || userData.first_name,
          joinedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        'referrals.count': admin.firestore.FieldValue.increment(1)
      };
      
      // Add bonus to referrer's account
      await admin.firestore().runTransaction(async (t) => {
        const refDoc = await t.get(admin.firestore().collection("users").doc(`telegram:${refId}`));
        if (refDoc.exists) {
          t.update(admin.firestore().collection("users").doc(`telegram:${refId}`), {
            balance: admin.firestore.FieldValue.increment(0.01),
            ...referralUpdate
          });
        }
      });
    }

    // Create or update user
    const uid = `telegram:${userData.id}`;
    const userRef = admin.firestore().collection('users').doc(uid);
    
    await userRef.set({
      telegramUser: userData,
      balance: admin.firestore.FieldValue.increment(0),
      lastClaim: 0,
      lastDevice: null,
      referrals: {
        count: 0,
        ...(refId && refId !== userData.id.toString() ? { referrer: refId } : {})
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Create Firebase token
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