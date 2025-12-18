// ==================== CHAT SYSTEM ====================
// File: js/chat.js - SIMPLIFIED VERSION (No Persistence Errors)
// =====================================================

class ChatSystem {
    constructor() {
        this.db = null;
        this.currentChat = null;
        this.currentChatListener = null;
        this.typingListener = null;
        this.globalChatListener = null;
        
        this.chatsCollection = 'chats';
        this.messagesCollection = 'messages';
        this.globalMessagesCollection = 'globalMessages';
        this.usersCollection = 'users';
        
        this.typingTimeout = null;
        this.typingUsers = new Map();
    }

    // Initialize Firebase Firestore - SIMPLE & ERROR-FREE
    async initialize() {
        try {
            console.log('🚀 Initializing Chat System...');
            
            // Initialize Firebase
            await window.firebaseConfig.initialize();
            
            // Get Firestore instance (NO persistence to avoid errors)
            this.db = firebase.firestore();
            
            console.log('✅ Chat system initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Chat system initialization failed:', error);
            
            // Try to recover if Firebase is already initialized
            if (error.message.includes('already') || 
                error.code === 'firestore/already-started') {
                console.log('⚠️ Firebase already started, using existing instance...');
                try {
                    this.db = firebase.firestore();
                    console.log('✅ Recovered using existing Firestore instance');
                    return true;
                } catch (recoveryError) {
                    console.error('❌ Recovery failed:', recoveryError);
                }
            }
            
            throw error;
        }
    }

    // ==================== PRIVATE CHAT FUNCTIONS ====================

