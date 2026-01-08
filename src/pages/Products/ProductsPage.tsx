import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ProductCard, type Product } from './ProductCard';
import { ProductModal } from './ProductModal';
import styles from './Products.module.css';
import { loggerService } from '../../services/loggerService';

export const ProductsPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name');

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
            // Could add toast notification here
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleCreate = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;

        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Log Delete
            // Warning: Product object isn't fully available here by ID unless we fetch it or pass it.
            // Since we don't have the product name easily unless we pass it to handleDelete, 
            // I'll assume we can pass the name or just log the ID.
            // Better: update handleDelete to take the product object or name.
            // I will update handleDelete call in the map.

            // Wait, I can find the product in the state before deleting it to get the name for the log.
            const product = products.find(p => p.id === id);
            await loggerService.logAction({
                action: 'Excluiu Produto',
                entity: 'Produto',
                entity_id: id,
                details: { name: product?.name }
            });

            fetchProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Erro ao excluir produto.');
        }
    };

    const handleSave = () => {
        fetchProducts();
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Produtos</h1>
                <button
                    onClick={handleCreate}
                    className={styles.primaryButton}
                >
                    <Plus size={20} />
                    Novo Produto
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-lg">Nenhum produto cadastrado.</p>
                    <p className="text-sm mt-2">Clique em "Novo Produto" para começar.</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {products.map(product => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onEdit={handleEdit}
                            onDelete={() => handleDelete(product.id)}
                        />
                    ))}
                </div>
            )}

            <ProductModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                productToEdit={editingProduct}
            />
        </div>
    );
};
