import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Calendar, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import styles from './Inventory.module.css';

interface ProductDetails {
    id: string;
    name: string;
    description?: string;
    quantity: number;
    min_quantity: number;
    unit: string;
    image_url: string | null;
    category: string;
}

interface Movement {
    id: string;
    type: 'IN' | 'OUT';
    created_at: string;
    movement_date?: string;
    quantity: number;
    unit_id?: string;
    unit?: { name: string };
    user: { full_name: string };
}

interface PriceHistoryPoint {
    date: string;
    timestamp: number;
    price: number;
    quotationId: string;
}

export const ProductDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [product, setProduct] = useState<ProductDetails | null>(null);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [units, setUnits] = useState<{ id: string, name: string }[]>([]);

    const { profile } = useAuth();
    const canViewPrices = profile?.role === 'admin' || profile?.role === 'manager';

    // Filters
    const [selectedUnit, setSelectedUnit] = useState<string>('all');
    const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        fetchData();
        fetchUnits();
    }, [id]);

    const fetchUnits = async () => {
        const { data } = await supabase.from('units').select('id, name').eq('active', true);
        if (data) setUnits(data);
    };

    const fetchData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            // Fetch Product
            const { data: prodData, error: prodError } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single();

            if (prodError) throw prodError;
            setProduct(prodData);

            // Fetch Movements
            const { data: movData, error: movError } = await supabase
                .from('inventory_movements')
                .select(`
                    id, type, created_at, movement_date, quantity, unit_id,
                    unit:units(name),
                    user:profiles(full_name)
                `)
                .eq('product_id', id)
                .order('created_at', { ascending: true }); // Ascending for chart calculation



            if (movError) throw movError;
            setMovements(movData as any || []);

            // Fetch Price History (Approved Quotations)
            if (canViewPrices) {
                const { data: priceData, error: priceError } = await supabase
                    .from('quotation_products')
                    .select(`
                        id,
                        quotation:quotations!inner (
                            id, created_at, status, display_id
                        ),
                        prices:quotation_product_prices (
                            unit_price
                        )
                    `)
                    .eq('product_id', id)
                    .eq('quotation.status', 'approved');

                if (priceError) {
                    console.error('Error fetching prices:', priceError);
                } else {
                    const history = priceData.map((item: any) => {
                        // Find lowest price in this approved quote
                        const minPrice = item.prices?.reduce((min: number, p: any) =>
                            p.unit_price < min ? p.unit_price : min
                            , Infinity) || 0;

                        if (minPrice === Infinity || minPrice === 0) return null;

                        return {
                            date: new Date(item.quotation.created_at).toLocaleDateString(),
                            timestamp: new Date(item.quotation.created_at).getTime(),
                            price: minPrice,
                            quotationId: item.quotation.display_id
                        };
                    })
                        .filter(Boolean)
                        .sort((a: any, b: any) => a.timestamp - b.timestamp);

                    setPriceHistory(history as PriceHistoryPoint[]);
                }
            }

        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Carregando detalhes...</div>;
    if (!product) return <div className="p-8 text-center">Produto não encontrado.</div>;

    // --- Process Data for Charts ---

    // 1. Stock Fluctuation (Line Chart)
    // Calculate backwards from current stock to ensure accuracy
    let runningStock = product.quantity;

    const fluctuationData = [...movements]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Newest first
        .map(m => {
            // The stock level recorded for this timestamp is the state AFTER the movement (which is the current runningStock)
            const point = {
                date: new Date(m.movement_date || m.created_at).toLocaleDateString(),
                timestamp: new Date(m.movement_date || m.created_at).getTime(),
                stock: runningStock,
                type: m.type,
                quantity: m.quantity
            };

            // Reverse the movement to prepare for the next (older) iteration
            if (m.type === 'IN') {
                runningStock -= m.quantity;
            } else {
                runningStock += m.quantity;
            }

            return point;
        })
        .sort((a, b) => a.timestamp - b.timestamp); // Sort back to Oldest -> Newest for chart

    // 2. Consumption by Unit (Pie Chart) - Filtered by Month
    const filteredMovements = movements.filter(m => {
        const date = new Date(m.movement_date || m.created_at);
        const mMonth = date.toISOString().slice(0, 7);
        return mMonth === monthFilter;
    });

    const consumptionByUnit = filteredMovements
        .filter(m => m.type === 'OUT' && m.unit)
        .reduce((acc, curr) => {
            const unitName = curr.unit?.name || 'Desconhecida';
            acc[unitName] = (acc[unitName] || 0) + curr.quantity;
            return acc;
        }, {} as Record<string, number>);

    const pieData = Object.entries(consumptionByUnit).map(([name, value]) => ({ name, value }));
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // 3. Filtered History Table
    const tableHistory = movements
        .filter(m => selectedUnit === 'all' || m.unit_id === selectedUnit)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Newest first

    return (
        <div className={styles.container}>
            <button onClick={() => navigate('/inventory')} className={styles.backButton}>
                <ArrowLeft size={20} />
                Voltar
            </button>

            {/* Header / Product Info */}
            <div className={styles.detailsHeader}>
                <div className={styles.productImageContainer}>
                    {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className={styles.productImage} />
                    ) : (
                        <Package size={48} color="#9CA3AF" />
                    )}
                </div>
                <div className={styles.productInfo}>
                    <h1 className={styles.productTitle}>{product.name}</h1>
                    <div className={styles.statGrid}>
                        <div className={styles.statCard}>
                            <span className={styles.statLabel}>Estoque Atual</span>
                            <span className={styles.statValue}>{product.quantity} <span className={styles.statUnit}>{product.unit}</span></span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statLabel}>Estoque Mínimo</span>
                            <span className={styles.statValue}>{product.min_quantity}</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statLabel}>Categoria</span>
                            <span className={styles.statValue}>{product.category}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className={styles.chartsGrid}>
                {/* Fluctuation Chart */}
                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Flutuação de Estoque</h3>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={fluctuationData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="stock" name="Estoque" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                </div>

                {/* Price History Chart (Gestão only) */}
                {canViewPrices && (
                    <div className={styles.chartCard}>
                        <h3 className={styles.chartTitle}>Evolução de Preço (Últimas Compras)</h3>
                        <div className={styles.chartContainer}>
                            {priceHistory.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={priceHistory}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis tickFormatter={(val) => `R$ ${val}`} />
                                        <Tooltip
                                            formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Valor Aprovado']}
                                            labelFormatter={(label) => `Data: ${label}`}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="price"
                                            stroke="#10B981"
                                            strokeWidth={2}
                                            dot={{ r: 4 }}
                                            name="Preço"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-500">
                                    Sem histórico de compras aprovadas
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Consumption by Unit */}
                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h3 className={styles.chartTitle}>Consumo por Unidade</h3>
                        <div className={styles.filterGroup}>
                            <Calendar size={16} color="#6B7280" />
                            <input
                                type="month"
                                value={monthFilter}
                                onChange={(e) => setMonthFilter(e.target.value)}
                                className={styles.filterSelect}
                            />
                        </div>
                    </div>
                    <div className={styles.chartContainer}>
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                Sem consumo neste mês
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className={styles.historyCard}>
                <div className={styles.historyHeader}>
                    <h3 className={styles.historyTitle}>Histórico de Movimentações</h3>
                    <div className={styles.filterGroup}>
                        <Filter size={16} color="#6B7280" />
                        <select
                            value={selectedUnit}
                            onChange={(e) => setSelectedUnit(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="all">Todas as Unidades</option>
                            {units.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className={styles.tableResponsive}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Tipo</th>
                                <th>Qtd.</th>
                                <th>Unidade</th>
                                <th>Usuário</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableHistory.length > 0 ? (
                                tableHistory.map(m => (
                                    <tr key={m.id}>
                                        <td>
                                            {new Date(m.movement_date || m.created_at).toLocaleDateString()}
                                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF', marginLeft: '0.5rem' }}>
                                                {new Date(m.created_at).toLocaleTimeString().slice(0, 5)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={m.type === 'IN' ? styles.badgeIn : styles.badgeOut}>
                                                {m.type === 'IN' ? 'ENTRADA' : 'SAÍDA'}
                                            </span>
                                        </td>
                                        <td>
                                            {m.type === 'IN' ? '+' : '-'}{m.quantity}
                                        </td>
                                        <td>
                                            {m.unit?.name || '-'}
                                        </td>
                                        <td>
                                            {m.user?.full_name}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>
                                        Nenhuma movimentação encontrada com os filtros atuais.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
};
