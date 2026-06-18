import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Unit, PadlockSale } from '../../types';
import { X, Save, Calendar, MapPin, CreditCard, Hash } from 'lucide-react';
import styles from './Padlocks.module.css';

interface PadlockSaleModalProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: PadlockSale | null;
}

export const PadlockSaleModal: React.FC<PadlockSaleModalProps> = ({ onClose, onSuccess, initialData }) => {
    // Retorna a data local no formato YYYY-MM-DD, sem conversão para UTC
    const getLocalDateString = (date: Date = new Date()) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const today = getLocalDateString();

    // sale_date vem do banco como 'YYYY-MM-DD'; ao fazer new Date() ele interpreta como UTC.
    // Para evitar o deslocamento de fuso, apenas usamos a string diretamente.
    const [saleDate, setSaleDate] = useState(initialData?.sale_date ? initialData.sale_date.split('T')[0] : today);
    const [quantity, setQuantity] = useState(initialData?.quantity ? initialData.quantity.toString() : '1');
    const [paymentMethod, setPaymentMethod] = useState(initialData?.payment_method || 'PIX');
    const [unitId, setUnitId] = useState(initialData?.unit_id || '');
    const [postagemVerificada, setPostagemVerificada] = useState(initialData?.postagem_verificada || false);
    
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
        
        if (!unitId || !quantity || !saleDate || !paymentMethod) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        try {
            setSaving(true);
            const numericQuantity = parseInt(quantity, 10);
            
            if (numericQuantity < 1) {
                alert('A quantidade deve ser pelo menos 1.');
                return;
            }

            if (initialData) {
                const { error } = await supabase
                    .from('padlock_sales')
                    .update({
                        sale_date: saleDate,
                        quantity: numericQuantity,
                        payment_method: paymentMethod,
                        unit_id: unitId,
                        postagem_verificada: postagemVerificada
                    })
                    .eq('id', initialData.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('padlock_sales')
                    .insert([{
                        sale_date: saleDate,
                        quantity: numericQuantity,
                        payment_method: paymentMethod,
                        unit_id: unitId,
                        postagem_verificada: postagemVerificada
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

                        {/* Quantidade */}
                        <div className={styles.formGroup}>
                            <label>Quantidade</label>
                            <div className={styles.inputWrapper}>
                                <Hash size={18} className={styles.inputIcon} />
                                <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    required
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className={styles.input}
                                />
                            </div>
                        </div>

                        {/* Postagem Verificada */}
                        <div className={styles.formGroup}>
                            <label>Postagem Verificada</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 400, color: '#374151', fontSize: '0.875rem', padding: '0.25rem 0' }}>
                                <input
                                    type="checkbox"
                                    checked={postagemVerificada}
                                    onChange={(e) => setPostagemVerificada(e.target.checked)}
                                    style={{ width: '1.125rem', height: '1.125rem', cursor: 'pointer' }}
                                />
                                Sim, postagem verificada
                            </label>
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
