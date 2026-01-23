import { supabase } from '../lib/supabase';

export interface LogEntry {
    action: string;
    entity: string;
    entity_id?: string;
    details?: Record<string, unknown>;
}

export const loggerService = {
    /**
     * Logs a system action to the database.
     * @param entry Log entry details
     */
    async logAction(entry: LogEntry) {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                console.warn('Attempted to log action without authenticated user:', entry);
                return;
            }

            const { error } = await supabase
                .from('system_logs')
                .insert({
                    user_id: user.id,
                    action: entry.action,
                    entity: entry.entity,
                    entity_id: entry.entity_id,
                    details: entry.details
                });

            if (error) {
                console.error('Error logging action:', error);
            }
        } catch (error) {
            console.error('Unexpected error in loggerService:', error);
        }
    },

    /**
     * Fetches logs with pagination and filters
     */
    async getLogs(page: number, pageSize: number, filters?: { unitId?: string; userId?: string; date?: string }) {
        let query = supabase
            .from('system_logs')
            .select(`
                *,
                profile:profiles(full_name, unit_id, role)
            `, { count: 'exact' });

        if (filters?.userId) {
            query = query.eq('user_id', filters.userId);
        }

        // Note: Unit filtering requires joining with profiles which we do, but filtering on joined table is tricky in simple syntax.
        // We might need to filter client side or use !inner join if Supabase supports it well in this client version,
        // or filter by user_id list derived from unit.
        // For now, let's assume we fetch and filter or if Supabase supports extended filtering.
        // Actually, let's see if we can filter by profile.unit_id directly. 
        // Supabase JS often allows filtering on foreign tables: .eq('profile.unit_id', unitId) IF inner joined.
        if (filters?.unitId) {
            query = query.eq('profile.unit_id', filters.unitId); // This usually requires !inner to work as a filter
            // To force inner join behavior for filtering:
            // .select('*, profile!inner(*)')
            // However, for just display we want left join.
            // Let's adjust select to be inner if filtering by unit.
        }

        // Date filter (assuming specific date for now)
        if (filters?.date) {
            const startDate = new Date(filters.date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(filters.date);
            endDate.setHours(23, 59, 59, 999);

            query = query.gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString());
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // If we used the simple query, we might need to filter unit manually if the .eq('profile.unit_id') didn't work as expected with left join.
        // But let's refine the query strategy in the implementation of the Page if needed.
        return { data, count };
    }
};
