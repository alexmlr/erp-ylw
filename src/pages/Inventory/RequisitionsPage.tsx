import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Requisition } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { RequisitionFormModal } from './RequisitionFormModal';
import styles from './Inventory.module.css';

export const RequisitionsPage: React.FC = () => {
    const { profile, user } = useAuth();
    const [activeTab, setActiveTab] = useState<'minhas' | 'abertas'>('minhas');
    const [requisitions, setRequisitions] = useState<Requisition[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);

    const isAdminOrManager = ['admin', 'manager', 'administrative'].includes(profile?.role || '');

    useEffect(() => {
        if (user) {
            fetchRequisitions();
        }
    }, [user, activeTab]);

    const fetchRequisitions = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('requisitions')
                .select(`
                    *,
                    profile:profiles(full_name),
                    items:requisition_items(
                        quantity,
                        product:products(name, unit)
                    )
                `)
                .order('created_at', { ascending: false });

            if (activeTab === 'minhas') {
                // Use profile.id instead of user.id to be safe/consistent with Dashboard
                query = query.eq('requester_id', profile?.id);
            } else {
                // 'abertas' -> All requisitions (RLS handles visibility generally)
                // If specific filtering for 'open' is needed, add .in('status', ['pending', 'approved', ...])
            }

            const { data, error } = await query;

            if (error) {
                console.error('Supabase error fetching requisitions:', error);
                throw error;
            }

            setRequisitions(data || []);
        } catch (error: unknown) {
            console.error('Error fetching requisitions:', error);
            const errorMessage = (error as Error).message || 'Erro desconhecido';
            alert(`Erro ao carregar requisições: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedRequisition(null);
        setIsModalOpen(true);
    };

    const handleEdit = (req: Requisition) => {
        setSelectedRequisition(req);
        setIsModalOpen(true);
    };

    const formatItemsSummary = (items: any[]) => { // TODO: Type this properly if possible, or leave as any[] if structure is dynamic
        if (!items || items.length === 0) return '-';
        const summary = items.map(i => `${i.quantity}x ${i.product?.name}`).join(', ');
        return summary.length > 50 ? summary.substring(0, 50) + '...' : summary;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Requisições</h1>
                <button
                    onClick={handleCreate}
                    className={styles.primaryButton}
                >
                    <Plus size={20} />
                    Nova Requisição
                </button>
            </div>

            {isAdminOrManager && (
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'minhas' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('minhas')}
                    >
                        Minhas Requisições
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'abertas' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('abertas')}
                    >
                        Requisições em Aberto (Todos)
                    </button>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
                </div>
            ) : requisitions.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-100">
                    <p>Nenhuma requisição encontrada.</p>
                </div>
            ) : (
                <div className={styles.modernTableContainer}>
                    <table className={styles.modernTable}>
                        <thead className={styles.modernHeader}>
                            <tr>
                                <th>ID</th>
                                <th>Data</th>
                                {
                                    activeTab === 'abertas' && (
                                        <th>Solicitante</th>
                                    )
                                }
                                <th>Itens</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {requisitions.map((req) => (
                                <tr key={req.id} className={styles.modernRow}>
                                    <td className={styles.modernCell}>
                                        <span style={{ fontWeight: 500 }}>
                                            #{req.display_id?.toString().padStart(5, '0') || '...'}
                                        </span>
                                    </td>
                                    <td className={styles.modernCellSecondary}>
                                        {formatDate(req.created_at)}
                                    </td>
                                    {activeTab === 'abertas' && (
                                        <td className={styles.modernCell}>
                                            <span style={{ fontWeight: 500 }}>
                                                {req.profile?.full_name || 'Desconhecido'}
                                            </span>
                                        </td>
                                    )}
                                    <td className={styles.modernCellSecondary} title={formatItemsSummary(req.items)} style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {formatItemsSummary(req.items)}
                                    </td>
                                    <td className={styles.modernCell}>
                                        <span className={`${styles.statusBadge} ${styles[`status_${req.status}`]}`}>
                                            {req.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className={styles.modernCell} style={{ textAlign: 'right' }}>
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(req)}
                                                className={styles.actionButton}
                                                title="Ver Detalhes / Editar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                </svg>
                                            </button>
                                            {profile?.role === 'admin' && (
                                                <button
                                                    onClick={async () => {
                                                        if (confirm(`Tem certeza que deseja excluir a requisição #${req.display_id}? Esta ação é irreversível.`)) {
                                                            try {
                                                                const { error } = await supabase.from('requisitions').delete().eq('id', req.id);
                                                                if (error) throw error;
                                                                fetchRequisitions();
                                                            } catch (err: unknown) {
                                                                console.error("Error deleting requisition:", err);
                                                                const errorMessage = (err as Error).message || 'Erro desconhecido';
                                                                alert("Erro ao excluir requisição: " + errorMessage);
                                                            }
                                                        }
                                                    }}
                                                    className={`${styles.actionButton} hover:text-red-500`}
                                                    title="Excluir (Admin)"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
            }

            <RequisitionFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={() => {
                    fetchRequisitions();
                }}
                requisitionToEdit={selectedRequisition}
            />
        </div >
    );
};
