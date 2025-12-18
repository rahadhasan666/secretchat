class NotificationSystem {
    constructor() {
        this.messaging = null;
        this.permission = null;
        this.currentToken = null;
        this.swRegistration = null;
        this.notificationClickHandler = null;
    }

    async initialize() {
        try {
            await window.firebaseConfig.initialize();
            
            // Check if browser supports notifications
            if (!('Notification' in window)) {
                console.warn('This browser does not support notifications');
                return false;
            }
            
            // Check if Firebase Messaging is supported
            if (!firebase.messaging.isSupported()) {
                console.warn('Firebase Messaging is not supported in this browser');
                return false;
            }
            
            this.messaging = firebase.messaging();
            this.permission = Notification.permission;
            
            // Register service worker
            await this.registerServiceWorker();
            
            // Request permission
            await this.requestPermission();
            
            // Get FCM token
            await this.getToken();
            
            // Setup message handlers
            this.setupMessageHandlers();
            
            console.log('Notification system initialized');
            return true;
            
        } catch (error) {
            console.error('Notification system initialization failed:', error);
            return false;
        }
    }

    async registerServiceWorker() {
        try {
            if ('serviceWorker' in navigator) {
                this.swRegistration = await navigator.serviceWorker.register('service-worker.js');
                console.log('Service Worker registered');
                
                // Use service worker scope for messaging
                this.messaging.useServiceWorker(this.swRegistration);
            }
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            throw error;
        }
    }

    async requestPermission() {
        try {
            if (this.permission === 'default') {
                const permission = await Notification.requestPermission();
                this.permission = permission;
                
                if (permission === 'granted') {
                    console.log('Notification permission granted.');
                    return true;
                } else {
                    console.log('Notification permission denied.');
                    return false;
                }
            }
            
            return this.permission === 'granted';
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }

    async getToken() {
        try {
            if (!this.messaging || this.permission !== 'granted') {
                return null;
            }
            
            // Get the saved config
            const savedConfig = JSON.parse(localStorage.getItem('firebaseConfig') || '{}');
            
            // Check if VAPID key exists
            if (!savedConfig.vapidKey) {
                console.warn('VAPID key not configured. Notifications may not work.');
                return null;
            }
            
            // Get FCM token
            this.currentToken = await this.messaging.getToken({
                vapidKey: savedConfig.vapidKey
            });
            
            if (this.currentToken) {
                console.log('FCM Token:', this.currentToken);
                await this.saveTokenToFirestore(this.currentToken);
                return this.currentToken;
            } else {
                console.log('No registration token available.');
                return null;
            }
        } catch (error) {
            console.error('Error getting FCM token:', error);
            return null;
        }
    }

    async saveTokenToFirestore(token) {
        try {
            const currentUser = window.authSystem?.currentUser;
            if (!currentUser) return;
            
            await window.authSystem.db.collection('users')
                .doc(currentUser.uid)
                .update({
                    fcmToken: token,
                    notificationEnabled: true
                });
            
            console.log('FCM token saved to Firestore');
        } catch (error) {
            console.error('Error saving token to Firestore:', error);
        }
    }

    async deleteToken() {
        try {
            if (this.currentToken && this.messaging) {
                await this.messaging.deleteToken();
                this.currentToken = null;
                
                // Remove from Firestore
                const currentUser = window.authSystem?.currentUser;
                if (currentUser) {
                    await window.authSystem.db.collection('users')
                        .doc(currentUser.uid)
                        .update({
                            fcmToken: null,
                            notificationEnabled: false
                        });
                }
                
                console.log('FCM token deleted');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting FCM token:', error);
            return false;
        }
    }

    setupMessageHandlers() {
        if (!this.messaging) return;

        // Handle foreground messages
        this.messaging.onMessage((payload) => {
            console.log('Foreground message received:', payload);
            
            // Show notification
            this.showNotification(payload);
            
            // Play notification sound
            this.playNotificationSound();
            
            // Update UI if chat is open
            this.handleMessagePayload(payload);
        });

        // Handle token refresh
        this.messaging.onTokenRefresh(async () => {
            console.log('FCM token refreshed');
            await this.getToken();
        });

        // Handle notification clicks
        this.notificationClickHandler = (event) => {
            event.notification.close();
            
            const payload = event.notification.data || event.data;
            if (payload && payload.click_action) {
                window.open(payload.click_action, '_blank');
            }
        };

        // Add click listener for service worker notifications
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
                    this.notificationClickHandler(event.data);
                }
            });
        }
    }

    showNotification(payload) {
        const { title, body, icon, data } = payload.notification || payload;
        
        const notificationOptions = {
            body: body || 'New message',
            icon: icon || '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            timestamp: Date.now(),
            data: data || payload.data,
            vibrate: [200, 100, 200],
            tag: 'dark-world-chat',
            renotify: true,
            silent: false
        };
        
        // Show notification
        if (this.permission === 'granted') {
            const notification = new Notification(title || 'Dark World Chat', notificationOptions);
            
            notification.onclick = (event) => {
                event.preventDefault();
                window.focus();
                notification.close();
                
                // Handle notification click
                if (data && data.chatId) {
                    this.handleNotificationClick(data);
                }
            };
        }
    }

    handleMessagePayload(payload) {
        const { data } = payload;
        
        if (!data) return;
        
        // Dispatch custom event for UI updates
        const event = new CustomEvent('newNotification', {
            detail: {
                type: data.type || 'message',
                senderId: data.senderId,
                chatId: data.chatId,
                message: data.message,
                timestamp: new Date().toISOString()
            }
        });
        
        window.dispatchEvent(event);
    }

    handleNotificationClick(data) {
        // Focus window and navigate to chat
        if (window.location.pathname.includes('chat-dashboard.html')) {
            // If already in chat dashboard, open specific chat
            window.dispatchEvent(new CustomEvent('openChat', {
                detail: { chatId: data.chatId }
            }));
        } else {
            // Navigate to chat dashboard
            window.location.href = `chat-dashboard.html?chat=${data.chatId}`;
        }
    }

    playNotificationSound() {
        try {
            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3');
            audio.volume = 0.3;
            audio.play().catch(e => console.log('Audio play failed:', e));
        } catch (error) {
            console.error('Error playing notification sound:', error);
        }
    }

    // Send notification to user
    async sendNotificationToUser(userId, title, body, data = {}) {
        try {
            // Get user's FCM token
            const userDoc = await window.authSystem.db.collection('users')
                .doc(userId)
                .get();
            
            if (!userDoc.exists) return false;
            
            const userData = userDoc.data();
            const fcmToken = userData.fcmToken;
            
            if (!fcmToken) return false;
            
            // In a real implementation, you would use Cloud Functions or your backend
            // to send notifications. For now, we'll log it.
            console.log('Would send notification:', {
                to: fcmToken,
                notification: { title, body },
                data
            });
            
            return true;
        } catch (error) {
            console.error('Error sending notification:', error);
            return false;
        }
    }

    // Cleanup
    cleanup() {
        if (this.notificationClickHandler) {
            navigator.serviceWorker.removeEventListener('message', this.notificationClickHandler);
        }
    }
}

// Initialize notification system globally
window.notificationSystem = new NotificationSystem();