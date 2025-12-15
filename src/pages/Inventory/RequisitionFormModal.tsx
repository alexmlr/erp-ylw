import React, { useState, useEffect } from 'react';
import { X, Trash2, Loader2, Search, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Inventory.module.css';

interface Product {
    id: string;
    name: string;
    unit: string;
    image_url: string | null;
}

interface RequisitionItem {
    product_id: string;
    quantity: number;
    product_name?: string; // For display
    unit?: string;
    image_url?: string | null;
}

interface RequisitionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    requisitionToEdit?: any | null;
}

const STATUS_OPTIONS = [
    'PENDENTE',
    'EM_SEPARACAO',
    'APROVADO',
    'RECUSADO',
    'ENTREGUE'
];

export const RequisitionFormModal: React.FC<RequisitionFormModalProps> = ({ isOpen, onClose, onSave, requisitionToEdit }) => {
    const { profile, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);

    // Form State
    const [items, setItems] = useState<RequisitionItem[]>([]);
    const [status, setStatus] = useState('PENDENTE');
    const [unitId, setUnitId] = useState('');
    const [units, setUnits] = useState<any[]>([]);

    // New Item State
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    const isReadOnly = requisitionToEdit && requisitionToEdit.status !== 'PENDENTE' && profile?.role === 'user';
    const canChangeStatus = ['admin', 'manager', 'administrative'].includes(profile?.role || '');

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
            fetchUnits();
            if (requisitionToEdit) {
                loadRequisitionDetails();
            } else {
                resetForm();
                // Pre-fill unit from profile if available
                if (profile?.unit_id) {
                    setUnitId(profile.unit_id);
                }
            }
        }
    }, [isOpen, requisitionToEdit, profile]);

    const fetchUnits = async () => {
        try {
            const { data, error } = await supabase
                .from('units')
                .select('id, name')
                .eq('active', true)
                .order('name');
            if (error) throw error;
            setUnits(data || []);
        } catch (error) {
            console.error('Error fetching units:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('id, name, unit, image_url')
                .order('name');
            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const loadRequisitionDetails = async () => {
        if (!requisitionToEdit) return;
        setStatus(requisitionToEdit.status);
        setUnitId(requisitionToEdit.unit_id || '');

        try {
            const { data, error } = await supabase
                .from('requisition_items')
                .select(`
                    quantity,
                    product:products (id, name, unit, image_url)
                `)
                .eq('requisition_id', requisitionToEdit.id);

            if (error) throw error;

            const loadedItems = data.map((item: any) => ({
                product_id: item.product.id,
                quantity: item.quantity,
                product_name: item.product.name,
                unit: item.product.unit,
                image_url: item.product.image_url
            }));
            setItems(loadedItems);
        } catch (error) {
            console.error('Error loading items:', error);
        }
    };

    const resetForm = () => {
        setItems([]);
        setStatus('PENDENTE');
        setSelectedProduct('');
        setQuantity(1);
        setSearchTerm('');
    };

    const handleAddItem = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        setSelectedProduct(productId);
    };

    const confirmAddItem = () => {
        if (!selectedProduct || quantity <= 0) return;
        const product = products.find(p => p.id === selectedProduct);
        if (!product) return;

        setItems(prev => [
            ...prev,
            {
                product_id: product.id,
                quantity: quantity,
                product_name: product.name,
                unit: product.unit,
                image_url: product.image_url
            }
        ]);

        setSelectedProduct('');
        setQuantity(1);
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpdateQuantity = (index: number, newQty: number) => {
        if (newQty < 1) return;
        setItems(prev => {
            const newItems = [...prev];
            newItems[index].quantity = newQty;
            return newItems;
        });
    };

    const handleSubmit = async () => {
        if (items.length === 0) {
            alert('Adicione pelo menos um item.');
            return;
        }

        if (!requisitionToEdit && !user) {
            alert('Usuário não autenticado.');
            return;
        }

        setLoading(true);
        try {
            let reqId = requisitionToEdit?.id;

            if (requisitionToEdit) {
                // Update existing
                if (canChangeStatus && status !== requisitionToEdit.status) {

                    // Inventory Deduction Logic: Check if status is changing to 'ENTREGUE'
                    if (status === 'ENTREGUE' && requisitionToEdit.status !== 'ENTREGUE') {
                        // 1. Verify Stock for ALL items first
                        for (const item of items) {
                            const { data: prodData, error: prodError } = await supabase
                                .from('products')
                                .select('quantity, name')
                                .eq('id', item.product_id)
                                .single();

                            if (prodError || !prodData) {
                                throw new Error(`Erro ao verificar estoque do produto: ${item.product_name}`);
                            }

                            if (prodData.quantity < item.quantity) {
                                throw new Error(`Estoque insuficiente para "${item.product_name}". Disponível: ${prodData.quantity}, Solicitado: ${item.quantity}`);
                            }
                        }

                        // 2. Deduct Stock and Record Movement
                        for (const item of items) {
                            // Fetch product again to be safe (though we just checked)
                            const { data: prodData } = await supabase
                                .from('products')
                                .select('quantity')
                                .eq('id', item.product_id)
                                .single();

                            if (prodData) {
                                // Insert Movement
                                const { error: moveError } = await supabase
                                    .from('inventory_movements')
                                    .insert({
                                        product_id: item.product_id,
                                        type: 'OUT',
                                        quantity: item.quantity,
                                        unit_id: unitId || requisitionToEdit.unit_id || null, // Use current form unit or existing
                                        user_id: profile?.id,
                                        movement_date: new Date().toISOString(),
                                        reason: `Requisição #${requisitionToEdit.id} - Entregue`
                                    });

                                if (moveError) {
                                    console.error('Error logging movement:', moveError);
                                    // We continue despite movement log error to ensure stock is at least updated, or should we throw?
                                    // For now, throwing to be safe and stop process.
                                    throw new Error(`Erro ao registrar movimentação para ${item.product_name}`);
                                }

                                // Update Product Quantity
                                const { error: updateError } = await supabase
                                    .from('products')
                                    .update({ quantity: prodData.quantity - item.quantity })
                                    .eq('id', item.product_id);

                                if (updateError) {
                                    throw new Error(`Erro ao atualizar estoque de ${item.product_name}`);
                                }
                            }
                        }
                    }

                    const { error } = await supabase
                        .from('requisitions')
                        .update({
                            status,
                            unit_id: unitId || null
                        })
                        .eq('id', reqId);
                    if (error) throw error;
                } else if (unitId !== requisitionToEdit.unit_id) {
                    // Check if only unit changed
                    const { error } = await supabase
                        .from('requisitions')
                        .update({
                            unit_id: unitId || null
                        })
                        .eq('id', reqId);
                    if (error) throw error;
                }

                const canEditItems = canChangeStatus || requisitionToEdit.status === 'PENDENTE';

                if (canEditItems) {
                    await supabase.from('requisition_items').delete().eq('requisition_id', reqId);
                    const { error: itemsError } = await supabase
                        .from('requisition_items')
                        .insert(items.map(item => ({
                            requisition_id: reqId,
                            product_id: item.product_id,
                            quantity: item.quantity
                        })));
                    if (itemsError) throw itemsError;
                }

            } else {
                // Create New
                const { data: reqData, error: reqError } = await supabase
                    .from('requisitions')
                    .insert([{
                        requester_id: user?.id,
                        status: 'PENDENTE',
                        unit_id: unitId || null
                    }])
                    .select()
                    .single();

                if (reqError) throw reqError;
                reqId = reqData.id;

                const { error: itemsError } = await supabase
                    .from('requisition_items')
                    .insert(items.map(item => ({
                        requisition_id: reqId,
                        product_id: item.product_id,
                        quantity: item.quantity
                    })));

                if (itemsError) throw itemsError;
            }

            onSave();
            onClose();
        } catch (error: any) {
            console.error('Error saving requisition:', error);
            alert(`Erro ao salvar requisição: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>
                        {requisitionToEdit ? 'Editar Requisição' : 'Nova Requisição'}
                    </h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.formSection}>
                    {/* Status only visible when editing and authorized */}
                    {requisitionToEdit && canChangeStatus && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className={styles.select}
                            >
                                {STATUS_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>
                                        {opt === 'EM_SEPARACAO' ? 'Em separação' :
                                            opt.charAt(0) + opt.slice(1).toLowerCase().replace('_', ' ')}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Unidade</label>
                        <select
                            value={unitId}
                            onChange={(e) => setUnitId(e.target.value)}
                            className={styles.select}
                            disabled={!['admin', 'manager'].includes(profile?.role || '') && !!profile?.unit_id}
                        >
                            <option value="">Selecione a Unidade</option>
                            {units.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Product Selector with Grid (Only if editable) */}
                {!isReadOnly && (
                    <div className={styles.productSelector}>
                        <div className={styles.searchBox}>
                            <Search size={16} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Buscar produtos..."
                                className={styles.searchInput}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className={styles.productGrid}>
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    className={`${styles.productSelectCard} ${selectedProduct === product.id ? styles.selected : ''} `}
                                    onClick={() => handleAddItem(product.id)}
                                >
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} className={styles.productSelectImage} />
                                    ) : (
                                        <div className={`${styles.productSelectImage} flex items-center justify-center text-gray-300`}>
                                            <ImageIcon size={24} />
                                        </div>
                                    )}
                                    <span className={styles.productSelectName}>{product.name}</span>
                                    <span className={styles.productSelectUnit}>{product.unit}</span>
                                </div>
                            ))}
                        </div>

                        {selectedProduct && (
                            <div className="mt-4 flex gap-4 items-end bg-white p-3 rounded border">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Quantidade</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                                        className={styles.input}
                                        style={{ width: '100px' }}
                                    />
                                </div>
                                <button
                                    onClick={confirmAddItem}
                                    className={styles.primaryButton}
                                >
                                    Adicionar Item
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className={styles.tableContainer}>
                    <table className={styles.itemsTable}>
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th className="w-32">Qtd</th>
                                {!isReadOnly && <th className="w-10"></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="text-center text-gray-500 py-4">
                                        Nenhum item adicionado.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="flex items-center gap-3">
                                            <div>
                                                <div>{item.product_name}</div>
                                                <div className="text-xs text-gray-400">{item.unit}</div>
                                            </div>
                                        </td>
                                        <td>
                                            {/* Admin can edit quantity of existing items */}
                                            {canChangeStatus ? (
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleUpdateQuantity(idx, parseInt(e.target.value))}
                                                    className={styles.smallInput}
                                                />
                                            ) : (
                                                <span>{item.quantity}</span>
                                            )}
                                        </td>
                                        {!isReadOnly && (
                                            <td>
                                                <button
                                                    onClick={() => handleRemoveItem(idx)}
                                                    className={styles.removeItemBtn}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className={styles.secondaryButton}>
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || (items.length === 0 && !requisitionToEdit)}
                        className={styles.primaryButton}
                    >
                        {loading && <Loader2 className="animate-spin mr-2" size={16} />}
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};
