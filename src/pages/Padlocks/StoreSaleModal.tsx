import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Unit } from '../../types';
import { X, Save, Calendar, MapPin, CreditCard, ShoppingBag, Minus, Plus } from 'lucide-react';
import styles from './Padlocks.module.css';

const STORE_ITEMS = [
    'Tesoura',
    'Estilete',
    'Barbante',
    'Fitilho',
    'Pincel Atômico',
    'Fita marrom',
    'Fita Transparente',
    'Fita crepe',
    'Flanela',
    'Luva',
    'Plástico Bolha',
];

interface ItemEntry {
    name: string;
    quantity: number;
    value: string;
}

interface StoreSaleModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const StoreSaleModal: React.FC<StoreSaleModalProps> = ({ onClose, onSuccess }) => {
    const getLocalDateString = (date: Date = new Date()) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const today = getLocalDateString();

    const [saleDate, setSaleDate] = useState(today);
    const [unitId, setUnitId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('PIX');
    const [selectedItems, setSelectedItems] = useState<Record<string, ItemEntry>>({});

    const [units, setUnits] = useState<Unit[]>([]);
    const [loadingUnits, setLoadingUnits] = useState(true);
    const [saving, setSaving] = useState(false);

    const paymentMethods = ['Dinheiro', 'PIX', 'Crédito', 'Débito', 'Promoção', 'Boleto'];

    useEffect(() => {
        const fetchUnits = async () => {
            try {
                const { data, error } = await supabase
                    .from('units')
                    .select('*')
                    .eq('active', true)
                    .order('name');

                if (error) throw error;
                setUnits(data || []);

                if (data && data.length > 0) {
                    setUnitId(data[0].id);
                }
            } catch (error) {
                console.error('Error fetching units:', error);
            } finally {
                setLoadingUnits(false);
            }
        };

        fetchUnits();
    }, []);

    const toggleItem = (itemName: string) => {
        setSelectedItems(prev => {
            if (prev[itemName]) {
                const next = { ...prev };
                delete next[itemName];
                return next;
            } else {
                return {
                    ...prev,
                    [itemName]: { name: itemName, quantity: 1, value: '' },
                };
            }
        });
    };

    const updateQuantity = (itemName: string, delta: number) => {
        setSelectedItems(prev => {
            if (!prev[itemName]) return prev;
            const newQty = Math.max(1, prev[itemName].quantity + delta);
            return { ...prev, [itemName]: { ...prev[itemName], quantity: newQty } };
        });
    };

    const setQuantityDirect = (itemName: string, val: string) => {
        const parsed = parseInt(val, 10);
        if (isNaN(parsed) || parsed < 1) return;
        setSelectedItems(prev => {
            if (!prev[itemName]) return prev;
            return { ...prev, [itemName]: { ...prev[itemName], quantity: parsed } };
        });
    };

    const updateValue = (itemName: string, value: string) => {
        setSelectedItems(prev => {
            if (!prev[itemName]) return prev;
            return { ...prev, [itemName]: { ...prev[itemName], value } };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const items = Object.values(selectedItems);

        if (items.length === 0) {
            alert('Por favor, selecione pelo menos um item.');
            return;
        }

        if (!unitId || !saleDate || !paymentMethod) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        try {
            setSaving(true);

            const itemsData = items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                value: parseFloat(item.value.replace(',', '.')) || 0,
            }));

            const { error } = await supabase
                .from('store_sales')
                .insert([{
                    sale_date: saleDate,
                    unit_id: unitId,
                    payment_method: paymentMethod,
                    items: itemsData,
                }]);

            if (error) throw error;

            onSuccess();
        } catch (error) {
            console.error('Error saving store sale:', error);
            alert('Erro ao salvar a venda. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    const selectedCount = Object.keys(selectedItems).length;

    return (
        <div className={styles.modalOverlay}>
            <div className={`${styles.modalContent} ${styles.modalContentLarge}`}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>
                        <ShoppingBag size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                        Nova Venda — Loja Yellow
                    </h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        {/* Top fields row */}
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Data da Venda</label>
                                <div className={styles.inputWrapper}>
                                    <Calendar size={18} className={styles.inputIcon} />
                                    <input
                                        type="date"
                                        required
                                        value={saleDate}
                                        onChange={(e) => setSaleDate(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Unidade</label>
                                <div className={styles.inputWrapper}>
                                    <MapPin size={18} className={styles.inputIcon} />
                                    <select
                                        required
                                        value={unitId}
                                        onChange={(e) => setUnitId(e.target.value)}
                                        disabled={loadingUnits}
                                        className={styles.select}
                                    >
                                        {loadingUnits ? (
                                            <option value="">Carregando...</option>
                                        ) : (
                                            units.map(unit => (
                                                <option key={unit.id} value={unit.id}>{unit.name}</option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Forma de Pagamento</label>
                                <div className={styles.inputWrapper}>
                                    <CreditCard size={18} className={styles.inputIcon} />
                                    <select
                                        required
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className={styles.select}
                                    >
                                        {paymentMethods.map(method => (
                                            <option key={method} value={method}>{method}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Items section */}
                        <div className={styles.formGroup}>
                            <label className={styles.itemsSectionLabel}>
                                Itens Vendidos
                                {selectedCount > 0 && (
                                    <span className={styles.selectedBadge}>{selectedCount} selecionado{selectedCount > 1 ? 's' : ''}</span>
                                )}
                            </label>
                            <div className={styles.itemsGrid}>
                                {STORE_ITEMS.map(itemName => {
                                    const selected = !!selectedItems[itemName];
                                    const entry = selectedItems[itemName];
                                    return (
                                        <div
                                            key={itemName}
                                            className={`${styles.itemCard} ${selected ? styles.itemCardSelected : ''}`}
                                        >
                                            <div
                                                className={styles.itemCardHeader}
                                                onClick={() => toggleItem(itemName)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => toggleItem(itemName)}
                                                    className={styles.itemCheckbox}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <span className={styles.itemName}>{itemName}</span>
                                            </div>

                                            {selected && entry && (
                                                <div className={styles.itemControls} onClick={(e) => e.stopPropagation()}>
                                                    <div className={styles.quantityControl}>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateQuantity(itemName, -1)}
                                                            className={styles.qtyBtn}
                                                            title="Diminuir"
                                                        >
                                                            <Minus size={12} />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={entry.quantity}
                                                            onChange={(e) => setQuantityDirect(itemName, e.target.value)}
                                                            className={styles.qtyInput}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => updateQuantity(itemName, 1)}
                                                            className={styles.qtyBtn}
                                                            title="Aumentar"
                                                        >
                                                            <Plus size={12} />
                                                        </button>
                                                    </div>
                                                    <div className={styles.valueControl}>
                                                        <span className={styles.currencyPrefix}>R$</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            placeholder="0,00"
                                                            value={entry.value}
                                                            onChange={(e) => updateValue(itemName, e.target.value)}
                                                            className={styles.valueInput}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className={styles.modalFooter}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={styles.cancelButton}
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || selectedCount === 0}
                            className={styles.submitButton}
                        >
                            {saving ? 'Salvando...' : (
                                <>
                                    <Save size={18} />
                                    Registrar Venda
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
