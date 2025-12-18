// ==================== SIMPLIFIED AUTH SYSTEM ====================
// File: js/auth.js

console.log('🔄 Loading AuthSystem...');

class AuthSystem {
    constructor() {
        console.log('🔧 Creating AuthSystem instance...');
        this.db = null;
        this.auth = null;
        this.currentUser = null;
    }

    async initialize() {
        console.log('🔑 Initializing AuthSystem...');
        
        try {
            // Wait for Firebase to be loaded
            await this.waitForFirebase();
            
            // Get Firebase services
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            if (!this.auth) {
                throw new Error('Firebase Auth not available');
            }
            
            console.log('✅ Firebase Auth obtained:', typeof this.auth);
            console.log('✅ Firebase Firestore obtained:', typeof this.db);
            
            // Setup auth state listener
            this.auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                console.log('👤 Auth state changed:', user ? 'User logged in' : 'No user');
            });
            
            console.log('✅ AuthSystem initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ AuthSystem initialization failed:', error);
            throw new Error('Authentication system error: ' + error.message);
        }
    }
    
    async waitForFirebase() {
        console.log('⏳ Waiting for Firebase...');
        
        // Check if Firebase is loaded
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK not loaded');
        }
        
        // Check if Firebase app is initialized
        if (!firebase.apps.length) {
            throw new Error('Firebase app not initialized');
        }
        
        console.log('✅ Firebase is ready');
        return true;
    }

    async normalLogin(email, password) {
        console.log('🔐 Login attempt for:', email);
        
        try {
            // Make sure auth is initialized
            if (!this.auth) {
                await this.initialize();
            }
            
            // Perform login
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            
            console.log('✅ Login successful for:', userCredential.user.email);
            return {
                success: true,
                user: userCredential.user
            };
            
        } catch (error) {
            console.error('❌ Login error:', error);
            
            let errorMessage = 'Login failed. ';
            if (error.code === 'auth/invalid-api-key') {
                errorMessage = 'Firebase configuration error. Invalid API key.';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password.';
            } else {
                errorMessage += error.message;
            }
            
            throw new Error(errorMessage);
        }
    }

    async createUserAccount(userData) {
        console.log('📝 Creating account for:', userData.email);
        
        try {
            // Make sure auth is initialized
            if (!this.auth) {
                await this.initialize();
            }
            
            // Create user
            const userCredential = await this.auth.createUserWithEmailAndPassword(
                userData.email,
                userData.password
            );
            
            // Save user profile
            await this.db.collection('users').doc(userCredential.user.uid).set({
                uid: userCredential.user.uid,
                name: userData.name,
                username: userData.username.toLowerCase(),
                email: userData.email,
                phone: userData.phone || '',
                address: userData.address || '',
                dob: userData.dob || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                onlineStatus: true,
                profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=6366f1&color=fff`
            });
            
            // Send email verification
            await userCredential.user.sendEmailVerification();
            
            console.log('✅ Account created successfully');
            return {
                success: true,
                user: userCredential.user,
                message: 'Account created! Please verify your email.'
            };
            
        } catch (error) {
            console.error('❌ Account creation error:', error);
            
            let errorMessage = 'Failed to create account. ';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Email already in use.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password too weak (min 6 characters).';
            } else {
                errorMessage += error.message;
            }
            
            throw new Error(errorMessage);
        }
    }

    async logout() {
        try {
            if (this.auth) {
                await this.auth.signOut();
                this.currentUser = null;
                console.log('✅ Logout successful');
            }
            return true;
        } catch (error) {
            console.error('❌ Logout error:', error);
            throw error;
        }
    }
}

// Create global instance
window.authSystem = new AuthSystem();
console.log('✅ AuthSystem created and attached to window');
