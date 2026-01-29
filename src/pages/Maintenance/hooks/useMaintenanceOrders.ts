import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export interface MaintenanceOrder {
    id: string;
    code: number;
    description: string;
    status: 'Rascunho' | 'Aberto' | 'Pendente' | 'Concluído';
    priority: 'Normal' | 'Urgente';
    service_date: string;
    created_at: string;
    unit: { name: string };
    category: { name: string };
    type: { name: string };
    profile: { full_name: string };
}

export function useMaintenanceOrders(userId?: string) {
    const [orders, setOrders] = useState<MaintenanceOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('maintenance_orders')
                .select(`
                    id,
                    code,
                    description,
                    status,
                    priority,
                    service_date,
                    created_at,
                    unit:units(name),
                    category:maintenance_categories(name),
                    type:maintenance_types(name),
                    profile:profiles(full_name)
                `)
                .order('created_at', { ascending: false });

            // If userId is provided, filter by it (Commercial view)
            // Otherwise fetch all (Management view)
            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query;

            if (error) throw error;
            setOrders(data as any[] || []);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error fetching maintenance orders:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    return { orders, loading, fetchOrders, lastUpdated };
}
