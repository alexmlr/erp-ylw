import { supabase } from '../lib/supabase';

export interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    link?: string;
    created_at: string;
}

export const notificationService = {
    async getNotifications(userId: string) {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }

        return data as Notification[];
    },

    async getUnreadCount(userId: string) {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('Error counting unread notifications:', error);
            // Don't throw, just return 0 to avoid breaking UI
            return 0;
        }

        return count || 0;
    },

    async markAsRead(notificationId: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    },

    async markAllAsRead(userId: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    },

    async createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>) {
        const { error } = await supabase
            .from('notifications')
            .insert([notification]);

        if (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    },

    // Specific helpers can be added here, but keeping it generic is better for now as requested.
};