    // Create or get chat room between two users
    async getOrCreateChat(userId1, userId2) {
        try {
            console.log('💬 Creating/Getting chat between', userId1, 'and', userId2);
            
            // Sort user IDs to ensure consistent chat room
            const participants = [userId1, userId2].sort();
            const chatId = participants.join('_');
            
            const chatRef = this.db.collection(this.chatsCollection).doc(chatId);
            const chatDoc = await chatRef.get();
            
            if (!chatDoc.exists) {
                console.log('📝 Creating new chat:', chatId);
                
                await chatRef.set({
                    id: chatId,
                    participants: participants,
                    lastMessage: null,
                    lastMessageAt: null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log('✅ New chat created:', chatId);
            } else {
                console.log('✅ Existing chat found:', chatId);
            }
            
            return chatId;
            
        } catch (error) {
            console.error('❌ Error creating/getting chat:', error);
            throw error;
        }
    }

    // Send private message
    async sendMessage(chatId, senderId, content, type = 'text') {
        try {
            console.log('📤 Sending message to chat:', chatId);
            
            const messageRef = this.db.collection(this.chatsCollection)
                .doc(chatId)
                .collection(this.messagesCollection)
                .doc();
            
            const messageData = {
                id: messageRef.id,
                chatId: chatId,
                senderId: senderId,
                content: content,
                type: type,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                readBy: [senderId],
                status: 'sent'
            };
            
            // Save message
            await messageRef.set(messageData);
            console.log('✅ Message sent:', messageRef.id);
            
            // Update chat last message
            await this.db.collection(this.chatsCollection)
                .doc(chatId)
                .update({
                    lastMessage: content,
                    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            return messageData;
            
        } catch (error) {
            console.error('❌ Error sending message:', error);
            throw error;
        }
    }

    // Listen to private chat messages
    listenToChat(chatId, callback) {
        console.log('👂 Setting up listener for chat:', chatId);
        
        // Remove previous listener if exists
        if (this.currentChatListener) {
            console.log('🗑️ Removing previous chat listener');
            this.currentChatListener();
        }
        
        this.currentChat = chatId;
        
        try {
            this.currentChatListener = this.db.collection(this.chatsCollection)
                .doc(chatId)
                .collection(this.messagesCollection)
                .orderBy('timestamp', 'asc')
                .onSnapshot((snapshot) => {
                    console.log('📨 Chat snapshot received:', snapshot.size, 'messages');
                    
                    const messages = [];
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const message = change.doc.data();
                            messages.push(message);
                            
                            // Mark as read if it's not from current user
                            if (message.senderId !== window.authSystem?.currentUser?.uid) {
                                this.markAsRead(chatId, message.id);
                            }
                        }
                    });
                    
                    if (messages.length > 0 && typeof callback === 'function') {
                        callback(messages);
                    }
                }, (error) => {
                    console.error('❌ Chat listener error:', error);
                });
            
            console.log('✅ Chat listener setup complete');
            return this.currentChatListener;
            
        } catch (error) {
            console.error('❌ Error setting up chat listener:', error);
            throw error;
        }
    }

    // Get chat history
    async getChatHistory(chatId, limit = 50) {
        try {
            console.log('📚 Getting chat history for:', chatId);
            
            const snapshot = await this.db.collection(this.chatsCollection)
                .doc(chatId)
                .collection(this.messagesCollection)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();
            
            const messages = snapshot.docs.reverse().map(doc => doc.data());
            console.log('✅ Retrieved', messages.length, 'messages');
            
            return messages;
            
        } catch (error) {
            console.error('❌ Error getting chat history:', error);
            throw error;
        }
    }

    // Get user chats (inbox)
    async getUserChats(userId) {
        try {
            console.log('📨 Getting chats for user:', userId);
            
            const snapshot = await this.db.collection(this.chatsCollection)
                .where('participants', 'array-contains', userId)
                .orderBy('updatedAt', 'desc')
                .get();
            
            const chats = [];
            
            for (const doc of snapshot.docs) {
                const chatData = doc.data();
                const otherUserId = chatData.participants.find(id => id !== userId);
                
                // Get user profile
                let userProfile = null;
                try {
                    const userDoc = await this.db.collection(this.usersCollection)
                        .doc(otherUserId)
                        .get();
                    
                    if (userDoc.exists) {
                        userProfile = userDoc.data();
                    }
                } catch (userError) {
                    console.warn('Could not fetch user profile:', userError);
                }
                
                // Get unread count
                const unreadCount = await this.getUnreadCount(chatData.id, userId);
                
                chats.push({
                    ...chatData,
                    otherUser: userProfile,
                    unreadCount: unreadCount
                });
            }
            
            console.log('✅ Retrieved', chats.length, 'chats');
            return chats;
            
        } catch (error) {
            console.error('❌ Error getting user chats:', error);
            throw error;
        }
    }

    // Get unread message count
    async getUnreadCount(chatId, userId) {
        try {
            const snapshot = await this.db.collection(this.chatsCollection)
                .doc(chatId)
                .collection(this.messagesCollection)
                .where('readBy', 'not-array-contains', userId)
                .where('senderId', '!=', userId)
                .get();
            
            return snapshot.size;
            
        } catch (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }
    }

    // Mark message as read
    async markAsRead(chatId, messageId) {
        try {
            const currentUserId = window.authSystem.currentUser.uid;
            
            await this.db.collection(this.chatsCollection)
                .doc(chatId)
                .collection(this.messagesCollection)
                .doc(messageId)
                .update({
                    readBy: firebase.firestore.FieldValue.arrayUnion(currentUserId),
                    status: 'read'
                });
            
        } catch (error) {
            console.error('❌ Error marking as read:', error);
        }
    }

    // ==================== GLOBAL CHAT FUNCTIONS ====================

    // Send global message
    async sendGlobalMessage(senderId, content, type = 'text') {
        try {
            console.log('🌐 Sending global message');
            
            const messageRef = this.db.collection(this.globalMessagesCollection).doc();
            
            const messageData = {
                id: messageRef.id,
                senderId: senderId,
                content: content,
                type: type,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                readBy: [senderId]
            };
            
            await messageRef.set(messageData);
            console.log('✅ Global message saved:', messageRef.id);
            
            return messageData;
            
        } catch (error) {
            console.error('❌ Error sending global message:', error);
            throw error;
        }
    }

    // Listen to global chat
    listenToGlobalChat(callback) {
        console.log('🌐 Setting up global chat listener');
        
        // Remove previous global listener if exists
        if (this.globalChatListener) {
            console.log('🗑️ Removing previous global chat listener');
            this.globalChatListener();
        }
        
        try {
            this.globalChatListener = this.db.collection(this.globalMessagesCollection)
                .orderBy('timestamp', 'asc')
                .limit(100)
                .onSnapshot((snapshot) => {
                    console.log('🌐 Global chat snapshot:', snapshot.size, 'messages');
                    
                    const messages = [];
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const message = change.doc.data();
                            messages.push(message);
                            
                            // Mark as read if it's not from current user
                            if (message.senderId !== window.authSystem?.currentUser?.uid) {
                                this.markGlobalMessageAsRead(message.id);
                            }
                        }
                    });
                    
                    if (messages.length > 0 && typeof callback === 'function') {
                        callback(messages);
                    }
                }, (error) => {
                    console.error('🌐 Global chat listener error:', error);
                });
            
