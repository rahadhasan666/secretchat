// ==================== AUTHENTICATION SYSTEM ====================
// File: js/auth.js
// Description: Firebase Authentication and User Management
// Author: Dark World Live Chat
// ==============================================================

class AuthSystem {
    constructor() {
        this.db = null;
        this.auth = null;
        this.currentUser = null;
        this.usersCollection = 'users';
        this.userListener = null;
    }

    // Initialize Firebase Authentication
    async initialize() {
        try {
            console.log('🔑 Initializing Auth System...');
            
            // Check if Firebase is available
            if (typeof firebase === 'undefined') {
                console.error('❌ Firebase is not loaded');
                throw new Error('Firebase SDK not loaded. Please check internet connection.');
            }
            
            // Get Firebase services
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            console.log('✅ Firebase services obtained');
            
            // Set auth persistence (optional)
            try {
                await this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
                console.log('✅ Auth persistence set to LOCAL');
            } catch (persistenceError) {
                console.warn('⚠️ Could not set auth persistence:', persistenceError.message);
                // Continue without persistence
            }
            
            // Listen for auth state changes
            this.setupAuthStateListener();
            
            console.log('✅ Auth system initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Auth system initialization failed:', error);
            console.error('Error details:', error.message, error.code, error.stack);
            throw new Error('Authentication system failed to initialize: ' + error.message);
        }
    }
    
    // Setup auth state listener
    setupAuthStateListener() {
        this.auth.onAuthStateChanged((user) => {
            console.log('👤 Auth state changed:', user ? 'User logged in' : 'No user');
            this.currentUser = user;
            
            if (user) {
                console.log('👤 User details:', {
                    uid: user.uid,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    displayName: user.displayName
                });
                
                // Update online status
                this.updateUserOnlineStatus(true);
                
                // Attach user listeners
                this.attachUserListeners();
                
            } else {
                // User signed out
                console.log('👤 User signed out');
                if (this.userListener) {
                    this.userListener();
                }
            }
        }, (error) => {
            console.error('❌ Auth state change error:', error);
        });
    }

    // ==================== USER REGISTRATION ====================

