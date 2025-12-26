import { messaging, getToken, onMessage } from '../lib/firebase';
import { supabase } from '../lib/supabase';

export const notificationService = {
  /**
   * Request notification permission and get FCM token
   * @param {string} userId - User ID to associate token with
   * @returns {Promise<string|null>} FCM token or null
   */
  async requestPermission(userId) {
    if (!messaging) {
      console.warn('Firebase messaging not initialized');
      return null;
    }

    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return null;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Notification permission granted');
        
        // Get FCM token
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        const token = await getToken(messaging, { vapidKey });
        
        if (token) {
          console.log('FCM Token:', token);
          
          // Save token to Supabase
          const { error } = await supabase
            .from('users')
            .update({ fcm_token: token })
            .eq('id', userId);
          
          if (error) {
            console.error('Error saving FCM token:', error);
          } else {
            console.log('FCM token saved to database');
          }
          
          return token;
        } else {
          console.warn('No FCM token available');
        }
      } else if (permission === 'denied') {
        console.warn('Notification permission denied');
      } else {
        console.log('Notification permission dismissed');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
    
    return null;
  },

  /**
   * Listen for foreground messages
   * @returns {Promise} Promise that resolves with message payload
   */
  onMessageListener() {
    if (!messaging) {
      return Promise.reject('Firebase messaging not initialized');
    }

    return new Promise((resolve) => {
      onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        resolve(payload);
      });
    });
  },

  /**
   * Send notification to specific users
   * @param {Array<string>} userIds - Array of user IDs
   * @param {Object} notification - Notification data
   */
  async sendToUsers(userIds, notification) {
    try {
      // Get FCM tokens for users
      const { data: users, error } = await supabase
        .from('users')
        .select('fcm_token')
        .in('id', userIds)
        .not('fcm_token', 'is', null);

      if (error) throw error;

      const tokens = users.map(u => u.fcm_token).filter(Boolean);
      
      if (tokens.length === 0) {
        console.warn('No FCM tokens found for users');
        return;
      }

      // Store in pending notifications for backend processing
      const { error: insertError } = await supabase
        .from('pending_fcm_notifications')
        .insert({
          tokens,
          title: notification.title,
          body: notification.body,
          data: notification.data || {}
        });

      if (insertError) throw insertError;

      console.log(`Notification queued for ${tokens.length} users`);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  },

  /**
   * Send notification to users by role
   * @param {Array<string>} roles - Array of user roles
   * @param {Object} notification - Notification data
   */
  async sendToRoles(roles, notification) {
    try {
      // Get FCM tokens for users with specified roles
      const { data: users, error } = await supabase
        .from('users')
        .select('fcm_token, id')
        .in('role', roles)
        .not('fcm_token', 'is', null);

      if (error) throw error;

      const tokens = users.map(u => u.fcm_token).filter(Boolean);
      const userIds = users.map(u => u.id);
      
      if (tokens.length === 0) {
        console.warn('No FCM tokens found for roles:', roles);
        return;
      }

      // Store notification in history for each user
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title: notification.title,
        body: notification.body,
        type: notification.type || 'general',
        data: notification.data || {}
      }));

      await supabase.from('notifications').insert(notifications);

      // Queue for sending
      const { error: insertError } = await supabase
        .from('pending_fcm_notifications')
        .insert({
          tokens,
          title: notification.title,
          body: notification.body,
          data: notification.data || {}
        });

      if (insertError) throw insertError;

      console.log(`Notification queued for ${tokens.length} users with roles:`, roles);
    } catch (error) {
      console.error('Error sending notification to roles:', error);
    }
  },

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   */
  async markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  /**
   * Get unread notification count
   * @param {string} userId - User ID
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount(userId) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  },

  /**
   * Get user notifications
   * @param {string} userId - User ID
   * @param {number} limit - Number of notifications to fetch
   * @returns {Promise<Array>} Notifications
   */
  async getNotifications(userId, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }
};
