// ==================== FIREBASE CONFIGURATION ====================
// File: js/firebase-config.js
// Description: Firebase initialization with hardcoded credentials
// Author: Dark World Live Chat
// ===============================================================

// YOUR FIREBASE CONFIG - REPLACE THESE VALUES WITH YOUR ACTUAL FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyA7-8Dg6oN4H50Kxa3jNW1FeCHQsCGg3nY",
  authDomain: "sms-world-5e105.firebaseapp.com",
  projectId: "sms-world-5e105",
  storageBucket: "sms-world-5e105.firebasestorage.app",
  messagingSenderId: "1023461332244",
  appId: "1:1023461332244:web:c737340fe5d31171671e01",
  measurementId: "G-2S04WLKLE0"
};

let firebaseInitialized = false;
let firebaseInstance = null;

// Initialize Firebase with hardcoded config
async function initializeFirebase() {
    try {
        console.log('🚀 Initializing Firebase with hardcoded configuration...');
        
        // Check if Firebase SDK is loaded
        if (typeof firebase === 'undefined') {
            console.log('📦 Loading Firebase SDK...');
            await loadFirebaseSDK();
        }
        
        // Initialize Firebase if not already initialized
        if (!firebase.apps.length) {
            console.log('🔧 Initializing Firebase app...');
            firebase.initializeApp(FIREBASE_CONFIG);
            console.log('✅ Firebase app initialized successfully');
        } else {
            console.log('ℹ️ Firebase app already initialized');
            firebaseInstance = firebase.app();
        }
        
        firebaseInstance = firebase.app();
        firebaseInitialized = true;
        
        console.log('🎉 Firebase initialization complete');
        console.log('📋 Project ID:', FIREBASE_CONFIG.projectId);
        console.log('🔑 API Key:', FIREBASE_CONFIG.apiKey.substring(0, 10) + '...');
        
        return firebaseInstance;
        
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
        console.error('Error details:', error.message);
        
        // Show user-friendly error
        showFirebaseError(error);
        throw error;
    }
}

// Load Firebase SDK
async function loadFirebaseSDK() {
    return new Promise((resolve, reject) => {
        console.log('⬇️ Loading Firebase SDK...');
        
        const scripts = [
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js'
        ];
        
        let loaded = 0;
        let total = scripts.length;
        
        scripts.forEach((src, index) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = false;
            
            script.onload = () => {
                loaded++;
                console.log(`✅ Loaded (${loaded}/${total}): ${src}`);
                if (loaded === total) {
                    console.log('✅ All Firebase SDK scripts loaded');
                    resolve();
                }
            };
            
            script.onerror = (error) => {
                console.error(`❌ Failed to load: ${src}`, error);
                reject(new Error(`Failed to load Firebase SDK: ${src}`));
            };
            
            document.head.appendChild(script);
        });
    });
}

// Show Firebase error in UI
function showFirebaseError(error) {
    // Create error element if not exists
    let errorDiv = document.getElementById('firebase-error');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'firebase-error';
        errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ef4444;
            color: white;
            padding: 15px;
            text-align: center;
            z-index: 9999;
            font-family: Arial, sans-serif;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(errorDiv);
    }
    
    let errorMessage = 'Firebase Error: ';
    if (error.code === 'auth/network-request-failed') {
        errorMessage += 'Network error. Please check your internet connection.';
    } else if (error.message.includes('API key')) {
        errorMessage += 'Invalid Firebase configuration. Please check API key.';
    } else {
        errorMessage += error.message;
    }
    
    errorDiv.innerHTML = `
        ${errorMessage}
        <button onclick="this.parentElement.remove()" style="
            background: white;
            color: #ef4444;
            border: none;
            padding: 5px 10px;
            margin-left: 10px;
            border-radius: 4px;
            cursor: pointer;
        ">✕</button>
    `;
}

// Test Firebase connection
async function testFirebaseConnection() {
    try {
        if (!firebaseInitialized) {
            await initializeFirebase();
        }
        
        console.log('🧪 Testing Firebase connection...');
        
        // Test Firestore
        const db = firebase.firestore();
        const testRef = db.collection('_test').doc('connection');
        
        // Try to write
        await testRef.set({
            test: true,
            timestamp: new Date().toISOString()
        });
        
        // Try to read
        const doc = await testRef.get();
        
        // Cleanup
        await testRef.delete();
        
        console.log('✅ Firebase connection test passed');
        return true;
        
    } catch (error) {
        console.error('❌ Firebase connection test failed:', error);
        return false;
    }
}

// Get Firebase services
function getFirebaseServices() {
    if (!firebaseInitialized) {
        throw new Error('Firebase not initialized. Call initializeFirebase() first.');
    }
    
    return {
        auth: firebase.auth(),
        firestore: firebase.firestore(),
        messaging: firebase.messaging(),
        app: firebaseInstance
    };
}

// Check if Firebase is ready
function isFirebaseReady() {
    return firebaseInitialized && firebaseInstance !== null;
}

// Export for use in other files
window.firebaseConfig = {
    initialize: initializeFirebase,
    isInitialized: () => firebaseInitialized,
    getFirebase: () => firebaseInstance,
    getServices: getFirebaseServices,
    testConnection: testFirebaseConnection,
    isReady: isFirebaseReady,
    config: FIREBASE_CONFIG // Expose config if needed
};

// Auto-initialize on page load (optional)
window.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 Page loaded, checking Firebase...');
    
    // You can auto-initialize or wait for manual initialization
    // initializeFirebase().catch(console.error);
});

console.log('✅ firebase-config.js loaded');
console.log('📋 Project:', FIREBASE_CONFIG.projectId);
