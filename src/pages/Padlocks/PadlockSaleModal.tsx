import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Unit, PadlockSale } from '../../types';
import { X, Save, Calendar, MapPin, CreditCard } from 'lucide-react';
import styles from './Padlocks.module.css';

interface PadlockSaleModalProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: PadlockSale | null;
}

export const PadlockSaleModal: React.FC<PadlockSaleModalProps> = ({ onClose, onSuccess, initialData }) => {
    const today = new Date().toISOString().split('T')[0];

    const [saleDate, setSaleDate] = useState(initialData?.sale_date ? new Date(initialData.sale_date).toISOString().split('T')[0] : today);
    const [value, setValue] = useState(initialData?.value ? initialData.value.toString() : '40.00');
    const [paymentMethod, setPaymentMethod] = useState(initialData?.payment_method || 'PIX');
    const [unitId, setUnitId] = useState(initialData?.unit_id || '');
    
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
                
                if (data && data.length > 0 && !unitId) {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!unitId || !value || !saleDate || !paymentMethod) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        try {
            setSaving(true);
            const numericValue = parseFloat(value.replace(',', '.'));
            
            if (initialData) {
                const { error } = await supabase
                    .from('padlock_sales')
                    .update({
                        sale_date: saleDate,
                        value: numericValue,
                        payment_method: paymentMethod,
                        unit_id: unitId
                    })
                    .eq('id', initialData.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('padlock_sales')
                    .insert([{
                        sale_date: saleDate,
                        value: numericValue,
                        payment_method: paymentMethod,
                        unit_id: unitId
                    }]);

                if (error) throw error;
            }
            
            onSuccess();
        } catch (error) {
            console.error('Error saving padlock sale:', error);
            alert('Erro ao salvar a venda. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>{initialData ? 'Editar Venda de Cadeado' : 'Nova Venda de Cadeado'}</h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        {/* Data da Venda */}
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

                        {/* Unidade */}
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

                        {/* Forma de Pagamento */}
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

                        {/* Valor */}
                        <div className={styles.formGroup}>
                            <label>Valor (R$)</label>
                            <div className={styles.inputWrapper}>
                                <span className={styles.inputPrefix}>R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    className={styles.input}
                                />
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
                            disabled={saving}
                            className={styles.submitButton}
                        >
                            {saving ? 'Salvando...' : (
                                <>
                                    <Save size={18} />
                                    {initialData ? 'Atualizar Venda' : 'Registrar Venda'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

