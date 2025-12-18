// Initialize Firebase with user configuration
let firebaseInitialized = false;
let initializationPromise = null;

async function initializeFirebase() {
    // If already initializing, return the same promise
    if (initializationPromise) {
        return initializationPromise;
    }
    
    initializationPromise = (async () => {
        try {
            console.log('🔧 Initializing Firebase...');
            
            // Check if configuration exists
            const savedConfig = localStorage.getItem('firebaseConfig');
            if (!savedConfig) {
                console.error('❌ Firebase configuration not found');
                throw new Error('Firebase configuration not found. Please configure Firebase first.');
            }
            
            const config = JSON.parse(savedConfig);
            console.log('✅ Firebase config loaded');
            
            // Check if Firebase SDK is already loaded
            if (typeof firebase === 'undefined') {
                console.log('📦 Loading Firebase SDK...');
                await loadFirebaseSDK();
            }
            
            // Initialize Firebase if not already initialized
            if (!firebase.apps.length) {
                console.log('🚀 Initializing Firebase app...');
                firebase.initializeApp(config);
                console.log('✅ Firebase app initialized');
            } else {
                console.log('ℹ️ Firebase app already initialized');
            }
            
            firebaseInitialized = true;
            console.log('🎉 Firebase initialized successfully');
            return firebase;
            
        } catch (error) {
            console.error('❌ Firebase initialization error:', error);
            firebaseInitialized = false;
            initializationPromise = null;
            throw error;
        }
    })();
    
    return initializationPromise;
}

async function loadFirebaseSDK() {
    return new Promise((resolve, reject) => {
        console.log('📥 Loading Firebase SDK scripts...');
        
        const scripts = [
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js'
        ];
        
        let loaded = 0;
        let errored = false;
        
        scripts.forEach(src => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                loaded++;
                console.log(`✅ Loaded: ${src}`);
                if (loaded === scripts.length && !errored) {
                    console.log('✅ All Firebase SDK scripts loaded');
                    resolve();
                }
            };
            script.onerror = (error) => {
                console.error(`❌ Failed to load: ${src}`, error);
                errored = true;
                reject(new Error(`Failed to load Firebase SDK: ${src}`));
            };
            document.head.appendChild(script);
        });
        
        // Timeout after 30 seconds
        setTimeout(() => {
            if (loaded < scripts.length && !errored) {
                errored = true;
                reject(new Error('Firebase SDK loading timeout'));
            }
        }, 30000);
    });
}

// Export for use in other files
window.firebaseConfig = {
    initialize: initializeFirebase,
    isInitialized: () => firebaseInitialized,
    getFirebase: () => firebase
};