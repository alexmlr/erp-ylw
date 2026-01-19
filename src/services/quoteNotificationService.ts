import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';

export const quoteNotificationService = {
    /**
     * Notify all 'management' (Gestão) users when a new quote is created by an 'administrative' user.
     * @param info object containing quoteId and authorName
     */
    async notifyNewQuote(info: { quoteId: string, authorName: string }) {
        try {
            // Fetch users with role 'manager' OR 'admin' OR 'Gestão' to be safe
            const { data: managementUsers, error } = await supabase
                .from('profiles')
                .select('id, role')
                .in('role', ['manager', 'admin', 'gestao', 'Gestão', 'Gestor']);

            if (error) {
                console.error('Error fetching management users for notification:', error);
                return;
            }

            console.log('DEBUG: Found management users:', managementUsers);

            if (managementUsers) {
                for (const manager of managementUsers) {
                    await notificationService.createNotification({
                        user_id: manager.id,
                        type: 'quote',
                        title: 'Nova Cotação',
                        message: `Nova cotação recebida para análise. Autor: ${info.authorName}.`,
                        link: `/purchases/quotations/${info.quoteId}`
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
     * @param displayId Display ID (formatted)
     * @param newStatus New status string
     * @param authorId User ID of the quote creator (Administrative user)
     */
    async notifyQuoteStatusChange(quoteId: string, displayId: string | number, newStatus: string, authorId: string) {
        try {
            // Fetch users with role 'manager'
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

            let message = `Cotação #${String(displayId).padStart(6, '0')} atualizada para ${newStatus}.`;
            if (newStatus === 'negotiation') message = `Cotação #${String(displayId).padStart(6, '0')} retornou para negociação.`;
            if (newStatus === 'approved') message = `Cotação #${String(displayId).padStart(6, '0')} aprovada para compra.`;
            if (newStatus === 'rejected') message = `Cotação #${String(displayId).padStart(6, '0')} recusada.`;

            for (const userId of recipients) {
                await notificationService.createNotification({
                    user_id: userId,
                    type: 'quote',
                    title: 'Atualização de Cotação',
                    message: message,
                    link: `/purchases/quotations/${quoteId}`
                });
            }

        } catch (error) {
            console.error('Error in notifyQuoteStatusChange:', error);
        }
    }
};
