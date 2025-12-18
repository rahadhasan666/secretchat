// ==================== SIMPLIFIED AUTH SYSTEM ====================
// File: js/auth.js

class AuthSystem {
    constructor() {
        this.db = null;
        this.auth = null;
        this.currentUser = null;
    }

    // Initialize - SIMPLIFIED VERSION
    async initialize() {
        console.log('🔑 Initializing Auth System...');
        
        try {
            // Check if Firebase is loaded
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase not loaded. Please refresh the page.');
            }
            
            // Get Firebase services
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            console.log('✅ Firebase services obtained');
            
            // Setup auth state listener
            this.auth.onAuthStateChanged((user) => {
                console.log('👤 Auth state:', user ? 'User logged in' : 'No user');
                this.currentUser = user;
            });
            
            console.log('✅ Auth system initialized');
            return true;
            
        } catch (error) {
            console.error('❌ Auth init error:', error);
            throw new Error('Auth system failed: ' + error.message);
        }
    }

    // Normal Login - SIMPLIFIED
    async normalLogin(email, password) {
        try {
            console.log('🔐 Login attempt for:', email);
            
            // Validate
            if (!email || !password) {
                throw new Error('Email and password required');
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
            let message = 'Login failed: ';
            switch (error.code) {
                case 'auth/user-not-found':
                    message = 'No account found with this email.';
                    break;
                case 'auth/wrong-password':
                    message = 'Incorrect password.';
                    break;
                case 'auth/invalid-email':
                    message = 'Invalid email format.';
                    break;
                case 'auth/network-request-failed':
                    message = 'Network error. Check internet connection.';
                    break;
                default:
                    message += error.message;
            }
            
            throw new Error(message);
        }
    }

    // Create User Account - SIMPLIFIED
    async createUserAccount(userData) {
        try {
            console.log('📝 Creating account for:', userData.email);
            
            // Create auth user
            const userCredential = await this.auth.createUserWithEmailAndPassword(
                userData.email,
                userData.password
            );
            
            // Create user profile in Firestore
            await this.db.collection('users').doc(userCredential.user.uid).set({
                uid: userCredential.user.uid,
                name: userData.name,
                username: userData.username,
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
            
            console.log('✅ Account created');
            return {
                success: true,
                user: userCredential.user,
                message: 'Account created! Please verify your email.'
            };
            
        } catch (error) {
            console.error('❌ Signup error:', error);
            
            let message = 'Signup failed: ';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    message = 'Email already in use.';
                    break;
                case 'auth/weak-password':
                    message = 'Password too weak (min 6 characters).';
                    break;
                default:
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
window.authSystem = new AuthSystem();
console.log('✅ AuthSystem created');
