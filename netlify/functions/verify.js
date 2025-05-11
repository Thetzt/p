<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ClaimPX - Telegram Login</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 500px;
            margin: 0 auto;
            padding: 20px;
            text-align: center;
        }
        #telegram-login {
            margin: 30px 0;
        }
        #user-info, #loading {
            display: none;
            margin-top: 20px;
            padding: 20px;
            background: #f5f5f5;
            border-radius: 8px;
        }
        #balance {
            font-weight: bold;
            color: #0088cc;
        }
        button {
            background: #0088cc;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
        }
        .error-message {
            color: #d32f2f;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <h1>ClaimPX</h1>
    <p>Login with Telegram to access your account</p>
    
    <!-- Telegram Login Button -->
    <div id="telegram-login"></div>
    
    <!-- Loading State -->
    <div id="loading">
        <p>Authenticating...</p>
    </div>
    
    <!-- User Info -->
    <div id="user-info">
        <h2>Welcome, <span id="username"></span>!</h2>
        <p>Your balance: <span id="balance">0.00</span></p>
        <button id="logout-btn">Logout</button>
    </div>
    
    <!-- Error Display -->
    <div id="error" class="error-message"></div>

    <!-- Firebase and Telegram Integration -->
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
        import { 
            getAuth, 
            signInWithCustomToken,
            signOut,
            onAuthStateChanged
        } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";
        import { 
            getFirestore, 
            doc, 
            setDoc,
            getDoc
        } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

        // Firebase Config
        const firebaseConfig = {
            apiKey: "AIzaSyDD0mTSuECptBeNzKpiaCDbbCJIoW9SiTg",
            authDomain: "claimpx.firebaseapp.com",
            projectId: "claimpx",
            storageBucket: "claimpx.appspot.com",
            messagingSenderId: "1012471480360",
            appId: "1:1012471480360:web:3b16bc6acc6adcf371b51d",
            measurementId: "G-NYK5SSMCF3"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const errorDisplay = document.getElementById('error');

        // Telegram Bot username
        const botUsername = "uxxucc_bot";

        // Display error message
        function showError(message) {
            errorDisplay.textContent = message;
            console.error(message);
        }

        // Clear error message
        function clearError() {
            errorDisplay.textContent = '';
        }

        // Load Telegram Widget
        function loadTelegramWidget() {
            try {
                const script = document.createElement('script');
                script.src = "https://telegram.org/js/telegram-widget.js?22";
                script.async = true;
                script.setAttribute('data-telegram-login', botUsername);
                script.setAttribute('data-size', "large");
                script.setAttribute('data-onauth', "onTelegramAuth(user)");
                script.setAttribute('data-auth-url', "https://claimpx.netlify.app/.netlify/functions/verify");
                document.getElementById('telegram-login').appendChild(script);
            } catch (error) {
                showError("Failed to load Telegram widget");
            }
        }

        // Handle Telegram Auth
        window.onTelegramAuth = async (userData) => {
            try {
                clearError();
                document.getElementById('loading').style.display = 'block';
                
                const response = await fetch("/.netlify/functions/verify", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(userData)
                });
                
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || "Verification failed");
                }

                // Sign in to Firebase
                await signInWithCustomToken(auth, result.token);
                
                // Save user data to Firestore
                const userRef = doc(db, "users", auth.currentUser.uid);
                await setDoc(userRef, {
                    telegramId: userData.id,
                    username: userData.username || userData.first_name,
                    firstName: userData.first_name,
                    lastName: userData.last_name || "",
                    photoUrl: userData.photo_url || "",
                    authDate: new Date(userData.auth_date * 1000),
                    lastLogin: new Date(),
                    balance: 0.00,
                    createdAt: new Date()
                }, { merge: true });
                
            } catch (error) {
                showError("Login failed: " + error.message);
                console.error("Auth error details:", {
                    error: error,
                    userData: userData
                });
            } finally {
                document.getElementById('loading').style.display = 'none';
            }
        };

        // Logout
        document.getElementById('logout-btn').addEventListener('click', async () => {
            try {
                await signOut(auth);
                document.getElementById('user-info').style.display = 'none';
                document.getElementById('telegram-login').style.display = 'block';
            } catch (error) {
                showError("Logout failed: " + error.message);
            }
        });

        // Check auth state
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        document.getElementById('username').textContent = userData.username;
                        document.getElementById('balance').textContent = userData.balance.toFixed(4);
                        document.getElementById('user-info').style.display = 'block';
                        document.getElementById('telegram-login').style.display = 'none';
                    }
                } catch (error) {
                    showError("Failed to load user data");
                }
            } else {
                document.getElementById('user-info').style.display = 'none';
                document.getElementById('telegram-login').style.display = 'block';
            }
        });

        // Initialize on page load
        window.addEventListener('DOMContentLoaded', () => {
            try {
                loadTelegramWidget();
            } catch (error) {
                showError("Initialization error: " + error.message);
            }
        });
    </script>
</body>
</html>