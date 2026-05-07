import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PadlockSaleModal } from './PadlockSaleModal';
import { supabase } from '../../lib/supabase';
import type { PadlockSale } from '../../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, Plus, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Padlocks.module.css';

export const PadlocksDashboard: React.FC = () => {
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'admin';
    const [searchParams, setSearchParams] = useSearchParams();
    const isNewSale = searchParams.get('new') === 'true';
    const [sales, setSales] = useState<PadlockSale[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingSale, setEditingSale] = useState<PadlockSale | null>(null);

    const fetchSales = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('padlock_sales')
                .select('*, unit:units(id, name)')
                .order('sale_date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSales(data || []);
        } catch (error) {
            console.error('Error fetching padlock sales:', error);
            alert('Erro ao carregar vendas de cadeados.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, []);

    const closeSaleModal = () => {
        searchParams.delete('new');
        setSearchParams(searchParams);
        setEditingSale(null);
    };

    const handleNewSale = () => {
        searchParams.set('new', 'true');
        setSearchParams(searchParams);
    };

    const handleEdit = (sale: PadlockSale) => {
        setEditingSale(sale);
    };

    const handleDelete = async (sale: PadlockSale) => {
        if (window.confirm('Tem certeza que deseja excluir esta venda?')) {
            try {
                const { error } = await supabase
                    .from('padlock_sales')
                    .delete()
                    .eq('id', sale.id);

                if (error) throw error;
                fetchSales();
            } catch (error) {
                console.error('Error deleting sale:', error);
                alert('Erro ao excluir venda.');
            }
        }
    };

    // Calculate data for charts
    const salesByUnit = sales.reduce((acc, sale) => {
        const unitName = sale.unit?.name || 'Desconhecida';
        acc[unitName] = (acc[unitName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const unitChartData = Object.entries(salesByUnit).map(([name, value]) => ({ name, value }));

    const salesByPayment = sales.reduce((acc, sale) => {
        acc[sale.payment_method] = (acc[sale.payment_method] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const paymentChartData = Object.entries(salesByPayment).map(([name, value]) => ({ name, value }));

    const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>
                    <FileText size={28} /> Venda de Cadeados
                </h1>
                <button
                    onClick={handleNewSale}
                    className={styles.primaryButton}
                >
                    <Plus size={20} /> Nova Venda
                </button>
            </div>

            {loading ? (
                <div className={styles.loadingText}>Carregando...</div>
            ) : (
                <>
                    <div className={styles.chartsGrid}>
                        {/* Chart 1: Sales by Unit */}
                        <div className={styles.chartCard}>
                            <h2 className={styles.chartTitle}>Vendas por Unidade (Qtd)</h2>
                            <div className={styles.chartContainer}>
                                {unitChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={unitChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                            >
                                                {unitChartData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => [`${value} unidades`, 'Quantidade']} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className={styles.emptyText}>Nenhum dado</div>
                                )}
                            </div>
                        </div>

                        {/* Chart 2: Sales by Payment Method */}
                        <div className={styles.chartCard}>
                            <h2 className={styles.chartTitle}>Vendas por Forma de Pagamento</h2>
                            <div className={styles.chartContainer}>
                                {paymentChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={paymentChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                            >
                                                {paymentChartData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => [`${value} vendas`, 'Quantidade']} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className={styles.emptyText}>Nenhum dado</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className={styles.modernTableContainer}>
                        <div className={styles.tableHeader}>
                            <h2 className={styles.tableTitle}>Histórico de Vendas</h2>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className={styles.modernTable}>
                                <thead className={styles.modernHeader}>
                                    <tr>
                                        <th>Data</th>
                                        <th>Unidade</th>
                                        <th>Forma de Pagamento</th>
                                        <th>Valor</th>
                                        {isAdmin && <th>Ações</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sales.length > 0 ? (
                                        sales.map((sale) => (
                                            <tr key={sale.id} className={styles.modernRow}>
                                                <td className={styles.modernCell}>
                                                    {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className={styles.modernCell}>{sale.unit?.name || 'Desconhecida'}</td>
                                                <td className={styles.modernCell}>
                                                    <span className={styles.paymentBadge}>
                                                        {sale.payment_method}
                                                    </span>
                                                </td>
                                                <td className={styles.modernCell} style={{ fontWeight: 600 }}>
                                                    R$ {Number(sale.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                {isAdmin && (
                                                    <td className={styles.modernCell}>
                                                        <div className={styles.actionsWrapper}>
                                                            <button 
                                                                className={styles.actionButton} 
                                                                onClick={() => handleEdit(sale)}
                                                                title="Editar"
                                                            >
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button 
                                                                className={`${styles.actionButton} ${styles.actionButtonDanger}`} 
                                                                onClick={() => handleDelete(sale)}
                                                                title="Excluir"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={isAdmin ? 5 : 4} className={styles.emptyText}>
                                                Nenhuma venda registrada ainda.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {(isNewSale || editingSale) && (
                <PadlockSaleModal 
                    onClose={closeSaleModal} 
                    onSuccess={() => {
                        closeSaleModal();
                        fetchSales();
                    }}
                    initialData={editingSale}
                />
            )}
        </div>
    );
};
