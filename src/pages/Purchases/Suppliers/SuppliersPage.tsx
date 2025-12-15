import React from 'react';
import { Plus } from 'lucide-react';
import styles from './Suppliers.module.css';

export const SuppliersPage: React.FC = () => {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Fornecedores</h1>
                <button className={styles.newButton} onClick={() => alert('Funcionalidade em desenvolvimento')}>
                    <Plus size={20} />
                    Novo Fornecedor
                </button>
            </div>

            <div className={styles.content}>
                <div className={styles.emptyState}>
                    <p>Módulo de gestão de fornecedores em desenvolvimento.</p>
                </div>
            </div>
        </div>
    );
};
