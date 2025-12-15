import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './Dashboard.module.css';

export const ManagementDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalProducts: 0,
        lowStock: 0,
        activeUsers: 0,
        pendingRequisitions: 0
    });
    const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // 1. Fetch Products Stats & Low Stack
            const { data: allProducts } = await supabase
                .from('products')
                .select('id, name, quantity, min_quantity, unit');

            let totalProds = 0;
            let low = 0;
            const criticalProducts: any[] = [];

            if (allProducts) {
                totalProds = allProducts.length;
                allProducts.forEach(prod => {
                    // Check if quantity is below minimum (if minimum is set)
                    if (prod.min_quantity && prod.quantity <= prod.min_quantity) {
                        low++;
                        criticalProducts.push(prod);
                    }
                });
            }

            // 2. Fetch Users Count
            const { count: usersCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            // 3. Fetch Pending Requisitions
            const { count: pendingCount } = await supabase
                .from('requisitions')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            setStats({
                totalProducts: totalProds,
                lowStock: low,
                activeUsers: usersCount || 0,
                pendingRequisitions: pendingCount || 0
            });

            // Limit critical products to top 5
            setLowStockProducts(criticalProducts.slice(0, 5));

        } catch (error) {
            console.error('Error fetching management data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className={styles.container}>Carregando...</div>;
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Visão Geral Executiva</h1>

            {/* KPI Cards */}
            <div className={`${styles.grid} ${styles.grid4}`}>
                <div className={styles.card}>
                    <div className={styles.cardContent}>
                        <p className={styles.cardLabel}>Alerta de Estoque</p>
                        <h3 className={`${styles.cardValue} ${styles.textRed}`}>{stats.lowStock}</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Itens abaixo do mínimo</p>
                    </div>
                    <div className={`${styles.iconWrapper} ${styles.bgRed}`}>
                        <AlertTriangle className={styles.textRed} size={20} />
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardContent}>
                        <p className={styles.cardLabel}>Requisições Pendentes</p>
                        <h3 className={`${styles.cardValue} ${styles.textYellow}`}>{stats.pendingRequisitions}</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Aguardando aprovação</p>
                    </div>
                    <div className={`${styles.iconWrapper} ${styles.bgYellow}`}>
                        <FileText className={styles.textYellow} size={20} />
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardContent}>
                        <p className={styles.cardLabel}>Total de Produtos</p>
                        <h3 className={`${styles.cardValue} ${styles.textBlue}`}>{stats.totalProducts}</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Itens cadastrados</p>
                    </div>
                    <div className={`${styles.iconWrapper} ${styles.bgBlue}`}>
                        <TrendingUp className={styles.textBlue} size={20} />
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardContent}>
                        <p className={styles.cardLabel}>Usuários Ativos</p>
                        <h3 className={`${styles.cardValue} ${styles.textPurple}`}>{stats.activeUsers}</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>No sistema</p>
                    </div>
                    <div className={`${styles.iconWrapper} ${styles.bgPurple}`}>
                        <Users className={styles.textPurple} size={20} />
                    </div>
                </div>
            </div>

            <div className={styles.grid} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {/* Low Stock Alerts */}
                <div className={styles.tableCard}>
                    <div className={styles.tableHeader}>
                        <div className="flex items-center gap-2">
                            <h2 className={styles.sectionTitle}>Alertas de Reposição</h2>
                        </div>
                        <Link to="/inventory/products" className={styles.link}>
                            Ver estoque
                        </Link>
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Produto</th>
                                    <th className={styles.th} style={{ textAlign: 'right' }}>Atual</th>
                                    <th className={styles.th} style={{ textAlign: 'right' }}>Mínimo</th>
                                    <th className={styles.th} style={{ textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lowStockProducts.map((prod) => (
                                    <tr key={prod.id} className={styles.tr}>
                                        <td className={styles.td} style={{ fontWeight: 500 }}>{prod.name}</td>
                                        <td className={styles.td} style={{ textAlign: 'right' }}>{prod.quantity}</td>
                                        <td className={styles.td} style={{ textAlign: 'right', color: '#68748B' }}>{prod.min_quantity}</td>
                                        <td className={styles.td} style={{ textAlign: 'center' }}>
                                            <span className={`${styles.badge} ${styles.badgeRejected}`}>
                                                Crítico
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {lowStockProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className={styles.emptyState}>
                                            Nenhum alerta de estoque no momento.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Purchase/Financial Summary Placeholder */}
                <div className={styles.card} style={{ minHeight: '300px' }}>
                    <div className={styles.featureCard}>
                        <div className={`${styles.iconWrapper} ${styles.bgBlue}`} style={{ marginBottom: '1rem' }}>
                            <TrendingUp size={32} className={styles.textBlue} />
                        </div>
                        <h3 className={styles.sectionTitle} style={{ marginBottom: '0.5rem' }}>Relatórios Financeiros</h3>
                        <p className={styles.cardLabel} style={{ maxWidth: '300px', margin: '0 auto', marginBottom: '1.5rem' }}>
                            O módulo financeiro está sendo preparado. Em breve você terá acesso a gráficos de custos, aprovações de cotações e análise de fornecedores.
                        </p>
                        <button disabled style={{
                            padding: '0.5rem 1rem',
                            border: '1px solid var(--color-border)',
                            borderRadius: '0.5rem',
                            color: 'var(--color-text-muted)',
                            cursor: 'not-allowed',
                            fontSize: '0.875rem'
                        }}>
                            Aguardando implementação
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
