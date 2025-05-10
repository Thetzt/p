const crypto = require('crypto');
const admin = require('firebase-admin');

// Initialize Firebase Admin with error handling
try {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
    });
    console.log("Firebase Admin initialized successfully");
} catch (error) {
    console.error("Firebase Admin initialization failed:", error);
    process.exit(1);
}

exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const BOT_TOKEN = "7666230446:AAHyavRyTRP6n0703ZxZg-Q4q_FI6LlAizs";
        let userData;
        
        try {
            userData = JSON.parse(event.body);
        } catch (parseError) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid JSON data' })
            };
        }

        // Verify all required fields exist
        if (!userData.id || !userData.auth_date || !userData.hash) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required Telegram auth data' })
            };
        }

        // Verify Telegram data
        const dataCheckString = Object.keys(userData)
            .filter(key => key !== 'hash')
            .sort()
            .map(key => `${key}=${userData[key]}`)
            .join('\n');
        
        const secretKey = crypto.createHash('sha256')
            .update(BOT_TOKEN)
            .digest();
        
        const computedHash = crypto.createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        if (computedHash !== userData.hash) {
            console.error("Hash verification failed", {
                receivedHash: userData.hash,
                computedHash: computedHash,
                dataCheckString: dataCheckString
            });
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Invalid Telegram authentication' })
            };
        }

        // Create Firebase custom token with additional claims
        const uid = `telegram:${userData.id}`;
        const additionalClaims = {
            telegramId: userData.id,
            authMethod: 'telegram'
        };

        const token = await admin.auth().createCustomToken(uid, additionalClaims);
        console.log("Token generated for user:", uid);
        
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                token,
                userId: uid
            })
        };
        
    } catch (error) {
        console.error('Full error details:', {
            message: error.message,
            stack: error.stack,
            inputData: event.body
        });
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Authentication failed',
                details: error.message 
            })
        };
    }
};