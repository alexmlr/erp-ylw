import React, { useEffect, useState } from 'react';
import { X, Calendar, User, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Dashboard.module.css';

interface PendingRequisitionSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (requisition: any) => void;
}

export const PendingRequisitionSelector: React.FC<PendingRequisitionSelectorProps> = ({ isOpen, onClose, onSelect }) => {
    const { profile } = useAuth();
    const [requisitions, setRequisitions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchPendingRequisitions();
        }
    }, [isOpen]);

    const fetchPendingRequisitions = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('requisitions')
                .select(`
                    id,
                    status,
                    created_at,
                    unit_id,
                    requester_id,
                    profiles:requester_id (full_name),
                    requisition_items (count),
                    display_id
                `)
                .eq('status', 'PENDENTE')
                .order('created_at', { ascending: false });

            // If Commercial (not admin/manager/adminstrative), only see own requests
            // Actually, requirements said Administrative sees ALL, Commercial sees OWN.
            // Let's rely on role check.
            if (profile?.role === 'commercial') {
                query = query.eq('requester_id', profile.id);
            }
            // Administrative sees all, so no extra filter needed for them.

            const { data, error } = await query;

            if (error) throw error;
            setRequisitions(data || []);
        } catch (error) {
            console.error('Error fetching pending requisitions:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Selecione um Pedido para Editar</h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.selectorContainer}>
                    {loading ? (
                        <div className="p-8 text-center">Carregando pedidos pendentes...</div>
                    ) : requisitions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            Nenhum pedido pendente encontrado.
                        </div>
                    ) : (
                        <div className={styles.reqList}>
                            {requisitions.map((req) => (
                                <button
                                    key={req.id}
                                    className={styles.reqItemButton}
                                    onClick={() => onSelect(req)}
                                >
                                    <div className="flex flex-col items-start gap-1">
                                        <span className="font-semibold text-lg">
                                            Pedido #{req.display_id?.toString().padStart(5, '0') || '...'}
                                        </span>
                                        <span className="text-sm text-gray-500 flex items-center gap-1">
                                            <Calendar size={14} />
                                            {new Date(req.created_at).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>

                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-sm font-medium text-blue-600 flex items-center gap-1">
                                            <Package size={14} />
                                            {req.requisition_items[0]?.count || 0} itens
                                        </span>
                                        {profile?.role !== 'commercial' && (
                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                <User size={12} />
                                                {req.profiles?.full_name || 'Usuário'}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
