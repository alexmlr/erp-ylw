
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { loggerService } from '../../services/loggerService';
import styles from './Maintenance.module.css';

interface Category {
    id: string;
    name: string;
    created_at: string;
}

export const CategoriesPage: React.FC = () => {
    // const { profile } = useAuth(); // Unused, handled by route protection
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('maintenance_categories')
                .select('*')
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (err: any) {
            setError('Erro ao carregar categorias.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory.trim()) return;

        try {
            const { error } = await supabase
                .from('maintenance_categories')
                .insert([{ name: newCategory.trim() }]);

            if (error) throw error;

            await loggerService.logAction({
                action: 'Criou Categoria',
                entity: 'Categoria',
                details: { name: newCategory }
            });

            setNewCategory('');
            fetchCategories();
        } catch (err: any) {
            console.error(err);
            setError('Erro ao criar categoria.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta categoria?')) return;

        try {
            // Check usage first
            const { count, error: countError } = await supabase
                .from('maintenance_orders')
                .select('*', { count: 'exact', head: true })
                .eq('category_id', id);

            if (countError) throw countError;
            if (count && count > 0) {
                alert('Não é possível excluir: existem ordens de serviço vinculadas a esta categoria.');
                return;
            }

            const { error } = await supabase
                .from('maintenance_categories')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await loggerService.logAction({
                action: 'Excluiu Categoria',
                entity: 'Categoria',
                entity_id: id
            });

            fetchCategories();
        } catch (err: any) {
            console.error(err);
            setError('Erro ao excluir categoria. Ela pode estar em uso.');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Categorias de Manutenção</h1>
            </div>

            <div className={styles.card}>
                <form onSubmit={handleAdd} className={styles.inputGroup}>
                    <div className="flex-1">
                        <label className={styles.formLabel}>
                            Nova Categoria
                        </label>
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className={styles.input}
                            placeholder="Ex: Elétrica, Hidráulica..."
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!newCategory.trim()}
                        className={styles.primaryButton}
                    >
                        <Plus size={20} />
                        Adicionar
                    </button>
                </form>
            </div>

            {error && (
                <div className={styles.errorMessage}>
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.th}>Nome</th>
                            <th className={styles.th} style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={2} className="p-4 text-center">Carregando...</td></tr>
                        ) : categories.length === 0 ? (
                            <tr><td colSpan={2} className="p-4 text-center text-gray-500">Nenhuma categoria cadastrada.</td></tr>
                        ) : (
                            categories.map((cat) => (
                                <tr key={cat.id} className={styles.tr}>
                                    <td className={styles.td}>{cat.name}</td>
                                    <td className={styles.td} style={{ textAlign: 'right' }}>
                                        <button
                                            onClick={() => handleDelete(cat.id)}
                                            className={styles.deleteButton}
                                            title="Excluir"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
