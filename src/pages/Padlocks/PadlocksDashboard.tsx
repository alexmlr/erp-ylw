import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PadlockSaleModal } from './PadlockSaleModal';
import { StoreSaleModal } from './StoreSaleModal';
import { supabase } from '../../lib/supabase';
import type { PadlockSale, StoreSale, Unit } from '../../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Store, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Padlocks.module.css';

interface CombinedSaleRow {
    id: string;
    original_id: string;
    sale_date: string;
    unit_id: string;
    unit_name: string;
    payment_method: string;
    items_display: string;
    total_quantity: number;
    total_value: number | null;
    source: 'padlock' | 'store';
}

export const PadlocksDashboard: React.FC = () => {
    const { profile } = useAuth();
    const canManage = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'administrative';
    const [searchParams, setSearchParams] = useSearchParams();
    const isNewSale = searchParams.get('new') === 'true';

    // Padlock sales
    const [sales, setSales] = useState<PadlockSale[]>([]);
    const [editingSale, setEditingSale] = useState<PadlockSale | null>(null);

    // Store sales
    const [storeSales, setStoreSales] = useState<StoreSale[]>([]);
    const [showStoreSaleModal, setShowStoreSaleModal] = useState(false);

    const [loading, setLoading] = useState(true);

    // Padlock table filters
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterUnit, setFilterUnit] = useState('');
    const [filterPayment, setFilterPayment] = useState('');

    // Padlock pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Combined (Loja Yellow) table filters
    const [storeFilterStartDate, setStoreFilterStartDate] = useState('');
    const [storeFilterEndDate, setStoreFilterEndDate] = useState('');
    const [storeFilterUnit, setStoreFilterUnit] = useState('');
    const [storeFilterPayment, setStoreFilterPayment] = useState('');

    // Combined pagination
    const [storePage, setStorePage] = useState(1);
    const [storeItemsPerPage, setStoreItemsPerPage] = useState(25);

    // Units
    const [units, setUnits] = useState<Unit[]>([]);

    const paymentMethods = ['Dinheiro', 'PIX', 'Crédito', 'Débito', 'Promoção', 'Boleto'];

    const COLORS = [
        '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6',
        '#EC4899', '#EF4444', '#14B8A6', '#F97316', '#06B6D4',
        '#84CC16', '#A855F7',
    ];

    // ─── Data Fetching ─────────────────────────────────────────────────────────

    const fetchSales = async () => {
        try {
            setLoading(true);
            const [padlockResult, storeResult] = await Promise.all([
                supabase
                    .from('padlock_sales')
                    .select('*, unit:units(id, name)')
                    .order('sale_date', { ascending: false })
                    .order('created_at', { ascending: false }),
                supabase
                    .from('store_sales')
                    .select('*, unit:units(id, name)')
                    .order('sale_date', { ascending: false })
                    .order('created_at', { ascending: false }),
            ]);

            if (padlockResult.error) throw padlockResult.error;
            if (storeResult.error) throw storeResult.error;

            setSales(padlockResult.data || []);
            setStoreSales((storeResult.data || []) as StoreSale[]);
        } catch (error) {
            console.error('Error fetching sales:', error);
            alert('Erro ao carregar vendas.');
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

    // Reset padlock page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterStartDate, filterEndDate, filterUnit, filterPayment, itemsPerPage]);

    // Reset combined page on filter change
    useEffect(() => {
        setStorePage(1);
    }, [storeFilterStartDate, storeFilterEndDate, storeFilterUnit, storeFilterPayment, storeItemsPerPage]);

    // ─── Padlock Modal Handlers ────────────────────────────────────────────────

    const closeSaleModal = () => {
        searchParams.delete('new');
        setSearchParams(searchParams);
        setEditingSale(null);
    };

    const handleNewPadlockSale = () => {
        searchParams.set('new', 'true');
        setSearchParams(searchParams);
    };

    const handleEdit = (sale: PadlockSale) => {
        setEditingSale(sale);
    };

    const handleDelete = async (sale: PadlockSale) => {
        if (window.confirm('Tem certeza que deseja excluir esta venda de cadeado?')) {
            try {
                const { error } = await supabase.from('padlock_sales').delete().eq('id', sale.id);
                if (error) throw error;
                fetchSales();
            } catch (error) {
                console.error('Error deleting sale:', error);
                alert('Erro ao excluir venda.');
            }
        }
    };

    const handleDeleteCombined = async (row: CombinedSaleRow) => {
        if (window.confirm('Tem certeza que deseja excluir esta venda?')) {
            try {
                const table = row.source === 'padlock' ? 'padlock_sales' : 'store_sales';
                const { error } = await supabase.from(table).delete().eq('id', row.original_id);
                if (error) throw error;
                fetchSales();
            } catch (error) {
                console.error('Error deleting sale:', error);
                alert('Erro ao excluir venda.');
            }
        }
    };

    // ─── Padlock Filters & Pagination ─────────────────────────────────────────

    const filteredSales = useMemo(() => {
        return sales.filter(sale => {
            const saleDay = sale.sale_date.split('T')[0];
            if (filterStartDate && saleDay < filterStartDate) return false;
            if (filterEndDate && saleDay > filterEndDate) return false;
            if (filterUnit && sale.unit_id !== filterUnit) return false;
            if (filterPayment && sale.payment_method !== filterPayment) return false;
            return true;
        });
    }, [sales, filterStartDate, filterEndDate, filterUnit, filterPayment]);

    const totalFilteredItems = filteredSales.length;
    const totalPages = Math.max(1, Math.ceil(totalFilteredItems / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedSales = filteredSales.slice(startIndex, endIndex);
    const totalQuantity = useMemo(() => filteredSales.reduce((s, sale) => s + (sale.quantity || 1), 0), [filteredSales]);
    const hasActiveFilters = filterStartDate || filterEndDate || filterUnit || filterPayment;

    const clearFilters = () => {
        setFilterStartDate('');
        setFilterEndDate('');
        setFilterUnit('');
        setFilterPayment('');
    };

    // ─── Combined Data (Loja Yellow) ──────────────────────────────────────────

    const combinedSalesData = useMemo((): CombinedSaleRow[] => {
        const rows: CombinedSaleRow[] = [];

        sales.forEach(sale => {
            rows.push({
                id: `padlock_${sale.id}`,
                original_id: sale.id,
                sale_date: sale.sale_date,
                unit_id: sale.unit_id,
                unit_name: sale.unit?.name || 'Desconhecida',
                payment_method: sale.payment_method,
                items_display: `Cadeado ×${sale.quantity || 1}`,
                total_quantity: sale.quantity || 1,
                total_value: null,
                source: 'padlock',
            });
        });

        storeSales.forEach(sale => {
            const totalQty = sale.items.reduce((s, i) => s + i.quantity, 0);
            const totalValue = sale.items.reduce((s, i) => s + (i.value || 0), 0);
            const itemsDisplay = sale.items.map(i => `${i.name} ×${i.quantity}`).join(', ');
            rows.push({
                id: `store_${sale.id}`,
                original_id: sale.id,
                sale_date: sale.sale_date,
                unit_id: sale.unit_id,
                unit_name: sale.unit?.name || 'Desconhecida',
                payment_method: sale.payment_method,
                items_display: itemsDisplay || '—',
                total_quantity: totalQty,
                total_value: totalValue > 0 ? totalValue : null,
                source: 'store',
            });
        });

        rows.sort((a, b) => {
            const dA = a.sale_date.split('T')[0];
            const dB = b.sale_date.split('T')[0];
            if (dB > dA) return 1;
            if (dA > dB) return -1;
            return 0;
        });

        return rows;
    }, [sales, storeSales]);

    const filteredCombined = useMemo(() => {
        return combinedSalesData.filter(row => {
            const rowDay = row.sale_date.split('T')[0];
            if (storeFilterStartDate && rowDay < storeFilterStartDate) return false;
            if (storeFilterEndDate && rowDay > storeFilterEndDate) return false;
            if (storeFilterUnit && row.unit_id !== storeFilterUnit) return false;
            if (storeFilterPayment && row.payment_method !== storeFilterPayment) return false;
            return true;
        });
    }, [combinedSalesData, storeFilterStartDate, storeFilterEndDate, storeFilterUnit, storeFilterPayment]);

    const totalStoreCombined = filteredCombined.length;
    const totalStorePages = Math.max(1, Math.ceil(totalStoreCombined / storeItemsPerPage));
    const storeStartIndex = (storePage - 1) * storeItemsPerPage;
    const storeEndIndex = storeStartIndex + storeItemsPerPage;
    const paginatedCombined = filteredCombined.slice(storeStartIndex, storeEndIndex);
    const hasStoreActiveFilters = storeFilterStartDate || storeFilterEndDate || storeFilterUnit || storeFilterPayment;

    const clearStoreFilters = () => {
        setStoreFilterStartDate('');
        setStoreFilterEndDate('');
        setStoreFilterUnit('');
        setStoreFilterPayment('');
    };

    // ─── Charts Data ──────────────────────────────────────────────────────────

    // 1. Padlock Sales by Unit
    const salesByUnit = sales.reduce((acc, sale) => {
        const unitName = sale.unit?.name || 'Desconhecida';
        acc[unitName] = (acc[unitName] || 0) + (sale.quantity || 1);
        return acc;
    }, {} as Record<string, number>);
    const unitChartData = Object.entries(salesByUnit).map(([name, value]) => ({ name, value }));

    // 2. Padlock Sales by Payment
    const salesByPayment = sales.reduce((acc, sale) => {
        acc[sale.payment_method] = (acc[sale.payment_method] || 0) + (sale.quantity || 1);
        return acc;
    }, {} as Record<string, number>);
    const paymentChartData = Object.entries(salesByPayment).map(([name, value]) => ({ name, value }));

    // 3. All items sold (Loja Yellow)
    const allItemsChartData = useMemo(() => {
        const acc: Record<string, number> = {};
        sales.forEach(sale => {
            acc['Cadeado'] = (acc['Cadeado'] || 0) + (sale.quantity || 1);
        });
        storeSales.forEach(sale => {
            sale.items.forEach(item => {
                acc[item.name] = (acc[item.name] || 0) + item.quantity;
            });
        });
        return Object.entries(acc).map(([name, value]) => ({ name, value }));
    }, [sales, storeSales]);

    // 4. All sales by unit (Loja Yellow)
    const allUnitsChartData = useMemo(() => {
        const acc: Record<string, number> = {};
        sales.forEach(sale => {
            const u = sale.unit?.name || 'Desconhecida';
            acc[u] = (acc[u] || 0) + (sale.quantity || 1);
        });
        storeSales.forEach(sale => {
            const u = sale.unit?.name || 'Desconhecida';
            const qty = sale.items.reduce((s, i) => s + i.quantity, 0);
            acc[u] = (acc[u] || 0) + qty;
        });
        return Object.entries(acc).map(([name, value]) => ({ name, value }));
    }, [sales, storeSales]);

    // ─── Pagination Helpers ────────────────────────────────────────────────────

    const getPageNumbers = (currentP: number, totalP: number): (number | string)[] => {
        const pages: (number | string)[] = [];
        if (totalP <= 7) {
            for (let i = 1; i <= totalP; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentP > 3) pages.push('...');
            for (let i = Math.max(2, currentP - 1); i <= Math.min(totalP - 1, currentP + 1); i++) {
                pages.push(i);
            }
            if (currentP < totalP - 2) pages.push('...');
            pages.push(totalP);
        }
        return pages;
    };

    const formatDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('T')[0].split('-');
        return `${d}/${m}/${y}`;
    };

    const formatCurrency = (value: number) =>
        value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>
                    <Store size={28} /> Loja Yellow
                </h1>
                <div className={styles.headerActions}>
                    <button onClick={handleNewPadlockSale} className={styles.primaryButton}>
                        <Lock size={18} /> Venda de Cadeado
                    </button>
                    <button onClick={() => setShowStoreSaleModal(true)} className={styles.secondaryButton}>
                        <Plus size={18} /> Nova Venda
                    </button>
                </div>
            </div>

            {loading ? (
                <div className={styles.loadingText}>Carregando...</div>
            ) : (
                <>
                    {/* ── 1. COMBINED TABLE: Histórico de Vendas da Loja Yellow ─ */}
                    <div className={styles.modernTableContainer}>
                        <div className={styles.tableHeader}>
                            <h2 className={styles.tableTitle}>Histórico de Vendas da Loja Yellow</h2>
                            <div className={styles.filtersBar}>
                                <div className={styles.filterGroup}>
                                    <label className={styles.filterLabel}>De:</label>
                                    <input
                                        type="date"
                                        value={storeFilterStartDate}
                                        onChange={(e) => setStoreFilterStartDate(e.target.value)}
                                        className={styles.filterInput}
                                    />
                                </div>
                                <div className={styles.filterGroup}>
                                    <label className={styles.filterLabel}>Até:</label>
                                    <input
                                        type="date"
                                        value={storeFilterEndDate}
                                        onChange={(e) => setStoreFilterEndDate(e.target.value)}
                                        className={styles.filterInput}
                                    />
                                </div>
                                <div className={styles.filterGroup}>
                                    <label className={styles.filterLabel}>Unidade:</label>
                                    <select
                                        value={storeFilterUnit}
                                        onChange={(e) => setStoreFilterUnit(e.target.value)}
                                        className={styles.filterSelect}
                                    >
                                        <option value="">Todas</option>
                                        {units.map(unit => (
                                            <option key={unit.id} value={unit.id}>{unit.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.filterGroup}>
                                    <label className={styles.filterLabel}>Pagamento:</label>
                                    <select
                                        value={storeFilterPayment}
                                        onChange={(e) => setStoreFilterPayment(e.target.value)}
                                        className={styles.filterSelect}
                                    >
                                        <option value="">Todos</option>
                                        {paymentMethods.map(method => (
                                            <option key={method} value={method}>{method}</option>
                                        ))}
                                    </select>
                                </div>
                                {hasStoreActiveFilters && (
                                    <button
                                        onClick={clearStoreFilters}
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
                                        <th>Itens</th>
                                        <th>Qtd. Total</th>
                                        <th>Valor Total</th>
                                        <th>Tipo</th>
                                        {canManage && <th>Ações</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedCombined.length > 0 ? (
                                        paginatedCombined.map((row) => (
                                            <tr key={row.id} className={styles.modernRow}>
                                                <td className={styles.modernCell}>{formatDate(row.sale_date)}</td>
                                                <td className={styles.modernCell}>{row.unit_name}</td>
                                                <td className={styles.modernCell}>
                                                    <span className={styles.paymentBadge}>{row.payment_method}</span>
                                                </td>
                                                <td className={styles.modernCell}>
                                                    <span className={styles.itemsList}>{row.items_display}</span>
                                                </td>
                                                <td className={styles.modernCell} style={{ fontWeight: 600 }}>
                                                    {row.total_quantity}
                                                </td>
                                                <td className={styles.modernCell}>
                                                    {row.total_value !== null
                                                        ? <span className={styles.valueText}>{formatCurrency(row.total_value)}</span>
                                                        : <span className={styles.emptyValue}>—</span>
                                                    }
                                                </td>
                                                <td className={styles.modernCell}>
                                                    {row.source === 'padlock'
                                                        ? <span className={styles.typeBadgePadlock}>Cadeado</span>
                                                        : <span className={styles.typeBadgeStore}>Loja</span>
                                                    }
                                                </td>
                                                {canManage && (
                                                    <td className={styles.modernCell}>
                                                        <div className={styles.actionsWrapper}>
                                                            <button
                                                                className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                                                                onClick={() => handleDeleteCombined(row)}
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
                                            <td colSpan={canManage ? 8 : 7} className={styles.emptyText}>
                                                {hasStoreActiveFilters
                                                    ? 'Nenhuma venda encontrada para os filtros selecionados.'
                                                    : 'Nenhuma venda registrada ainda.'
                                                }
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Total Row */}
                        <div className={styles.totalRow}>
                            <span className={styles.totalLabel}>
                                Total de itens vendidos{hasStoreActiveFilters ? ' (filtrados)' : ''}:
                            </span>
                            <span className={styles.totalValue}>
                                {filteredCombined.reduce((s, r) => s + r.total_quantity, 0)}
                            </span>
                        </div>

                        {/* Pagination */}
                        <div className={styles.paginationFooter}>
                            <div className={styles.itemsPerPage}>
                                <label>Itens por página:</label>
                                <select
                                    value={storeItemsPerPage}
                                    onChange={(e) => setStoreItemsPerPage(Number(e.target.value))}
                                    className={styles.itemsPerPageSelect}
                                >
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                            <div className={styles.paginationInfo}>
                                {totalStoreCombined > 0
                                    ? `${storeStartIndex + 1}–${Math.min(storeEndIndex, totalStoreCombined)} de ${totalStoreCombined}`
                                    : '0 itens'
                                }
                            </div>
                            <div className={styles.paginationControls}>
                                <button className={styles.paginationButton} onClick={() => setStorePage(1)} disabled={storePage === 1} title="Primeira página"><ChevronsLeft size={18} /></button>
                                <button className={styles.paginationButton} onClick={() => setStorePage(p => Math.max(1, p - 1))} disabled={storePage === 1} title="Página anterior"><ChevronLeft size={18} /></button>
                                {getPageNumbers(storePage, totalStorePages).map((page, idx) => (
                                    typeof page === 'number' ? (
                                        <button
                                            key={idx}
                                            className={`${styles.paginationButton} ${storePage === page ? styles.paginationButtonActive : ''}`}
                                            onClick={() => setStorePage(page)}
                                        >
                                            {page}
                                        </button>
                                    ) : (
                                        <span key={idx} className={styles.paginationEllipsis}>...</span>
                                    )
                                ))}
                                <button className={styles.paginationButton} onClick={() => setStorePage(p => Math.min(totalStorePages, p + 1))} disabled={storePage === totalStorePages} title="Próxima página"><ChevronRight size={18} /></button>
                                <button className={styles.paginationButton} onClick={() => setStorePage(totalStorePages)} disabled={storePage === totalStorePages} title="Última página"><ChevronsRight size={18} /></button>
                            </div>
                        </div>
                    </div>

                    {/* ── 2. PADLOCK TABLE: Histórico de Vendas de Cadeados ─────── */}
                    <div className={styles.modernTableContainer} style={{ marginTop: '2rem' }}>
                        <div className={styles.tableHeader}>
                            <h2 className={styles.tableTitle}>Histórico de Vendas de Cadeados</h2>
                            <div className={styles.filtersBar}>
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
                                                <td className={styles.modernCell}>{formatDate(sale.sale_date)}</td>
                                                <td className={styles.modernCell}>{sale.unit?.name || 'Desconhecida'}</td>
                                                <td className={styles.modernCell}>
                                                    <span className={styles.paymentBadge}>{sale.payment_method}</span>
                                                </td>
                                                <td className={styles.modernCell} style={{ fontWeight: 600 }}>
                                                    {sale.quantity || 1}
                                                </td>
                                                <td className={styles.modernCell}>
                                                    {sale.postagem_verificada
                                                        ? <span className={styles.verifiedBadge}>Sim</span>
                                                        : <span className={styles.unverifiedBadge}>Não</span>
                                                    }
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
                                                {hasActiveFilters
                                                    ? 'Nenhuma venda encontrada para os filtros selecionados.'
                                                    : 'Nenhuma venda de cadeado registrada ainda.'
                                                }
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

                        {/* Pagination */}
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
                                <button className={styles.paginationButton} onClick={() => setCurrentPage(1)} disabled={currentPage === 1} title="Primeira página"><ChevronsLeft size={18} /></button>
                                <button className={styles.paginationButton} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} title="Página anterior"><ChevronLeft size={18} /></button>
                                {getPageNumbers(currentPage, totalPages).map((page, idx) => (
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
                                <button className={styles.paginationButton} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} title="Próxima página"><ChevronRight size={18} /></button>
                                <button className={styles.paginationButton} onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} title="Última página"><ChevronsRight size={18} /></button>
                            </div>
                        </div>
                    </div>

                    {/* ── 3. CHARTS SECTION (PLACED AFTER THE TABLES) ────────────────── */}
                    <div className={styles.chartsSection} style={{ marginTop: '2.5rem' }}>
                        <p className={styles.chartsSectionLabel}>
                            <Store size={14} /> Desempenho e Indicadores de Vendas
                        </p>

                        <div className={styles.chartsGrid2}>
                            {/* Chart 1: Padlock Sales by Unit */}
                            <div className={styles.chartCard}>
                                <h2 className={styles.chartTitle}>Vendas por Unidade (Cadeados)</h2>
                                <div className={styles.chartContainer}>
                                    {unitChartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={unitChartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={55}
                                                    outerRadius={78}
                                                    paddingAngle={4}
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

                            {/* Chart 2: Padlock Sales by Payment Method */}
                            <div className={styles.chartCard}>
                                <h2 className={styles.chartTitle}>Vendas por Forma de Pagamento (Cadeados)</h2>
                                <div className={styles.chartContainer}>
                                    {paymentChartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={paymentChartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={55}
                                                    outerRadius={78}
                                                    paddingAngle={4}
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

                            {/* Chart 3: All items sold (Loja Yellow) */}
                            <div className={styles.chartCard}>
                                <h2 className={styles.chartTitle}>Itens mais Vendidos (Loja Yellow)</h2>
                                <div className={styles.chartContainer}>
                                    {allItemsChartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={allItemsChartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={55}
                                                    outerRadius={78}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                                >
                                                    {allItemsChartData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => [`${value} unid.`, 'Quantidade']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className={styles.emptyText}>Nenhum dado</div>
                                    )}
                                </div>
                            </div>

                            {/* Chart 4: All sales by unit (Loja Yellow) */}
                            <div className={styles.chartCard}>
                                <h2 className={styles.chartTitle}>Unidades que mais Vendem (Loja Yellow)</h2>
                                <div className={styles.chartContainer}>
                                    {allUnitsChartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={allUnitsChartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={55}
                                                    outerRadius={78}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                                >
                                                    {allUnitsChartData.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => [`${value} unid. vendidas`, 'Total']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className={styles.emptyText}>Nenhum dado</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Padlock Sale Modal */}
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

            {/* Store Sale Modal */}
            {showStoreSaleModal && (
                <StoreSaleModal
                    onClose={() => setShowStoreSaleModal(false)}
                    onSuccess={() => {
                        setShowStoreSaleModal(false);
                        fetchSales();
                    }}
                />
            )}
        </div>
    );
};