            console.log('✅ Global chat listener setup complete');
            return this.globalChatListener;
            
        } catch (error) {
            console.error('🌐 Error setting up global chat listener:', error);
            throw error;
        }
    }

    // Get global chat history
    async getGlobalChatHistory(limit = 100) {
        try {
            console.log('📚 Getting global chat history');
            
            const snapshot = await this.db.collection(this.globalMessagesCollection)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();
            
            const messages = snapshot.docs.reverse().map(doc => doc.data());
            console.log('✅ Retrieved', messages.length, 'global messages');
            
            return messages;
            
        } catch (error) {
            console.error('❌ Error getting global chat history:', error);
            throw error;
        }
    }

    // Mark global message as read
    async markGlobalMessageAsRead(messageId) {
        try {
            const currentUserId = window.authSystem.currentUser.uid;
            
            await this.db.collection(this.globalMessagesCollection)
                .doc(messageId)
                .update({
                    readBy: firebase.firestore.FieldValue.arrayUnion(currentUserId)
                });
            
        } catch (error) {
            console.error('Error marking global message as read:', error);
        }
    }

    // ==================== TYPING INDICATOR FUNCTIONS ====================

    // Set typing status
    async setTyping(chatId, userId, isTyping) {
        try {
            const typingRef = this.db.collection(this.chatsCollection)
                .doc(chatId)
                .collection('typing')
                .doc(userId);
            
            if (isTyping) {
                await typingRef.set({
                    userId: userId,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log('⌨️ User is typing:', userId);
                
                // Auto clear after 3 seconds
                if (this.typingTimeout) {
                    clearTimeout(this.typingTimeout);
                }
                
                this.typingTimeout = setTimeout(() => {
                    this.setTyping(chatId, userId, false);
                }, 3000);
                
            } else {
                await typingRef.delete();
                console.log('⌨️ User stopped typing:', userId);
            }
            
        } catch (error) {
            console.error('❌ Error setting typing status:', error);
        }
    }

    // Listen to typing indicators
    listenToTyping(chatId, callback) {
        console.log('⌨️ Setting up typing listener for chat:', chatId);
        
        return this.db.collection(this.chatsCollection)
            .doc(chatId)
            .collection('typing')
            .onSnapshot((snapshot) => {
                const typingUsers = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.userId !== window.authSystem.currentUser.uid) {
                        typingUsers.push(data.userId);
                    }
                });
                
                if (typeof callback === 'function') {
                    callback(typingUsers);
                }
            }, (error) => {
                console.error('❌ Typing listener error:', error);
            });
    }

    // ==================== UTILITY FUNCTIONS ====================

    // Delete message
    async deleteMessage(chatId, messageId) {
        try {
            await this.db.collection(this.chatsCollection)
                .doc(chatId)
                .collection(this.messagesCollection)
                .doc(messageId)
                .delete();
            
            console.log('🗑️ Message deleted:', messageId);
            return true;
            
        } catch (error) {
            console.error('❌ Error deleting message:', error);
            throw error;
        }
    }

    // Search messages in chat
    async searchMessages(chatId, query) {
        try {
            const snapshot = await this.db.collection(this.chatsCollection)
                .doc(chatId)
                .collection(this.messagesCollection)
                .where('content', '>=', query)
                .where('content', '<=', query + '\uf8ff')
                .orderBy('content')
                .limit(20)
                .get();
            
            return snapshot.docs.map(doc => doc.data());
            
        } catch (error) {
            console.error('❌ Error searching messages:', error);
            throw error;
        }
    }

    // Update message
    async updateMessage(chatId, messageId, updates) {
        try {
            await this.db.collection(this.chatsCollection)
                .doc(chatId)
                .collection(this.messagesCollection)
                .doc(messageId)
                .update({
                    ...updates,
                    editedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            console.log('✏️ Message updated:', messageId);
            return true;
            
        } catch (error) {
            console.error('❌ Error updating message:', error);
            throw error;
        }
    }

    // Get chat info
    async getChatInfo(chatId) {
        try {
            const doc = await this.db.collection(this.chatsCollection)
                .doc(chatId)
                .get();
            
            return doc.exists ? doc.data() : null;
            
        } catch (error) {
            console.error('❌ Error getting chat info:', error);
            throw error;
        }
    }

    // Check if chat exists
    async chatExists(chatId) {
        try {
            const doc = await this.db.collection(this.chatsCollection)
                .doc(chatId)
                .get();
            
            return doc.exists;
            
        } catch (error) {
            console.error('❌ Error checking chat existence:', error);
            throw error;
        }
    }

    // Cleanup all listeners
    cleanup() {
        console.log('🧹 Cleaning up chat listeners');
        
        if (this.currentChatListener) {
            this.currentChatListener();
            this.currentChatListener = null;
        }
        
        if (this.globalChatListener) {
            this.globalChatListener();
            this.globalChatListener = null;
        }
        
        if (this.typingListener) {
            this.typingListener();
            this.typingListener = null;
        }
        
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
        }
        
        this.currentChat = null;
        this.typingUsers.clear();
        
        console.log('✅ Chat cleanup complete');
    }

    // Mark all messages as read in chat
    async markAllAsRead(chatId, userId) {
        try {
            const unreadMessages = await this.db.collection(this.chatsCollection)
                .doc(chatId)
                .collection(this.messagesCollection)
                .where('readBy', 'not-array-contains', userId)
                .where('senderId', '!=', userId)
                .get();
            
            const batch = this.db.batch();
            
            unreadMessages.docs.forEach(doc => {
                const messageRef = this.db.collection(this.chatsCollection)
                    .doc(chatId)
                    .collection(this.messagesCollection)
                    .doc(doc.id);
                
                batch.update(messageRef, {
                    readBy: firebase.firestore.FieldValue.arrayUnion(userId),
                    status: 'read'
                });
            });
            
            await batch.commit();
            console.log('✅ Marked all messages as read in chat:', chatId);
            
            return unreadMessages.size;
            
        } catch (error) {
            console.error('❌ Error marking all as read:', error);
            throw error;
        }
    }
}

// Initialize chat system globally
window.chatSystem = new ChatSystem();