
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { Supplier } from '../../../types';
import { supplierService } from '../../../services/supplierService';
import styles from './Suppliers.module.css'; // Reusing styles or create specific if needed

interface SupplierModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    supplierToEdit?: Supplier;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({ isOpen, onClose, onSave, supplierToEdit }) => {
    const [formData, setFormData] = useState<Partial<Supplier>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (supplierToEdit) {
            setFormData(supplierToEdit);
        } else {
            setFormData({});
        }
    }, [supplierToEdit, isOpen]);


    const BRAZILIAN_STATES = [
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
        'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
        'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ];

    const formatCNPJ = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    };

    const formatPhone = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let formattedValue = value;

        if (name === 'cnpj') {
            formattedValue = formatCNPJ(value);
        } else if (['phone', 'whatsapp', 'seller_phone', 'seller_whatsapp'].includes(name)) {
            formattedValue = formatPhone(value);
        }

        setFormData(prev => ({ ...prev, [name]: formattedValue }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (supplierToEdit?.id) {
                await supplierService.updateSupplier(supplierToEdit.id, formData);
            } else {
                await supplierService.createSupplier(formData as any);
            }
            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving supplier:', error);
            alert('Erro ao salvar fornecedor');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2>{supplierToEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label>Nome *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name || ''}
                            onChange={handleChange}
                            required
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>CNPJ</label>
                        <input
                            type="text"
                            name="cnpj"
                            value={formData.cnpj || ''}
                            onChange={handleChange}
                            maxLength={18}
                            placeholder="XX.XXX.XXX/XXXX-XX"
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.sectionTitle}>Endereço</div>
                    <div className={styles.row}>
                        <div className={styles.formGroup} style={{ flex: 2 }}>
                            <label>Rua</label>
                            <input
                                type="text"
                                name="address_street"
                                value={formData.address_street || ''}
                                onChange={handleChange}
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.formGroup} style={{ flex: 1 }}>
                            <label>Número</label>
                            <input
                                type="text"
                                name="address_number"
                                value={formData.address_number || ''}
                                onChange={handleChange}
                                className={styles.input}
                            />
                        </div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.formGroup} style={{ flex: 1 }}>
                            <label>Complemento</label>
                            <input
                                type="text"
                                name="address_complement"
                                value={formData.address_complement || ''}
                                onChange={handleChange}
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.formGroup} style={{ flex: 1 }}>
                            <label>Bairro</label>
                            <input
                                type="text"
                                name="address_neighborhood"
                                value={formData.address_neighborhood || ''}
                                onChange={handleChange}
                                className={styles.input}
                            />
                        </div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.formGroup} style={{ flex: 1 }}>
                            <label>Cidade</label>
                            <input
                                type="text"
                                name="address_city"
                                value={formData.address_city || ''}
                                onChange={handleChange}
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.formGroup} style={{ flex: 0.5 }}>
                            <label>UF</label>
                            <select
                                name="address_state"
                                value={formData.address_state || ''}
                                onChange={handleChange}
                                className={styles.input}
                            >
                                <option value="">Selecione</option>
                                {BRAZILIAN_STATES.map(state => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={styles.sectionTitle}>Contato</div>
                    <div className={styles.row}>
                        <div className={styles.formGroup} style={{ flex: 1 }}>
                            <label>Telefone</label>
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone || ''}
                                onChange={handleChange}
                                maxLength={15}
                                placeholder="(XX) XXXXX-XXXX"
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.formGroup} style={{ flex: 1 }}>
                            <label>Whatsapp</label>
                            <input
                                type="text"
                                name="whatsapp"
                                value={formData.whatsapp || ''}
                                onChange={handleChange}
                                maxLength={15}
                                placeholder="(XX) XXXXX-XXXX"
                                className={styles.input}
                            />
                        </div>
                    </div>

                    <div className={styles.sectionTitle}>Vendedor</div>
                    <div className={styles.formGroup}>
                        <label>Nome do Vendedor</label>
                        <input
                            type="text"
                            name="seller_name"
                            value={formData.seller_name || ''}
                            onChange={handleChange}
                            className={styles.input}
                        />
                    </div>
                    <div className={styles.row}>
                        <div className={styles.formGroup} style={{ flex: 1 }}>
                            <label>Telefone Vendedor</label>
                            <input
                                type="text"
                                name="seller_phone"
                                value={formData.seller_phone || ''}
                                onChange={handleChange}
                                maxLength={15}
                                placeholder="(XX) XXXXX-XXXX"
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.formGroup} style={{ flex: 1 }}>
                            <label>Whatsapp Vendedor</label>
                            <input
                                type="text"
                                name="seller_whatsapp"
                                value={formData.seller_whatsapp || ''}
                                onChange={handleChange}
                                maxLength={15}
                                placeholder="(XX) XXXXX-XXXX"
                                className={styles.input}
                            />
                        </div>
                    </div>

                    <div className={styles.formActions}>
                        <button type="button" onClick={onClose} className={styles.cancelButton}>
                            Cancelar
                        </button>
                        <button type="submit" className={styles.saveButton} disabled={loading}>
                            <Save size={20} />
                            {loading ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