    // Create new user account
    async createUserAccount(userData) {
        try {
            console.log('📝 Creating new user account...');
            
            // Validate required fields
            if (!userData.email || !userData.password || !userData.name || !userData.username) {
                throw new Error('All required fields must be filled');
            }
            
            // Create user in Firebase Authentication
            console.log('🔐 Creating Firebase auth user...');
            const userCredential = await this.auth.createUserWithEmailAndPassword(
                userData.email,
                userData.password
            );

            console.log('✅ Firebase user created:', userCredential.user.uid);

            // Prepare user document for Firestore
            const userDoc = {
                uid: userCredential.user.uid,
                name: userData.name,
                username: userData.username.toLowerCase(),
                email: userData.email,
                phone: userData.phone || null,
                address: userData.address || null,
                dob: userData.dob ? new Date(userData.dob) : null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                onlineStatus: true,
                lastSeen: null,
                fcmToken: null,
                profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=6366f1&color=fff`,
                emailVerified: false
            };

            // Check if username is unique
            console.log('🔍 Checking username uniqueness...');
            const usernameCheck = await this.db.collection(this.usersCollection)
                .where('username', '==', userDoc.username)
                .get();

            if (!usernameCheck.empty) {
                // Delete the created auth user
                await userCredential.user.delete();
                throw new Error('Username already exists. Please choose another.');
            }

            // Save user profile to Firestore
            console.log('💾 Saving user profile to Firestore...');
            await this.db.collection(this.usersCollection)
                .doc(userCredential.user.uid)
                .set(userDoc);

            // Send email verification
            console.log('📧 Sending email verification...');
            await userCredential.user.sendEmailVerification({
                url: window.location.origin + '/account-system.html'
            });

            console.log('✅ Account creation complete');
            
            return {
                success: true,
                user: userCredential.user,
                message: 'Account created successfully! Please verify your email.'
            };

        } catch (error) {
            console.error('❌ Account creation error:', error);
            
            // Provide user-friendly error messages
            let errorMessage = 'Failed to create account. ';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Email already in use. Please use another email.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'Email/password accounts are not enabled.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password is too weak. Use at least 6 characters.';
                    break;
                default:
                    errorMessage += error.message || 'Please try again.';
            }
            
            throw new Error(errorMessage);
        }
    }

    // ==================== USER LOGIN ====================

    // Normal user login
    async normalLogin(email, password) {
        try {
            console.log('🔐 Attempting login for:', email);
            
            // Validate inputs
            if (!email || !password) {
                throw new Error('Email and password are required');
            }
            
            // Sign in with email and password
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            
            console.log('✅ Firebase login successful:', userCredential.user.email);
            
            // Check if email is verified
            if (!userCredential.user.emailVerified) {
                console.warn('⚠️ Email not verified');
                await this.auth.signOut();
                throw new Error('Please verify your email before logging in. Check your inbox.');
            }

            // Update online status
            await this.updateUserOnlineStatus(true);
            
            console.log('🎉 Login process completed successfully');
            
            return {
                success: true,
                user: userCredential.user
            };
            
        } catch (error) {
            console.error('❌ Login error:', error);
            
            // Provide user-friendly error messages
            let errorMessage = 'Login failed. ';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email.';
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
                    errorMessage = 'Email/password login is not enabled.';
                    break;
                default:
                    errorMessage += error.message || 'Please check your credentials.';
            }
            
            throw new Error(errorMessage);
        }
    }

    // ==================== USER MANAGEMENT ====================

    // Update user online status
    async updateUserOnlineStatus(isOnline) {
        if (!this.currentUser) {
            console.warn('⚠️ No current user to update online status');
            return;
        }

        try {
            const updateData = {
                onlineStatus: isOnline,
                lastSeen: isOnline ? null : firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await this.db.collection(this.usersCollection)
                .doc(this.currentUser.uid)
                .update(updateData);
                
            console.log('✅ Online status updated:', isOnline ? 'Online' : 'Offline');
            
        } catch (error) {
            console.error('❌ Error updating online status:', error);
        }
    }

    // Get user profile
    async getUserProfile(uid) {
        try {
            const doc = await this.db.collection(this.usersCollection)
                .doc(uid)
                .get();
            
            return doc.exists ? doc.data() : null;
            
        } catch (error) {
            console.error('❌ Error getting user profile:', error);
            throw error;
        }
    }

    // Get all users (for chat list)
    async getAllUsers() {
        try {
            const snapshot = await this.db.collection(this.usersCollection)
                .where('uid', '!=', this.currentUser?.uid || '')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
        } catch (error) {
            console.error('❌ Error getting users:', error);
            throw error;
        }
    }

    // Search users
    async searchUsers(query) {
        try {
            if (!query || query.length < 2) {
                return [];
            }
            
            const searchTerm = query.toLowerCase();
            
            // Search by username
            const usernameQuery = this.db.collection(this.usersCollection)
                .where('username', '>=', searchTerm)
                .where('username', '<=', searchTerm + '\uf8ff')
                .where('uid', '!=', this.currentUser?.uid || '')
                .limit(10)
                .get();

            // Search by name
            const nameQuery = this.db.collection(this.usersCollection)
                .where('name', '>=', searchTerm)
                .where('name', '<=', searchTerm + '\uf8ff')
                .where('uid', '!=', this.currentUser?.uid || '')
                .limit(10)
                .get();

            const [usernameResults, nameResults] = await Promise.all([usernameQuery, nameQuery]);
            
            const results = new Map();
            
            // Add username results
            usernameResults.docs.forEach(doc => {
                results.set(doc.id, { id: doc.id, ...doc.data() });
            });
            
            // Add name results
            nameResults.docs.forEach(doc => {
                results.set(doc.id, { id: doc.id, ...doc.data() });
            });
            
            return Array.from(results.values());
            
        } catch (error) {
            console.error('❌ Error searching users:', error);
            throw error;
        }
    }

    // Update user profile
    async updateUserProfile(data) {
        if (!this.currentUser) {
            throw new Error('No user logged in');
        }

        try {
            await this.db.collection(this.usersCollection)
                .doc(this.currentUser.uid)
                .update({
                    ...data,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            console.log('✅ User profile updated');
            return true;
            
        } catch (error) {
            console.error('❌ Error updating profile:', error);
            throw error;
        }
    }

    // Logout
    async logout() {
        try {
            console.log('👋 Logging out user...');
            
            // Update online status to offline
            await this.updateUserOnlineStatus(false);
            
            // Sign out from Firebase
            await this.auth.signOut();
            
            // Clear current user
            this.currentUser = null;
            
            // Cleanup listener
            if (this.userListener) {
                this.userListener();
                this.userListener = null;
            }
            
            console.log('✅ Logout successful');
            return true;
            
        } catch (error) {
            console.error('❌ Logout error:', error);
            throw error;
        }
    }

    // ==================== LISTENERS ====================

    // Attach user listeners
    attachUserListeners() {
        if (!this.currentUser || this.userListener) return;

        try {
            this.userListener = this.db.collection(this.usersCollection)
                .doc(this.currentUser.uid)
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        const userData = doc.data();
                        console.log('📊 User profile updated:', userData);
                        
                        // Update current user profile
                        this.currentUser.profile = userData;
                        
                        // Dispatch custom event for UI updates
                        window.dispatchEvent(new CustomEvent('userProfileUpdated', {
                            detail: userData
                        }));
                    }
                }, (error) => {
                    console.error('❌ User listener error:', error);
                });
                
            console.log('✅ User listener attached');
            
        } catch (error) {
            console.error('❌ Error attaching user listener:', error);
        }
    }

    // ==================== PASSWORD RESET ====================

    // Send password reset email
    async sendPasswordResetEmail(email) {
        try {
            await this.auth.sendPasswordResetEmail(email);
            console.log('✅ Password reset email sent');
            return true;
            
        } catch (error) {
            console.error('❌ Password reset error:', error);
            
            let errorMessage = 'Failed to send reset email. ';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                default:
                    errorMessage += error.message || 'Please try again.';
            }
            
            throw new Error(errorMessage);
        }
    }

    // ==================== ACCOUNT MANAGEMENT ====================

    // Delete user account
    async deleteUserAccount(password) {
        if (!this.currentUser) {
            throw new Error('No user logged in');
        }

        try {
            // Re-authenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(
                this.currentUser.email,
                password
            );
            
            await this.currentUser.reauthenticateWithCredential(credential);
            
            // Delete from Firestore
            await this.db.collection(this.usersCollection)
                .doc(this.currentUser.uid)
                .delete();
            
            // Delete from Firebase Auth
            await this.currentUser.delete();
            
            console.log('✅ User account deleted');
            return true;
            
        } catch (error) {
            console.error('❌ Error deleting account:', error);
            throw error;
        }
    }

    // Update email
    async updateEmail(newEmail, password) {
        if (!this.currentUser) {
            throw new Error('No user logged in');
        }

        try {
            // Re-authenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(
                this.currentUser.email,
                password
            );
            
            await this.currentUser.reauthenticateWithCredential(credential);
            
            // Update email
            await this.currentUser.updateEmail(newEmail);
            
            // Send verification email
            await this.currentUser.sendEmailVerification();
            
            // Update email in Firestore
            await this.updateUserProfile({ email: newEmail });
            
            console.log('✅ Email updated');
            return true;
            
        } catch (error) {
            console.error('❌ Error updating email:', error);
            throw error;
        }
    }

    // ==================== CLEANUP ====================

    // Cleanup resources
    cleanup() {
        console.log('🧹 Cleaning up auth system...');
        
        if (this.userListener) {
            this.userListener();
            this.userListener = null;
        }
        
        console.log('✅ Auth system cleanup complete');
    }
}

// Initialize auth system globally
console.log('🔄 Loading AuthSystem class...');
window.authSystem = new AuthSystem();
console.log('✅ AuthSystem class loaded and assigned to window.authSystem');

// Test function for debugging
window.testAuthSystem = async function() {
    console.log('🧪 Testing Auth System...');
    
    try {
        // Check if class is loaded
        if (typeof AuthSystem === 'undefined') {
            console.error('❌ AuthSystem class not defined');
            return false;
        }
        
        console.log('✅ AuthSystem class exists');
        
        // Check if instance is created
        if (!window.authSystem) {
            console.error('❌ window.authSystem is not defined');
            return false;
        }
        
        console.log('✅ window.authSystem exists:', window.authSystem);
        
        // Check if methods exist
        const requiredMethods = ['initialize', 'createUserAccount', 'normalLogin'];
        for (const method of requiredMethods) {
            if (typeof window.authSystem[method] !== 'function') {
                console.error(`❌ Method ${method} is not a function`);
                console.log('Available methods:', Object.keys(window.authSystem));
                return false;
            }
        }
        
        console.log('✅ All required methods exist');
        
        // Try to initialize
        console.log('🔧 Testing initialization...');
        await window.authSystem.initialize();
        console.log('✅ Initialization test passed');
        
        return true;
        
    } catch (error) {
        console.error('❌ Auth system test failed:', error);
        return false;
    }
};