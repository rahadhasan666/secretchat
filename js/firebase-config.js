// ==================== FIREBASE CONFIGURATION ====================
// File: js/firebase-config.js
// ===============================================================

// REPLACE THESE WITH YOUR ACTUAL FIREBASE CREDENTIALS
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

// Check if Firebase SDK is loaded
function isFirebaseLoaded() {
    return typeof firebase !== 'undefined' && 
           typeof firebase.initializeApp === 'function' &&
           typeof firebase.auth === 'function' &&
           typeof firebase.firestore === 'function';
}

// Initialize Firebase
function initializeFirebase() {
    console.log('🚀 Initializing Firebase...');
    
    try {
        // Check if Firebase SDK is loaded
        if (!isFirebaseLoaded()) {
            console.error('❌ Firebase SDK not loaded');
            throw new Error('Firebase SDK not loaded. Check CDN or internet connection.');
        }
        
        console.log('✅ Firebase SDK is loaded');
        
        // Initialize Firebase if not already initialized
        if (!firebase.apps.length) {
            console.log('🔧 Creating Firebase app...');
            firebase.initializeApp(FIREBASE_CONFIG);
            console.log('✅ Firebase app created');
        } else {
            console.log('ℹ️ Firebase app already exists');
        }
        
        firebaseInitialized = true;
        console.log('🎉 Firebase initialized successfully');
        
        // Test Firebase services
        testFirebaseServices();
        
        return firebase;
        
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        showFirebaseError(error);
        throw error;
    }
}

// Test Firebase services
function testFirebaseServices() {
    try {
        console.log('🧪 Testing Firebase services...');
        
        const auth = firebase.auth();
        const db = firebase.firestore();
        
        console.log('✅ Firebase Auth:', typeof auth);
        console.log('✅ Firebase Firestore:', typeof db);
        console.log('✅ Firebase App:', firebase.app().name);
        
        return true;
    } catch (error) {
        console.error('❌ Firebase services test failed:', error);
        return false;
    }
}

// Show error message
function showFirebaseError(error) {
    // Try to show error in UI
    setTimeout(() => {
        const errorDiv = document.createElement('div');
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
        `;
        errorDiv.innerHTML = `
            <strong>Firebase Error:</strong> ${error.message}
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
        document.body.appendChild(errorDiv);
    }, 100);
}

// Auto-initialize on window load
window.addEventListener('load', function() {
    console.log('🌐 Window loaded, checking Firebase...');
    
    // Check if Firebase is loaded
    if (isFirebaseLoaded()) {
        console.log('✅ Firebase SDK loaded automatically');
        // You can auto-initialize here if needed
        // initializeFirebase();
    } else {
        console.error('❌ Firebase SDK not loaded after window load');
        showFirebaseError(new Error('Firebase SDK failed to load. Please refresh the page.'));
    }
});

// Export for use in other files
window.firebaseConfig = {
    initialize: initializeFirebase,
    isInitialized: () => firebaseInitialized,
    getFirebase: () => firebase,
    config: FIREBASE_CONFIG
};

console.log('✅ firebase-config.js loaded');
