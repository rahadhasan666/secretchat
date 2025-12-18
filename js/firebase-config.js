// ==================== FIREBASE CONFIGURATION ====================
// File: js/firebase-config.js
// Description: Firebase initialization with hardcoded credentials
// IMPORTANT: REPLACE THE VALUES BELOW WITH YOUR ACTUAL FIREBASE CONFIG
// ===============================================================

// 🔥 REPLACE THESE VALUES WITH YOUR ACTUAL FIREBASE CONFIG 🔥
// Get these from Firebase Console → Project Settings → General → Your apps → Web app
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
let initializationPromise = null;

// Initialize Firebase
async function initializeFirebase() {
    // Return existing promise if already initializing
    if (initializationPromise) {
        return initializationPromise;
    }
    
    initializationPromise = (async () => {
        try {
            console.log('🚀 ===== FIREBASE INITIALIZATION STARTED =====');
            
            // Step 1: Check if Firebase SDK is loaded
            console.log('🔍 Step 1: Checking Firebase SDK...');
            if (typeof firebase === 'undefined') {
                console.error('❌ Firebase SDK not found');
                throw new Error('Firebase SDK not loaded. Please check internet connection.');
            }
            console.log('✅ Firebase SDK is loaded');
            
            // Step 2: Check required Firebase modules
            console.log('🔍 Step 2: Checking Firebase modules...');
            const requiredModules = ['initializeApp', 'auth', 'firestore'];
            for (const module of requiredModules) {
                if (typeof firebase[module] === 'undefined') {
                    console.error(`❌ Firebase module missing: ${module}`);
                    throw new Error(`Firebase ${module} module not loaded`);
                }
            }
            console.log('✅ All Firebase modules available');
            
            // Step 3: Initialize Firebase App
            console.log('🔧 Step 3: Initializing Firebase App...');
            let app;
            
            if (!firebase.apps.length) {
                console.log('📝 Creating new Firebase app...');
                app = firebase.initializeApp(FIREBASE_CONFIG);
                console.log('✅ Firebase app created:', app.name);
            } else {
                app = firebase.app();
                console.log('ℹ️ Using existing Firebase app:', app.name);
            }
            
            // Step 4: Verify initialization
            console.log('🔍 Step 4: Verifying initialization...');
            if (!app) {
                throw new Error('Firebase app creation failed');
            }
            
            // Step 5: Test Firebase services
            console.log('🧪 Step 5: Testing Firebase services...');
            const auth = firebase.auth();
            const db = firebase.firestore();
            
            if (!auth || !db) {
                throw new Error('Firebase services not available');
            }
            
            console.log('✅ Firebase Auth:', typeof auth);
            console.log('✅ Firebase Firestore:', typeof db);
            
            firebaseInitialized = true;
            
            console.log('🎉 ===== FIREBASE INITIALIZATION COMPLETE =====');
            console.log('📋 Project:', FIREBASE_CONFIG.projectId);
            
            return app;
            
        } catch (error) {
            console.error('❌ ===== FIREBASE INITIALIZATION FAILED =====');
            console.error('Error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Stack:', error.stack);
            
            // Reset promise on error
            initializationPromise = null;
            firebaseInitialized = false;
            
            // Show user-friendly error
            showFirebaseError(error);
            throw error;
        }
    })();
    
    return initializationPromise;
}

// Show Firebase error in UI
function showFirebaseError(error) {
    console.log('🔄 Showing Firebase error in UI...');
    
    // Wait for DOM to be ready
    setTimeout(() => {
        try {
            // Remove existing error if any
            const existingError = document.getElementById('firebase-error-toast');
            if (existingError) existingError.remove();
            
            // Create error toast
            const errorDiv = document.createElement('div');
            errorDiv.id = 'firebase-error-toast';
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
                padding: 16px 20px;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
                z-index: 99999;
                max-width: 400px;
                animation: slideIn 0.3s ease;
                border: 1px solid #b91c1c;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            
            let errorMessage = 'Firebase Error: ';
            
            if (error.code === 'app/no-app') {
                errorMessage = 'Firebase not initialized. Please refresh the page.';
            } else if (error.message.includes('API key')) {
                errorMessage = 'Invalid Firebase configuration. Please check your API key.';
            } else if (error.message.includes('network')) {
                errorMessage = 'Network error. Please check your internet connection.';
            } else {
                errorMessage += error.message;
            }
            
            errorDiv.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="font-size: 20px;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: 4px;">Firebase Error</div>
                        <div style="font-size: 14px; opacity: 0.9;">${errorMessage}</div>
                        <div style="margin-top: 8px; font-size: 12px; opacity: 0.7;">
                            Check browser console (F12) for details
                        </div>
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" style="
                        background: rgba(255, 255, 255, 0.2);
                        border: none;
                        color: white;
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 14px;
                    ">
                        ✕
                    </button>
                </div>
            `;
            
            // Add styles for icon
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
            
            document.body.appendChild(errorDiv);
            
            // Auto remove after 10 seconds
            setTimeout(() => {
                if (errorDiv.parentElement) {
                    errorDiv.style.animation = 'slideIn 0.3s ease reverse';
                    setTimeout(() => errorDiv.remove(), 300);
                }
            }, 10000);
            
        } catch (uiError) {
            console.error('Could not show error UI:', uiError);
        }
    }, 100);
}

// Get Firebase services
function getFirebaseServices() {
    if (!firebaseInitialized) {
        throw new Error('Firebase not initialized. Call initializeFirebase() first.');
    }
    
    return {
        auth: firebase.auth(),
        firestore: firebase.firestore(),
        messaging: firebase.messaging ? firebase.messaging() : null,
        app: firebase.app()
    };
}

// Test Firebase connection
async function testFirebaseConnection() {
    try {
        console.log('🧪 Testing Firebase connection...');
        
        if (!firebaseInitialized) {
            await initializeFirebase();
        }
        
        const db = firebase.firestore();
        const testRef = db.collection('_test_connection');
        
        // Try a simple operation
        await testRef.limit(1).get();
        
        console.log('✅ Firebase connection test passed');
        return true;
        
    } catch (error) {
        console.error('❌ Firebase connection test failed:', error);
        return false;
    }
}

// Auto-initialize on page load (for testing)
window.addEventListener('DOMContentLoaded', function() {
    console.log('🌐 DOM loaded, Firebase config ready');
    
    // You can auto-initialize for testing
    // initializeFirebase().catch(() => {
    //     console.log('Firebase auto-init failed (expected on login page)');
    // });
});

// Export for use in other files
window.firebaseConfig = {
    initialize: initializeFirebase,
    isInitialized: () => firebaseInitialized,
    getFirebase: () => firebase,
    getServices: getFirebaseServices,
    testConnection: testFirebaseConnection,
    config: FIREBASE_CONFIG
};

console.log('✅ firebase-config.js loaded successfully');
console.log('📁 Project ID:', FIREBASE_CONFIG.projectId);
