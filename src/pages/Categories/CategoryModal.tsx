import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { categoryService } from '../../services/categoryService';
import { loggerService } from '../../services/loggerService';
import styles from './Categories.module.css';

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const newCat = await categoryService.createCategory(name);
            await loggerService.logAction({
                action: 'Criou Categoria',
                entity: 'Categoria',
                entity_id: newCat.id,
                details: { name: newCat.name }
            });
            onSuccess();
            onClose();
            setName('');
        } catch (error) {
            console.error(error);
            alert('Erro ao criar categoria.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Nova Categoria</h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.modalForm}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Nome da Categoria</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={styles.input}
                            placeholder="Ex: Elétrica"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={styles.submitButton}
                    >
                        {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                        Criar Categoria
                    </button>
                </form>
            </div>
        </div>
    );
};
