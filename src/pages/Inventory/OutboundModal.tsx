import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Inventory.module.css';
import { loggerService } from '../../services/loggerService';

interface OutboundModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface OutboundItem {
    product_id: string;
    product_name: string;
    quantity: number;
    available_quantity: number;
}

export const OutboundModal: React.FC<OutboundModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { profile } = useAuth();
    const [products, setProducts] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [items, setItems] = useState<OutboundItem[]>([]);
    const [selectedUnit, setSelectedUnit] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Add Item State
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (isOpen) {
            fetchData();
            resetForm();
        }
    }, [isOpen]);

    const resetForm = () => {
        setItems([]);
        setSelectedUnit('');
        setDate(new Date().toISOString().split('T')[0]);
        setSelectedProduct('');
        setQuantity(1);
    };

    const fetchData = async () => {
        const { data: pData } = await supabase.from('products').select('id, name, quantity').order('name');
        const { data: uData } = await supabase.from('units').select('id, name').eq('active', true).order('name');
        setProducts(pData || []);
        setUnits(uData || []);
    };

    const handleAddItem = () => {
        if (!selectedProduct || quantity <= 0) return;
        const prod = products.find(p => p.id === selectedProduct);
        if (!prod) return;

        // Check if item already exists in list to validate total quantity
        const existingItem = items.find(i => i.product_id === selectedProduct);
        const totalQty = (existingItem?.quantity || 0) + quantity;

        if (totalQty > prod.quantity) {
            alert(`Estoque insuficiente! Disponível: ${prod.quantity}`);
            return;
        }

        if (existingItem) {
            setItems(prev => prev.map(i =>
                i.product_id === selectedProduct ? { ...i, quantity: i.quantity + quantity } : i
            ));
        } else {
            setItems(prev => [...prev, {
                product_id: prod.id,
                product_name: prod.name,
                quantity,
                available_quantity: prod.quantity
            }]);
        }

        setSelectedProduct('');
        setQuantity(1);
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Process all items
            for (const item of items) {
                // Verify stock again just in case
                const { data: prod } = await supabase.from('products').select('quantity').eq('id', item.product_id).single();
                if (!prod || prod.quantity < item.quantity) {
                    throw new Error(`Estoque insuficiente para ${item.product_name}`);
                }

                // 1. Record Movement
                const { error: moveError } = await supabase.from('inventory_movements').insert([{
                    product_id: item.product_id,
                    type: 'OUT',
                    quantity: item.quantity,
                    unit_id: selectedUnit,
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
                const { error: updateError } = await supabase
                    .from('products')
                    .update({ quantity: prod.quantity - item.quantity })
                    .eq('id', item.product_id);

                if (updateError) throw updateError;
            }

            // Log Action
            await loggerService.logAction({
                action: 'Saída de Inventário',
                entity: 'Inventário',
                details: {
                    items_count: items.length,
                    unit_id: selectedUnit,
                    date: date,
                    items: items.map(i => ({ name: i.product_name, quantity: i.quantity }))
                }
            });

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Erro ao registrar saída.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Retirada de Material</h2>
                    <button onClick={onClose} className={styles.closeButton}><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-1">Unidade de Destino</label>
                            <select
                                required
                                className={styles.select}
                                value={selectedUnit}
                                onChange={e => setSelectedUnit(e.target.value)}
                            >
                                <option value="">Selecione...</option>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div className="w-1/3">
                            <label className="block text-sm font-medium mb-1">Data</label>
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
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} (Disp: {p.quantity})
                                        </option>
                                    ))}
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
                            Confirmar Saída
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
