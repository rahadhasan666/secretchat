// ==================== SIMPLIFIED AUTH SYSTEM ====================
// File: js/auth.js

class AuthSystem {
    constructor() {
        this.db = null;
        this.auth = null;
        this.currentUser = null;
        this.initialized = false;
    }

    // Initialize - SIMPLE AND RELIABLE
    async initialize() {
        console.log('🔑 Initializing Auth System...');
        
        try {
            // Step 1: Initialize Firebase first
            console.log('Step 1: Initializing Firebase...');
            const firebaseApp = await window.firebaseConfig.initialize();
            
            // Step 2: Get Firebase services
            console.log('Step 2: Getting Firebase services...');
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            if (!this.auth || !this.db) {
                throw new Error('Firebase services not available');
            }
            
            console.log('✅ Firebase Auth:', typeof this.auth);
            console.log('✅ Firebase Firestore:', typeof this.db);
            
            // Step 3: Setup auth state listener
            console.log('Step 3: Setting up auth state listener...');
            this.auth.onAuthStateChanged((user) => {
                console.log('👤 Auth state changed:', user ? 'Logged in' : 'Logged out');
                this.currentUser = user;
            });
            
            this.initialized = true;
            console.log('✅ Auth system initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Auth system initialization failed:', error);
            throw new Error('Authentication failed: ' + error.message);
        }
    }

    // Normal Login
    async normalLogin(email, password) {
        console.log('🔐 Login attempt for:', email);
        
        try {
            // Make sure auth is initialized
            if (!this.auth) {
                await this.initialize();
            }
            
            // Login with Firebase
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            
            console.log('✅ Login successful');
            return {
                success: true,
                user: userCredential.user
            };
            
        } catch (error) {
            console.error('❌ Login error:', error);
            
            // User-friendly error messages
            let message = 'Login failed. ';
            if (error.code === 'auth/user-not-found') {
                message = 'No account found with this email.';
            } else if (error.code === 'auth/wrong-password') {
                message = 'Incorrect password.';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Invalid email format.';
            } else if (error.code === 'auth/network-request-failed') {
                message = 'Network error. Check internet connection.';
            } else {
                message += error.message;
            }
            
            throw new Error(message);
        }
    }

    // Create User Account
    async createUserAccount(userData) {
        console.log('📝 Creating account for:', userData.email);
        
        try {
            // Make sure auth is initialized
            if (!this.auth) {
                await this.initialize();
            }
            
            // Create auth user
            const userCredential = await this.auth.createUserWithEmailAndPassword(
                userData.email,
                userData.password
            );
            
            // Create user profile in Firestore
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
            console.error('❌ Signup error:', error);
            
            let message = 'Signup failed. ';
            if (error.code === 'auth/email-already-in-use') {
                message = 'Email already in use.';
            } else if (error.code === 'auth/weak-password') {
                message = 'Password too weak (minimum 6 characters).';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Invalid email format.';
            } else {
                message += error.message;
            }
            
            throw new Error(message);
        }
    }

    // Get user profile
    async getUserProfile(uid) {
        try {
            const doc = await this.db.collection('users').doc(uid).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Get profile error:', error);
            return null;
        }
    }

    // Logout
    async logout() {
        try {
            await this.auth.signOut();
            this.currentUser = null;
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }
}

// Create global instance
console.log('🔄 Creating AuthSystem instance...');
window.authSystem = new AuthSystem();
console.log('✅ AuthSystem instance created');
