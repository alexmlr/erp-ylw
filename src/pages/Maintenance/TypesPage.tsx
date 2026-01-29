
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { loggerService } from '../../services/loggerService';
import styles from './Maintenance.module.css';

interface Type {
    id: string;
    name: string;
    created_at: string;
}

export const TypesPage: React.FC = () => {
    // const { profile } = useAuth(); // Unused, handled by route protection
    const [types, setTypes] = useState<Type[]>([]);
    const [newType, setNewType] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = async () => {
        try {
            const { data, error } = await supabase
                .from('maintenance_types')
                .select('*')
                .order('name');

            if (error) throw error;
            setTypes(data || []);
        } catch (err: any) {
            setError('Erro ao carregar tipos.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newType.trim()) return;

        try {
            const { error } = await supabase
                .from('maintenance_types')
                .insert([{ name: newType.trim() }]);

            if (error) throw error;

            await loggerService.logAction({
                action: 'Criou Tipo de Manutenção',
                entity: 'Tipo Manutenção',
                details: { name: newType }
            });

            setNewType('');
            fetchTypes();
        } catch (err: any) {
            const errorMessage = err.message || 'Erro desconhecido';
            setError(`Erro ao criar tipo: ${errorMessage}`);
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este tipo?')) return;

        try {
            const { error } = await supabase
                .from('maintenance_types')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await loggerService.logAction({
                action: 'Excluiu Tipo de Manutenção',
                entity: 'Tipo Manutenção',
                entity_id: id
            });

            fetchTypes();
        } catch (err: any) {
            setError('Erro ao excluir tipo. Ele pode estar em uso.');
            console.error(err);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Tipos de Manutenção</h1>
            </div>

            <div className={styles.card}>
                <form onSubmit={handleAdd} className={styles.inputGroup}>
                    <div className="flex-1">
                        <label className={styles.formLabel}>
                            Novo Tipo
                        </label>
                        <input
                            type="text"
                            value={newType}
                            onChange={(e) => setNewType(e.target.value)}
                            className={styles.input}
                            placeholder="Ex: Preventiva, Corretiva..."
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!newType.trim()}
                        className={styles.primaryButton}
                    >
                        <Plus size={20} />
                        Adicionar
                    </button>
                </form>
            </div>

            {error && (
                <div className={styles.errorMessage}>
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.th}>Nome</th>
                            <th className={styles.th} style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={2} className="p-4 text-center">Carregando...</td></tr>
                        ) : types.length === 0 ? (
                            <tr><td colSpan={2} className="p-4 text-center text-gray-500">Nenhum tipo cadastrado.</td></tr>
                        ) : (
                            types.map((type) => (
                                <tr key={type.id} className={styles.tr}>
                                    <td className={styles.td}>{type.name}</td>
                                    <td className={styles.td} style={{ textAlign: 'right' }}>
                                        <button
                                            onClick={() => handleDelete(type.id)}
                                            className={styles.deleteButton}
                                            title="Excluir"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
