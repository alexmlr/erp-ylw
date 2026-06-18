import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PadlockSaleModal } from './PadlockSaleModal';
import { supabase } from '../../lib/supabase';
import type { PadlockSale, Unit } from '../../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Padlocks.module.css';

export const PadlocksDashboard: React.FC = () => {
    const { profile } = useAuth();
    const canManage = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'administrative';
    const [searchParams, setSearchParams] = useSearchParams();
    const isNewSale = searchParams.get('new') === 'true';
    const [sales, setSales] = useState<PadlockSale[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingSale, setEditingSale] = useState<PadlockSale | null>(null);

    // Filters
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterUnit, setFilterUnit] = useState('');
    const [filterPayment, setFilterPayment] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Units for filter
    const [units, setUnits] = useState<Unit[]>([]);

    const paymentMethods = ['Dinheiro', 'PIX', 'Crédito', 'Débito', 'Promoção', 'Boleto'];

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

    const fetchUnits = async () => {
        try {
            const { data, error } = await supabase
                .from('units')
                .select('*')
                .eq('active', true)
                .order('name');

            if (error) throw error;
            setUnits(data || []);
        } catch (error) {
            console.error('Error fetching units:', error);
        }
    };

    useEffect(() => {
        fetchSales();
        fetchUnits();
    }, []);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterStartDate, filterEndDate, filterUnit, filterPayment, itemsPerPage]);

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

    // Filtered sales
    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            // Date filter
            if (filterStartDate) {
                const saleDate = sale.sale_date.split('T')[0];
                if (saleDate < filterStartDate) return false;
            }
            if (filterEndDate) {
                const saleDate = sale.sale_date.split('T')[0];
                if (saleDate > filterEndDate) return false;
            }
            // Unit filter
            if (filterUnit && sale.unit_id !== filterUnit) return false;
            // Payment method filter
            if (filterPayment && sale.payment_method !== filterPayment) return false;

            return true;
        });
    }, [sales, filterStartDate, filterEndDate, filterUnit, filterPayment]);

    // Pagination calculations
    const totalFilteredItems = filteredSales.length;
    const totalPages = Math.max(1, Math.ceil(totalFilteredItems / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedSales = filteredSales.slice(startIndex, endIndex);

    // Total quantity (sum of quantity for filtered items)
    const totalQuantity = useMemo(() => {
        return filteredSales.reduce((sum, sale) => sum + (sale.quantity || 1), 0);
    }, [filteredSales]);

    // Check if any filter is active
    const hasActiveFilters = filterStartDate || filterEndDate || filterUnit || filterPayment;

    const clearFilters = () => {
        setFilterStartDate('');
        setFilterEndDate('');
        setFilterUnit('');
        setFilterPayment('');
    };

    // Calculate data for charts (based on ALL sales, not filtered)
    const salesByUnit = sales.reduce((acc, sale) => {
        const unitName = sale.unit?.name || 'Desconhecida';
        acc[unitName] = (acc[unitName] || 0) + (sale.quantity || 1);
        return acc;
    }, {} as Record<string, number>);

    const unitChartData = Object.entries(salesByUnit).map(([name, value]) => ({ name, value }));

    const salesByPayment = sales.reduce((acc, sale) => {
        acc[sale.payment_method] = (acc[sale.payment_method] || 0) + (sale.quantity || 1);
        return acc;
    }, {} as Record<string, number>);

    const paymentChartData = Object.entries(salesByPayment).map(([name, value]) => ({ name, value }));

    const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];

    // Pagination helpers
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                pages.push(i);
            }
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

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
                            <div className={styles.filtersBar}>
                                {/* Date Range Filters */}
                                <div className={styles.filterGroup}>
                                    <label className={styles.filterLabel}>De:</label>
                                    <input
                                        type="date"
                                        value={filterStartDate}
                                        onChange={(e) => setFilterStartDate(e.target.value)}
                                        className={styles.filterInput}
                                    />
                                </div>
                                <div className={styles.filterGroup}>
                                    <label className={styles.filterLabel}>Até:</label>
                                    <input
                                        type="date"
                                        value={filterEndDate}
                                        onChange={(e) => setFilterEndDate(e.target.value)}
                                        className={styles.filterInput}
                                    />
                                </div>

                                {/* Unit Filter */}
                                <div className={styles.filterGroup}>
                                    <label className={styles.filterLabel}>Unidade:</label>
                                    <select
                                        value={filterUnit}
                                        onChange={(e) => setFilterUnit(e.target.value)}
                                        className={styles.filterSelect}
                                    >
                                        <option value="">Todas</option>
                                        {units.map(unit => (
                                            <option key={unit.id} value={unit.id}>{unit.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Payment Method Filter */}
                                <div className={styles.filterGroup}>
                                    <label className={styles.filterLabel}>Pagamento:</label>
                                    <select
                                        value={filterPayment}
                                        onChange={(e) => setFilterPayment(e.target.value)}
                                        className={styles.filterSelect}
                                    >
                                        <option value="">Todos</option>
                                        {paymentMethods.map(method => (
                                            <option key={method} value={method}>{method}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Clear Filters Button */}
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearFilters}
                                        className={styles.clearFiltersButton}
                                        title="Limpar filtros"
                                    >
                                        <Filter size={16} />
                                        Limpar
                                    </button>
                                )}
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className={styles.modernTable}>
                                <thead className={styles.modernHeader}>
                                    <tr>
                                        <th>Data</th>
                                        <th>Unidade</th>
                                        <th>Forma de Pagamento</th>
                                        <th>Quantidade</th>
                                        <th>Postagem</th>
                                        {canManage && <th>Ações</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedSales.length > 0 ? (
                                        paginatedSales.map((sale) => (
                                            <tr key={sale.id} className={styles.modernRow}>
                                                <td className={styles.modernCell}>
                                                    {/* Parseia a data diretamente da string para evitar deslocamento de fuso UTC */}
                                                    {(() => {
                                                        const [y, m, d] = sale.sale_date.split('T')[0].split('-');
                                                        return `${d}/${m}/${y}`;
                                                    })()}
                                                </td>
                                                <td className={styles.modernCell}>{sale.unit?.name || 'Desconhecida'}</td>
                                                <td className={styles.modernCell}>
                                                    <span className={styles.paymentBadge}>
                                                        {sale.payment_method}
                                                    </span>
                                                </td>
                                                <td className={styles.modernCell} style={{ fontWeight: 600 }}>
                                                    {sale.quantity || 1}
                                                </td>
                                                <td className={styles.modernCell}>
                                                    {sale.postagem_verificada ? (
                                                        <span className={styles.verifiedBadge}>Sim</span>
                                                    ) : (
                                                        <span className={styles.unverifiedBadge}>Não</span>
                                                    )}
                                                </td>
                                                {canManage && (
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
                                            <td colSpan={canManage ? 6 : 5} className={styles.emptyText}>
                                                {hasActiveFilters ? 'Nenhuma venda encontrada para os filtros selecionados.' : 'Nenhuma venda registrada ainda.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Total Row */}
                        <div className={styles.totalRow}>
                            <span className={styles.totalLabel}>
                                Total de cadeados{hasActiveFilters ? ' (filtrados)' : ''}:
                            </span>
                            <span className={styles.totalValue}>{totalQuantity}</span>
                        </div>

                        {/* Pagination Footer */}
                        <div className={styles.paginationFooter}>
                            <div className={styles.itemsPerPage}>
                                <label>Itens por página:</label>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                    className={styles.itemsPerPageSelect}
                                >
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>

                            <div className={styles.paginationInfo}>
                                {totalFilteredItems > 0
                                    ? `${startIndex + 1}–${Math.min(endIndex, totalFilteredItems)} de ${totalFilteredItems}`
                                    : '0 itens'
                                }
                            </div>

                            <div className={styles.paginationControls}>
                                <button
                                    className={styles.paginationButton}
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    title="Primeira página"
                                >
                                    <ChevronsLeft size={18} />
                                </button>
                                <button
                                    className={styles.paginationButton}
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    title="Página anterior"
                                >
                                    <ChevronLeft size={18} />
                                </button>

                                {getPageNumbers().map((page, idx) => (
                                    typeof page === 'number' ? (
                                        <button
                                            key={idx}
                                            className={`${styles.paginationButton} ${currentPage === page ? styles.paginationButtonActive : ''}`}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    ) : (
                                        <span key={idx} className={styles.paginationEllipsis}>...</span>
                                    )
                                ))}

                                <button
                                    className={styles.paginationButton}
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    title="Próxima página"
                                >
                                    <ChevronRight size={18} />
                                </button>
                                <button
                                    className={styles.paginationButton}
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    title="Última página"
                                >
                                    <ChevronsRight size={18} />
                                </button>
                            </div>
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
