import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';

export const quoteNotificationService = {
    /**
     * Notify all 'management' (Gestão) users when a new quote is created by an 'administrative' user.
     * @param authorName Name of the user creating the quote
     */
    async notifyNewQuote(authorName: string) {
        try {
            // Fetch users with role 'management'
            const { data: managementUsers, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'manager'); // Assuming 'manager' key maps to 'Gestão' group based on context

            if (error) {
                console.error('Error fetching management users for notification:', error);
                return;
            }

            if (managementUsers) {
                for (const manager of managementUsers) {
                    await notificationService.createNotification({
                        user_id: manager.id,
                        type: 'quote',
                        title: 'Nova Cotação',
                        message: `Nova cotação criada por ${authorName}.`,
                        link: '/purchases/quotes' // Future route
                    });
                }
            }
        } catch (error) {
            console.error('Error in notifyNewQuote:', error);
        }
    },

    /**
     * Notify all 'management' users AND the quote author when status changes.
     * @param quoteId ID of the quote
     * @param newStatus New status string
     * @param authorId User ID of the quote creator (Administrative user)
     */
    async notifyQuoteStatusChange(quoteId: string, newStatus: string, authorId: string) {
        try {
            // Fetch users with role 'management'
            const { data: managementUsers, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'manager');

            if (error) {
                console.error('Error fetching management users:', error);
            }

            const recipients = new Set<string>();

            // Add managers
            if (managementUsers) {
                managementUsers.forEach(u => recipients.add(u.id));
            }

            // Add author
            if (authorId) {
                recipients.add(authorId);
            }

            for (const userId of recipients) {
                await notificationService.createNotification({
                    user_id: userId,
                    type: 'quote',
                    title: 'Atualização de Cotação',
                    message: `O status da cotação #${quoteId} foi alterado para ${newStatus}.`,
                    link: `/purchases/quotes/${quoteId}` // Future route
                });
            }

        } catch (error) {
            console.error('Error in notifyQuoteStatusChange:', error);
        }
    }
};
