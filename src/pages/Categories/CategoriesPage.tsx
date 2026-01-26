import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Box } from 'lucide-react';
import styles from './Categories.module.css';
import { CategoryModal } from './CategoryModal';
import { categoryService } from '../../services/categoryService';
import { loggerService } from '../../services/loggerService';
import type { Category, Product } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const CategoriesPage: React.FC = () => {
    const { profile } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Permission check: Admin or Manager only for creating/deleting
    const canManage = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'administrative';

    const fetchCategories = async () => {
        try {
            const data = await categoryService.getCategories();
            setCategories(data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProductsForCategory = async (categoryId: string) => {
        try {
            const { data } = await supabase
                .from('products')
                .select('*')
                .eq('category_id', categoryId);
            setCategoryProducts((data as Product[]) || []);
        } catch (error) {
            console.error('Error fetching category products:', error);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleSelectCategory = (cat: Category) => {
        if (selectedCategory?.id === cat.id) {
            setSelectedCategory(null); // Deselect
            setCategoryProducts([]);
        } else {
            setSelectedCategory(cat);
            fetchProductsForCategory(cat.id);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

        try {
            await categoryService.deleteCategory(id);
            await loggerService.logAction({
                action: 'Excluiu Categoria',
                entity: 'Categoria',
                entity_id: id
            });
            fetchCategories();
            if (selectedCategory?.id === id) {
                setSelectedCategory(null);
                setCategoryProducts([]);
            }
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : 'Erro ao excluir categoria');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Categorias de Produtos</h1>
                {canManage && (
                    <button onClick={() => setIsModalOpen(true)} className={styles.primaryButton}>
                        <Plus size={20} />
                        Nova Categoria
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center p-8">Carregando...</div>
            ) : (
                <div className={styles.grid}>
                    {categories.map(cat => (
                        <div
                            key={cat.id}
                            className={`${styles.card} ${selectedCategory?.id === cat.id ? 'ring-2 ring-yellow-500' : ''}`}
                            onClick={() => handleSelectCategory(cat)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="flex items-center gap-3">
                                <Box size={24} className="text-yellow-600" />
                                <span className={styles.cardTitle}>{cat.name}</span>
                            </div>
                            {canManage && (
                                <button
                                    onClick={(e) => handleDelete(e, cat.id)}
                                    className={styles.deleteButton}
                                    title="Excluir Categoria"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {selectedCategory && (
                <div className={styles.productsList}>
                    <h3>Produtos em: {selectedCategory.name}</h3>
                    {categoryProducts.length === 0 ? (
                        <p className="text-gray-500">Nenhum produto nesta categoria.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categoryProducts.map(prod => (
                                <div key={prod.id} className="bg-white p-4 rounded shadow flex justify-between items-center border border-gray-100">
                                    <span className="font-medium text-gray-800">{prod.name}</span>
                                    <span className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">{prod.quantity} {prod.unit}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <CategoryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchCategories}
            />
        </div>
    );
};
