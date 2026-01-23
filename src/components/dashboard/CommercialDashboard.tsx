import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Requisition } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './Dashboard.module.css';
import { RequisitionFormModal } from '../../pages/Inventory/RequisitionFormModal';
import { PendingRequisitionSelector } from './PendingRequisitionSelector';
import { PlusCircle, Edit } from 'lucide-react';

export const CommercialDashboard: React.FC = () => {
    const { profile } = useAuth();
    const [recentRequisitions, setRecentRequisitions] = useState<any[]>([]); // simplified type for now
    const [stats, setStats] = useState({
        pending: 0,
        approved: 0,
        total: 0
    });
    const [loading, setLoading] = useState(true);

    // Modal States
    const [isNewReqModalOpen, setIsNewReqModalOpen] = useState(false);
    const [isEditSelectorOpen, setIsEditSelectorOpen] = useState(false);
    const [editingRequisition, setEditingRequisition] = useState<Requisition | null>(null);

    useEffect(() => {
        if (profile?.id) {
            fetchData();
        }
    }, [profile?.id]);

    const fetchData = async () => {
        try {
            // Fetch stats
            const { data: statsData } = await supabase
                .from('requisitions')
                .select('status')
                .eq('requester_id', profile?.id);

            if (statsData) {
                const pending = statsData.filter(r => r.status === 'PENDENTE').length;
                const approved = statsData.filter(r => r.status === 'APROVADO').length;
                setStats({
                    pending,
                    approved,
                    total: statsData.length
                });
            }

            // Fetch recent requisitions
            const { data: requisitions } = await supabase
                .from('requisitions')
                .select(`
                    id,
                    status,
                    created_at,
                    requisition_items (
                        quantity,
                        products (name)
                    ),
                    display_id
                `)
                .eq('requester_id', profile?.id)
                .order('created_at', { ascending: false })
                .limit(5);

            setRecentRequisitions(requisitions || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className={styles.container}>Carregando...</div>;
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Dashboard Comercial</h1>

            {/* Action Buttons */}
            <div className={styles.actionButtonsHeader}>
                <button
                    className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                    onClick={() => {
                        setEditingRequisition(null);
                        setIsNewReqModalOpen(true);
                    }}
                >
                    <div className={styles.actionButtonIcon}>
                        <PlusCircle size={32} />
                    </div>
                    Novo Pedido
                </button>

                <button
                    className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
                    onClick={() => setIsEditSelectorOpen(true)}
                >
                    <div className={styles.actionButtonIcon}>
                        <Edit size={32} />
                    </div>
                    Editar Pedido
                </button>
            </div>

            <div className={styles.grid}>
                <div className={styles.card}>
                    <div className={styles.cardContent}>
                        <p className={styles.cardLabel}>Em Aberto</p>
                        <h3 className={`${styles.cardValue} ${styles.textYellow}`}>{stats.pending}</h3>
                    </div>
                    <div className={`${styles.iconWrapper} ${styles.bgYellow}`}>
                        <Clock className={styles.textYellow} size={24} />
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardContent}>
                        <p className={styles.cardLabel}>Aprovadas</p>
                        <h3 className={`${styles.cardValue} ${styles.textGreen}`}>{stats.approved}</h3>
                    </div>
                    <div className={`${styles.iconWrapper} ${styles.bgGreen}`}>
                        <FileText className={styles.textGreen} size={24} />
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardContent}>
                        <p className={styles.cardLabel}>Total Solicitado</p>
                        <h3 className={`${styles.cardValue} ${styles.textBlue}`}>{stats.total}</h3>
                    </div>
                    <div className={`${styles.iconWrapper} ${styles.bgBlue}`}>
                        <FileText className={styles.textBlue} size={24} />
                    </div>
                </div>
            </div>

            <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                    <h2 className={styles.sectionTitle}>Minhas Requisições Recentes</h2>
                    <Link to="/inventory/requisitions" className={styles.link}>
                        Ver todas
                    </Link>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>ID</th>
                                <th className={styles.th}>Data</th>
                                <th className={styles.th}>Itens</th>
                                <th className={styles.th}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentRequisitions.map((req) => (
                                <tr key={req.id} className={styles.tr}>
                                    <td className={styles.td}>#{req.display_id?.toString().padStart(5, '0') || '...'}</td>
                                    <td className={styles.td}>
                                        {new Date(req.created_at).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className={styles.td}>
                                        {req.requisition_items?.length || 0} itens
                                    </td>
                                    <td className={styles.td}>
                                        <span className={`${styles.badge} ${req.status === 'pending' ? styles.badgePending :
                                            req.status === 'APROVADO' ? styles.badgeApproved :
                                                req.status === 'RECUSADO' ? styles.badgeRejected : styles.badgeDefault
                                            }`}>
                                            {req.status === 'PENDENTE' ? 'Pendente' :
                                                req.status === 'APROVADO' ? 'Aprovado' :
                                                    req.status === 'RECUSADO' ? 'Rejeitado' : req.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {recentRequisitions.length === 0 && (
                                <tr>
                                    <td colSpan={4} className={styles.emptyState}>
                                        Nenhuma requisição recente.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* Modals */}
            <RequisitionFormModal
                isOpen={isNewReqModalOpen}
                onClose={() => {
                    setIsNewReqModalOpen(false);
                    setEditingRequisition(null);
                }}
                onSave={() => {
                    fetchData(); // Refresh stats
                }}
                requisitionToEdit={editingRequisition}
            />

            <PendingRequisitionSelector
                isOpen={isEditSelectorOpen}
                onClose={() => setIsEditSelectorOpen(false)}
                onSelect={(req) => {
                    setEditingRequisition(req);
                    setIsEditSelectorOpen(false);
                    setIsNewReqModalOpen(true); // Re-use the form modal for editing
                }}
            />
        </div >
    );
};
