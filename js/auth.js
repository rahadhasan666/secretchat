// ==================== WORKING AUTH SYSTEM ====================
// File: js/auth.js
// ============================================================

class AuthSystem {
    constructor() {
        this.db = null;
        this.auth = null;
        this.currentUser = null;
        this.initialized = false;
    }

    // Initialize Firebase services
    async initialize() {
        console.log('🔑 AuthSystem: Initializing...');
        
        try {
            // Step 1: Make sure Firebase is loaded
            if (typeof firebase === 'undefined') {
                console.error('❌ Firebase SDK not loaded');
                throw new Error('Firebase not loaded. Please refresh page.');
            }
            
            // Step 2: Initialize Firebase app
            console.log('🔧 Initializing Firebase app...');
            
            // Check if Firebase app exists, if not create it
            if (!firebase.apps.length) {
                console.error('❌ No Firebase app found');
                throw new Error('Firebase app not initialized');
            }
            
            // Get Firebase app
            const firebaseApp = firebase.app();
            console.log('✅ Firebase app:', firebaseApp.name);
            
            // Step 3: Get Firebase services
            console.log('🔧 Getting Firebase services...');
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            if (!this.auth) {
                console.error('❌ Firebase Auth not available');
                throw new Error('Firebase Authentication service not available');
            }
            
            if (!this.db) {
                console.error('❌ Firebase Firestore not available');
                throw new Error('Firebase Firestore service not available');
            }
            
            console.log('✅ Firebase Auth:', typeof this.auth);
            console.log('✅ Firebase Firestore:', typeof this.db);
            
            // Step 4: Setup auth state listener
            console.log('🔧 Setting up auth state listener...');
            this.setupAuthListener();
            
            this.initialized = true;
            console.log('✅ AuthSystem initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ AuthSystem initialization failed:', error);
            this.initialized = false;
            throw new Error('Authentication system error: ' + error.message);
        }
    }
    
    // Setup auth state listener
    setupAuthListener() {
        this.auth.onAuthStateChanged((user) => {
            console.log('👤 Auth state changed:', user ? 'User logged in' : 'No user');
            this.currentUser = user;
            
            // Dispatch event for other parts of the app
            window.dispatchEvent(new CustomEvent('authStateChanged', {
                detail: { user: user }
            }));
        }, (error) => {
            console.error('❌ Auth state listener error:', error);
        });
    }
    
    // Normal Login - FIXED VERSION
    async normalLogin(email, password) {
        console.log('🔐 Login attempt for:', email);
        
        try {
            // Step 1: Validate inputs
            if (!email || !password) {
                throw new Error('Email and password are required');
            }
            
            // Step 2: Make sure auth is available
            if (!this.auth) {
                console.log('🔄 Auth not initialized, initializing now...');
                await this.initialize();
                
                if (!this.auth) {
                    throw new Error('Authentication service not available');
                }
            }
            
            // Step 3: Sign in with email and password
            console.log('🔑 Calling signInWithEmailAndPassword...');
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            
            console.log('✅ Login successful for:', userCredential.user.email);
            
            // Step 4: Update online status in Firestore
            await this.updateUserOnlineStatus(userCredential.user.uid, true);
            
            return {
                success: true,
                user: userCredential.user,
                message: 'Login successful'
            };
            
        } catch (error) {
            console.error('❌ Login error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            // Provide user-friendly error messages
            let errorMessage = 'Login failed. ';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email address.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password. Please try again.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address format.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'This account has been disabled.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed attempts. Please try again later.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your internet connection.';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'Email/password login is not enabled for this project.';
                    break;
                default:
                    if (error.message.includes('signInWithEmailAndPassword')) {
                        errorMessage = 'Authentication service error. Please refresh the page.';
                    } else {
                        errorMessage += error.message;
                    }
            }
            
            throw new Error(errorMessage);
        }
    }
    
    // Update user online status
    async updateUserOnlineStatus(userId, isOnline) {
        try {
            if (!this.db) {
                console.warn('⚠️ Firestore not available for updating online status');
                return;
            }
            
            await this.db.collection('users').doc(userId).update({
                onlineStatus: isOnline,
                lastSeen: isOnline ? null : firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ Online status updated:', isOnline ? 'Online' : 'Offline');
        } catch (error) {
            console.error('❌ Error updating online status:', error);
        }
    }
    
    // Create User Account
    async createUserAccount(userData) {
        console.log('📝 Creating account for:', userData.email);
        
        try {
            // Step 1: Validate inputs
            if (!userData.email || !userData.password || !userData.name || !userData.username) {
                throw new Error('All required fields must be filled');
            }
            
            // Step 2: Make sure auth is available
            if (!this.auth) {
                console.log('🔄 Auth not initialized, initializing now...');
                await this.initialize();
            }
            
            // Step 3: Create user in Firebase Authentication
            console.log('🔐 Creating Firebase auth user...');
            const userCredential = await this.auth.createUserWithEmailAndPassword(
                userData.email,
                userData.password
            );
            
            console.log('✅ Firebase user created:', userCredential.user.uid);
            
            // Step 4: Create user profile in Firestore
            console.log('💾 Saving user profile to Firestore...');
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
            
            // Step 5: Send email verification
            console.log('📧 Sending email verification...');
            await userCredential.user.sendEmailVerification();
            
            console.log('✅ Account creation complete');
            
            return {
                success: true,
                user: userCredential.user,
                message: 'Account created successfully! Please verify your email.'
            };
            
        } catch (error) {
            console.error('❌ Account creation error:', error);
            
            let errorMessage = 'Failed to create account. ';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Email address is already in use.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address format.';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'Email/password accounts are not enabled.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password is too weak. Use at least 6 characters.';
                    break;
                default:
                    errorMessage += error.message;
            }
            
            throw new Error(errorMessage);
        }
    }
    
    // Get user profile
    async getUserProfile(uid) {
        try {
            if (!this.db) {
                console.warn('⚠️ Firestore not available');
                return null;
            }
            
            const doc = await this.db.collection('users').doc(uid).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('❌ Error getting user profile:', error);
            return null;
        }
    }
    
    // Logout
    async logout() {
        try {
            if (!this.auth) {
                console.warn('⚠️ Auth not available for logout');
                return false;
            }
            
            // Update online status before logout
            if (this.currentUser) {
                await this.updateUserOnlineStatus(this.currentUser.uid, false);
            }
            
            await this.auth.signOut();
            this.currentUser = null;
            
            console.log('✅ Logout successful');
            return true;
        } catch (error) {
            console.error('❌ Logout error:', error);
            throw error;
        }
    }
    
    // Check if initialized
    isInitialized() {
        return this.initialized && this.auth !== null && this.db !== null;
    }
}

// Create and export global instance
console.log('🔄 Creating AuthSystem instance...');
window.authSystem = new AuthSystem();
console.log('✅ AuthSystem instance created');
