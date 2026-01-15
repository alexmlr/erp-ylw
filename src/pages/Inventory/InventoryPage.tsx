import React, { useState, useEffect } from 'react';
import { Plus, Minus, AlertTriangle, AlertOctagon, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import styles from './Inventory.module.css';
import { InboundModal } from './InboundModal';
import { OutboundModal } from './OutboundModal';

interface Product {
    id: string;
    name: string;
    quantity: number;
    min_quantity: number;
    unit: string;
}

interface Movement {
    id: string;
    type: 'IN' | 'OUT';
    created_at: string;
    movement_date?: string;
    quantity: number;
    product: { name: string };
    user: { full_name: string };
}

export const InventoryPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [sortColumn, setSortColumn] = useState('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Modals
    const [showInbound, setShowInbound] = useState(false);
    const [showOutbound, setShowOutbound] = useState(false);

    // Recent Movements
    const [recentInbound, setRecentInbound] = useState<Movement[]>([]);
    const [recentOutbound, setRecentOutbound] = useState<Movement[]>([]);

    const fetchInventory = async () => {
        try {
            // Fetch Products with Stock
            const { data: productsData, count } = await supabase
                .from('products')
                .select('id, name, quantity, min_quantity, unit', { count: 'exact' })
                .order(sortColumn, { ascending: sortDirection === 'asc' })
                .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

            if (productsData) setProducts(productsData);
            if (count) setTotalPages(Math.ceil(count / itemsPerPage));

            // Fetch Recent Inbound
            const { data: inData } = await supabase
                .from('inventory_movements')
                .select('id, type, created_at, movement_date, quantity, product:products(name), user:profiles(full_name)')
                .eq('type', 'IN')
                .order('created_at', { ascending: false })
                .limit(5);
            setRecentInbound(inData as any || []);

            // Fetch Recent Outbound
            const { data: outData } = await supabase
                .from('inventory_movements')
                .select('id, type, created_at, movement_date, quantity, product:products(name), user:profiles(full_name)')
                .eq('type', 'OUT')
                .order('created_at', { ascending: false })
                .limit(5);
            setRecentOutbound(outData as any || []);

        } catch (error) {

            console.error('Error fetching inventory:', error);
            // alert('Erro ao carregar inventário: ' + (error.message || 'Erro desconhecido'));
        }
    };

    useEffect(() => {
        fetchInventory();
    }, [page, itemsPerPage, sortColumn, sortDirection]);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
        setPage(1); // Reset to first page on sort change
    };

    const renderSortIcon = (column: string) => {
        if (sortColumn !== column) return <ArrowUpDown size={14} className="text-gray-400" />;
        return sortDirection === 'asc'
            ? <ArrowUp size={14} className="text-yellow-600" />
            : <ArrowDown size={14} className="text-yellow-600" />;
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Inventário</h1>
                <div className={styles.actions}>
                    <button className={styles.inboundButton} onClick={() => setShowInbound(true)}>
                        <Plus size={20} />
                        Entrada de Material
                    </button>
                    <button className={styles.outboundButton} onClick={() => setShowOutbound(true)}>
                        <Minus size={20} />
                        Retirada de Material
                    </button>
                </div>
            </div>

            <div className={styles.grid}>
                {/* Stock List */}
                <div className={styles.stockCard}>
                    <h2>Estoque Atual</h2>
                    <div className={styles.tableResponsive}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('name')} className="cursor-pointer hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-2">
                                            Produto
                                            {renderSortIcon('name')}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('quantity')} className="cursor-pointer hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-2">
                                            Qtd.
                                            {renderSortIcon('quantity')}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('unit')} className="cursor-pointer hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-2">
                                            Un.
                                            {renderSortIcon('unit')}
                                        </div>
                                    </th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(product => {
                                    const isLow = product.quantity <= (product.min_quantity || 0) && product.quantity > 0;
                                    const isEmpty = product.quantity === 0;

                                    return (
                                        <tr key={product.id}>
                                            <td>
                                                <Link to={`/inventory/product/${product.id}`} className="text-blue-600 hover:text-blue-800 font-medium hover:underline">
                                                    {product.name}
                                                </Link>
                                            </td>
                                            <td>{product.quantity}</td>
                                            <td>{product.unit}</td>
                                            <td>
                                                {isEmpty && (
                                                    <span title="Estoque Zerado">
                                                        <AlertOctagon size={20} color="red" />
                                                    </span>
                                                )}
                                                {isLow && (
                                                    <span title="Estoque Baixo">
                                                        <AlertTriangle size={20} color="#F59E0B" />
                                                    </span>
                                                )}
                                                {!isEmpty && !isLow && <span className={styles.okBadge}>OK</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className={styles.pagination}>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Itens por página:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="border border-gray-300 rounded px-2 py-1 bg-white"
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                            <span>{page} de {totalPages}</span>
                            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</button>
                        </div>
                    </div>
                </div>

                {/* Movements Summaries */}
                <div className={styles.sidePanel}>
                    {/* Inbound Summary */}
                    <div className={styles.summaryCard}>
                        <div className={styles.cardHeader}>
                            <h3>Últimas Entradas</h3>
                            <Link to="/inventory/movements?type=IN" className={styles.link}>Ver todas</Link>
                        </div>
                        <ul className={styles.movementList}>
                            {recentInbound.map(m => (
                                <li key={m.id} className={styles.movementItem}>
                                    <span className={styles.movementDate}>
                                        {new Date(m.movement_date || m.created_at).toLocaleDateString()}
                                    </span>
                                    <div>
                                        <strong>{m.product?.name}</strong>
                                        <div>+{m.quantity} (por {m.user?.full_name?.split(' ')[0]})</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Outbound Summary */}
                    <div className={styles.summaryCard}>
                        <div className={styles.cardHeader}>
                            <h3>Últimas Saídas</h3>
                            <Link to="/inventory/movements?type=OUT" className={styles.link}>Ver todas</Link>
                        </div>
                        <ul className={styles.movementList}>
                            {recentOutbound.map(m => (
                                <li key={m.id} className={styles.movementItem}>
                                    <span className={styles.movementDate}>
                                        {new Date(m.movement_date || m.created_at).toLocaleDateString()}
                                    </span>
                                    <div>
                                        <strong>{m.product?.name}</strong>
                                        <div>-{m.quantity} (por {m.user?.full_name?.split(' ')[0]})</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <InboundModal
                isOpen={showInbound}
                onClose={() => setShowInbound(false)}
                onSuccess={fetchInventory}
            />
            <OutboundModal
                isOpen={showOutbound}
                onClose={() => setShowOutbound(false)}
                onSuccess={fetchInventory}
            />
        </div>
    );
};
