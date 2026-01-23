import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Requisition } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Clock, ShoppingCart, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './Dashboard.module.css';
import { RequisitionFormModal } from '../../pages/Inventory/RequisitionFormModal';
import { PendingRequisitionSelector } from './PendingRequisitionSelector';
import { PlusCircle, Edit } from 'lucide-react';

export const AdministrativeDashboard: React.FC = () => {
    const { profile } = useAuth();
    const [recentRequisitions, setRecentRequisitions] = useState<any[]>([]); // simplified type for now, strictly should be extended Requisition
    const [requisitionStats, setRequisitionStats] = useState({
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
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch ALL stats (no user filter)
            const { data: statsData } = await supabase
                .from('requisitions')
                .select('status');

            if (statsData) {
                const pending = statsData.filter(r => r.status === 'PENDENTE').length;
                const approved = statsData.filter(r => r.status === 'APROVADO').length;
                setRequisitionStats({
                    pending,
                    approved,
                    total: statsData.length
                });
            }

            // Fetch global recent requisitions
            const { data: requisitions } = await supabase
                .from('requisitions')
                .select(`
id,
    status,
    created_at,
    requester_id,
    profiles:requester_id (full_name),
        requisition_items(quantity),
        display_id
            `)
                .order('created_at', { ascending: false })
                .limit(5);

            setRecentRequisitions(requisitions || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Permission check for Quotes module
    const hasQuotesAccess = () => {
        if (!profile) return false;
        // Admins and Managers always have access
        if (profile.role === 'admin' || profile.role === 'manager') return true;
        // Check for specific 'quotes' permission in the permissions array
        return profile.permissions?.includes('quotes') || false;
    };

    // Permission check for Suppliers module (assuming similar logic might be needed, defaults to true for administrative for now, but good to have prepared)
    const hasSuppliersAccess = () => {
        if (!profile) return false;
        if (profile.role === 'admin' || profile.role === 'manager') return true;
        // Check for specific 'suppliers' permission or default to true for administrative role for now if that's the base requirement
        return true;
    };

    if (loading) {
        return <div className={styles.container}>Carregando...</div>;
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Dashboard Administrativo</h1>

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

            {/* KPI Cards */}
            <div className={`${styles.grid} ${styles.grid4} `}>
                <div className={styles.card}>
                    <div className={styles.cardContent}>
                        <p className={styles.cardLabel}>Req. Pendentes</p>
                        <h3 className={`${styles.cardValue} ${styles.textYellow} `}>{requisitionStats.pending}</h3>
                    </div>
                    <div className={`${styles.iconWrapper} ${styles.bgYellow} `}>
                        <Clock className={styles.textYellow} size={24} />
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardContent}>
                        <p className={styles.cardLabel}>Req. Aprovadas</p>
                        <h3 className={`${styles.cardValue} ${styles.textGreen} `}>{requisitionStats.approved}</h3>
                    </div>
                    <div className={`${styles.iconWrapper} ${styles.bgGreen} `}>
                        <FileText className={styles.textGreen} size={24} />
                    </div>
                </div>

                {/* Conditional Quotes Card */}
                {hasQuotesAccess() && (
                    <div className={`${styles.card} ${styles.placeholderCard} `}>
                        <div className={styles.cardContent}>
                            <p className={styles.cardLabel}>Cotações Abertas</p>
                            <h3 className={`${styles.cardValue} ${styles.textBlue} `}>0</h3>
                            <span className={styles.badge}>Em breve</span>
                        </div>
                        <div className={`${styles.iconWrapper} ${styles.bgBlue} `}>
                            <ShoppingCart className={styles.textBlue} size={24} />
                        </div>
                    </div>
                )}

                {/* Suppliers Card */}
                {hasSuppliersAccess() && (
                    <div className={`${styles.card} ${styles.placeholderCard} `}>
                        <div className={styles.cardContent}>
                            <p className={styles.cardLabel}>Fornecedores</p>
                            <h3 className={`${styles.cardValue} ${styles.textPurple} `}>-</h3>
                            <span className={styles.badge}>Em breve</span>
                        </div>
                        <div className={`${styles.iconWrapper} ${styles.bgPurple} `}>
                            <Truck className={styles.textPurple} size={24} />
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.grid} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {/* Recent Requisitions Table */}
                <div className={styles.tableCard}>
                    <div className={styles.tableHeader}>
                        <h2 className={styles.sectionTitle}>Últimas Requisições (Geral)</h2>
                        <Link to="/inventory/requisitions" className={styles.link}>
                            Gerenciar
                        </Link>
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>ID</th>
                                    <th className={styles.th}>Solicitante</th>
                                    <th className={styles.th}>Data</th>
                                    <th className={styles.th}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentRequisitions.map((req) => (
                                    <tr key={req.id} className={styles.tr}>
                                        <td className={styles.td}>#{req.display_id?.toString().padStart(5, '0') || '...'}</td>
                                        <td className={styles.td}>
                                            {req.profiles?.full_name || 'Usuário'}
                                        </td>
                                        <td className={styles.td}>
                                            {new Date(req.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className={styles.td}>
                                            <span className={`${styles.badge} ${req.status === 'PENDENTE' ? styles.badgePending :
                                                req.status === 'APROVADO' ? styles.badgeApproved :
                                                    req.status === 'ENTREGUE' ? styles.badgeDelivered :
                                                        req.status === 'RECUSADO' ? styles.badgeRejected : styles.badgeDefault
                                                } `}>
                                                {req.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Conditional Quotes Summary Placeholder */}
                {hasQuotesAccess() && (
                    <div className={styles.card} style={{ minHeight: '300px' }}>
                        <div className={styles.featureCard}>
                            <div className={`${styles.iconWrapper} ${styles.bgBlue} `} style={{ marginBottom: '1rem' }}>
                                <ShoppingCart size={32} className={styles.textBlue} />
                            </div>
                            <h3 className={styles.sectionTitle} style={{ marginBottom: '0.5rem' }}>Resumo de Cotações</h3>
                            <p className={styles.cardLabel} style={{ maxWidth: '300px', margin: '0 auto' }}>
                                O módulo de compras e cotações está em desenvolvimento. Em breve você verá um resumo das negociações aqui.
                            </p>
                        </div>
                    </div>
                )}
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
