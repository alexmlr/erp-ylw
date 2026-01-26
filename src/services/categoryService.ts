import { supabase } from '../lib/supabase';
import type { Category } from '../types';

export const categoryService = {
    async getCategories() {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) throw error;
        return data as Category[];
    },

    async createCategory(name: string) {
        const { data, error } = await supabase
            .from('categories')
            .insert([{ name }])
            .select()
            .single();

        if (error) throw error;
        return data as Category;
    },

    async deleteCategory(id: string) {
        // Check for products first (redundant if DB has foreign keys preventing delete, but good for UI feedback)
        const { count, error: checkError } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', id);

        if (checkError) throw checkError;
        if (count && count > 0) {
            throw new Error('Não é possível excluir uma categoria que possui produtos vinculados.');
        }

        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
