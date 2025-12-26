
import { supabase } from '../lib/supabase';
import type { Supplier } from '../types';

export const supplierService = {
    async getSuppliers() {
        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching suppliers:', error);
            throw error;
        }

        return data as Supplier[];
    },

    async getSupplierById(id: string) {
        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching supplier:', error);
            throw error;
        }

        return data as Supplier;
    },

    async createSupplier(supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('suppliers')
            .insert([supplier])
            .select()
            .single();

        if (error) {
            console.error('Error creating supplier:', error);
            throw error;
        }

        return data as Supplier;
    },

    async updateSupplier(id: string, supplier: Partial<Supplier>) {
        const { data, error } = await supabase
            .from('suppliers')
            .update(supplier)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating supplier:', error);
            throw error;
        }

        return data as Supplier;
    },

    async deleteSupplier(id: string) {
        const { error } = await supabase
            .from('suppliers')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting supplier:', error);
            throw error;
        }
    }
};
