import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { RequisitionFormModal } from './RequisitionFormModal';
import styles from './Inventory.module.css';

export const RequisitionsPage: React.FC = () => {
    const { profile, user } = useAuth();
    const [activeTab, setActiveTab] = useState<'minhas' | 'abertas'>('minhas');
    const [requisitions, setRequisitions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRequisition, setSelectedRequisition] = useState<any | null>(null);

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
                    profile:profiles!requisitions_requester_id_fkey(full_name),
                    items:requisition_items(
                        quantity,
                        product:products(name, unit)
                    )
                `)
                .order('created_at', { ascending: false });

            if (activeTab === 'minhas') {
                query = query.eq('requester_id', user?.id);
            } else {
                // 'abertas' -> All requisitions (RLS handles visibility for admins)
                // Optionally filter by status if 'Em Aberto' implies only pending/processing
                // For now fetching all as per "historic" requirement usually needing everything
            }

            const { data, error } = await query;
            if (error) throw error;
            setRequisitions(data || []);
        } catch (error) {
            console.error('Error fetching requisitions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedRequisition(null);
        setIsModalOpen(true);
    };

    const handleEdit = (req: any) => {
        setSelectedRequisition(req);
        setIsModalOpen(true);
    };

    const formatItemsSummary = (items: any[]) => {
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
                <div className="bg-white rounded-lg shadowoverflow-hidden border border-gray-200">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                {activeTab === 'abertas' && (
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitante</th>
                                )}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Itens</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {requisitions.map((req) => (
                                <tr key={req.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatDate(req.created_at)}
                                    </td>
                                    {activeTab === 'abertas' && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {req.profile?.full_name || 'Desconhecido'}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={formatItemsSummary(req.items)}>
                                        {formatItemsSummary(req.items)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`${styles.statusBadge} ${styles[`status_${req.status}`]}`}>
                                            {req.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(req)}
                                            className="text-yellow-600 hover:text-yellow-900"
                                        >
                                            {(activeTab === 'minhas' && req.status !== 'PENDENTE') ? 'Ver Detalhes' : 'Abrir / Editar'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <RequisitionFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={() => {
                    fetchRequisitions();
                }}
                requisitionToEdit={selectedRequisition}
            />
        </div>
    );
};
