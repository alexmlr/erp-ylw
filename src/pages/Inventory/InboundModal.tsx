import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Inventory.module.css';
import { loggerService } from '../../services/loggerService';

interface InboundModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface InboundItem {
    product_id: string;
    product_name: string;
    quantity: number;
}

export const InboundModal: React.FC<InboundModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { profile } = useAuth();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [items, setItems] = useState<InboundItem[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Add Item State
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
            resetForm();
        }
    }, [isOpen]);

    const resetForm = () => {
        setItems([]);
        setDate(new Date().toISOString().split('T')[0]);
        setSelectedProduct('');
        setQuantity(1);
    };

    const fetchProducts = async () => {
        const { data } = await supabase.from('products').select('id, name').order('name');
        setProducts(data || []);
    };

    const handleAddItem = () => {
        if (!selectedProduct || quantity <= 0) return;
        const prod = products.find(p => p.id === selectedProduct);
        if (!prod) return;

        setItems(prev => [...prev, {
            product_id: prod.id,
            product_name: prod.name,
            quantity
        }]);

        setSelectedProduct('');
        setQuantity(1);
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) {
            alert('Adicione pelo menos um item.');
            return;
        }

        setLoading(true);
        try {
            // Process all items
            for (const item of items) {
                // 1. Record Movement
                const { error: moveError } = await supabase.from('inventory_movements').insert([{
                    product_id: item.product_id,
                    type: 'IN',
                    quantity: item.quantity,
                    user_id: profile?.id,
                    movement_date: (() => {
                        const selectedDate = new Date(date);
                        const today = new Date();
                        const isToday = selectedDate.toISOString().split('T')[0] === today.toISOString().split('T')[0];

                        if (isToday) {
                            return new Date().toISOString();
                        } else {
                            const [year, month, day] = date.split('-').map(Number);
                            return new Date(year, month - 1, day, 12, 0, 0).toISOString();
                        }
                    })()
                }]);
                if (moveError) throw moveError;

                // 2. Update Product Stock
                const { data: prod } = await supabase.from('products').select('quantity').eq('id', item.product_id).single();
                const currentQty = prod?.quantity || 0;

                const { error: updateError } = await supabase
                    .from('products')
                    .update({ quantity: currentQty + item.quantity })
                    .eq('id', item.product_id);

                if (updateError) throw updateError;
            }

            // Log Action
            await loggerService.logAction({
                action: 'Entrada de Inventário',
                entity: 'Inventário',
                details: {
                    items_count: items.length,
                    date: date,
                    items: items.map(i => ({ name: i.product_name, quantity: i.quantity }))
                }
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao registrar entrada.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Entrada de Material</h2>
                    <button onClick={onClose} className={styles.closeButton}><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    {/* Date Selection */}
                    <div className={styles.formGroup}>
                        <label>Data da Entrada</label>
                        <div className="relative">
                            <input
                                type="date"
                                required
                                className={styles.input}
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Add Item Section */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium mb-1">Produto</label>
                                <select
                                    className={styles.select}
                                    value={selectedProduct}
                                    onChange={e => setSelectedProduct(e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="block text-sm font-medium mb-1">Qtd</label>
                                <input
                                    type="number"
                                    min="1"
                                    className={styles.input}
                                    value={quantity}
                                    onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className={styles.secondaryButton}
                                disabled={!selectedProduct}
                            >
                                Adicionar
                            </button>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className={styles.tableContainer} style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table className={styles.itemsTable}>
                            <thead>
                                <tr>
                                    <th>Produto</th>
                                    <th>Qtd</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="text-center py-4 text-gray-500">
                                            Nenhum item adicionado.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.product_name}</td>
                                            <td>{item.quantity}</td>
                                            <td className="text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(idx)}
                                                    className={styles.removeItemBtn}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className={styles.modalActions}>
                        <button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button>
                        <button type="submit" disabled={loading || items.length === 0} className={styles.submitButton}>
                            <Save size={20} />
                            Confirmar Entrada
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
