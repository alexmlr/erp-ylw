import React, { useState, useEffect } from 'react';
import { X, Save, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import styles from './Units.module.css';

interface UnitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    unit?: any | null; // Using any for now, better to import Unit from types
}

export const UnitModal: React.FC<UnitModalProps> = ({ isOpen, onClose, onSave, unit }) => {
    const [name, setName] = useState('');
    const [cep, setCep] = useState('');
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchingCep, setSearchingCep] = useState(false);

    useEffect(() => {
        if (unit) {
            setName(unit.name);
            setAddress(unit.address || '');
        } else {
            setName('');
            setCep('');
            setAddress('');
        }
    }, [unit, isOpen]);

    const handleSearchCep = async () => {
        if (cep.length !== 8) {
            alert('CEP deve ter 8 dígitos');
            return;
        }
        setSearchingCep(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();
            if (data.erro) {
                alert('CEP não encontrado');
            } else {
                setAddress(`${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`);
            }
        } catch (error) {
            console.error('Error fetching CEP:', error);
            alert('Erro ao buscar CEP');
        } finally {
            setSearchingCep(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (unit) {
                const { error } = await supabase
                    .from('units')
                    .update({ name, address })
                    .eq('id', unit.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('units')
                    .insert([{ name, address }]);

                if (error) throw error;
            }

            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving unit:', error);
            alert('Erro ao salvar unidade');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2>{unit ? 'Editar Unidade' : 'Nova Unidade'}</h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label>Nome da Unidade</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="Ex: Matriz"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>CEP (Opcional)</label>
                        <div className={styles.inputWithAction}>
                            <input
                                type="text"
                                value={cep}
                                onChange={(e) => setCep(e.target.value.replace(/\D/g, ''))}
                                placeholder="00000000"
                                maxLength={8}
                            />
                            <button
                                type="button"
                                onClick={handleSearchCep}
                                disabled={searchingCep}
                                className={styles.actionButton}
                            >
                                <Search size={20} />
                            </button>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Endereço Completo</label>
                        <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            required
                            rows={3}
                            placeholder="Rua, Número, Bairro, Cidade - UF"
                        />
                    </div>

                    <div className={styles.modalActions}>
                        <button type="button" onClick={onClose} className={styles.cancelButton}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className={styles.confirmButton}>
                            {loading ? 'Salvando...' : (
                                <>
                                    <Save size={20} />
                                    Salvar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
