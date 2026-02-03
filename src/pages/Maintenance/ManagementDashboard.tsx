import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { Eye, Edit, Filter, Clock, X } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { useMaintenanceOrders } from './hooks/useMaintenanceOrders';
import styles from './Maintenance.module.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// --- Sub-Components with independent state ---

const ChartHeader = ({ title, month, setMonth, year, setYear, showMonth = true }: any) => (
    <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <div className="flex gap-2">
            {showMonth && (
                <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className={styles.selector}
                >
                    {MONTHS.map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                    ))}
                </select>
            )}
            <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className={styles.selector}
            >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
            </select>
        </div>
    </div>
);

const AnnualEvolutionChart = ({ orders }: { orders: any[] }) => {
    const [year, setYear] = useState(new Date().getFullYear());

    const data = useMemo(() => {
        const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const categories = Array.from(new Set(orders.map(o => o.category?.name || 'Outros')));

        return shortMonths.map((monthName, index) => {
            const item: any = { name: monthName };
            categories.forEach(cat => item[cat] = 0);

            orders.forEach(o => {
                // Parse YYYY-MM-DD manually to avoid timezone issues
                const parts = o.service_date.split('-');
                const orderYear = parseInt(parts[0]);
                const orderMonth = parseInt(parts[1]) - 1; // 0-indexed

                if (orderMonth === index && orderYear === year) {
                    const cat = o.category?.name || 'Outros';
                    item[cat] = (item[cat] || 0) + 1;
                }
            });
            return item;
        });
    }, [orders, year]);

    return (
        <div className={`${styles.card} ${styles.colSpan3}`}>
            <ChartHeader title="Evolução Mensal (Por Categoria)" year={year} setYear={setYear} showMonth={false} />
            <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        {Object.keys(data[0] || {}).filter(k => k !== 'name').map((key, i) => (
                            <Bar key={key} dataKey={key} stackId="a" fill={COLORS[i % COLORS.length]} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

interface MonthlyChartProps {
    title: string;
    orders: any[];
    type: 'unit' | 'category' | 'maintenance_type';
    innerRadius?: number;
    showRounded?: boolean;
}

const MonthlyDistributionChart = ({ title, orders, type, innerRadius = 0, showRounded = false }: MonthlyChartProps) => {
    const [month, setMonth] = useState(new Date().getMonth());
    const [year, setYear] = useState(new Date().getFullYear());

    const data = useMemo(() => {
        const counts: Record<string, number> = {};
        orders.forEach(o => {
            // Parse YYYY-MM-DD manually to avoid timezone issues
            const parts = o.service_date.split('-');
            const orderYear = parseInt(parts[0]);
            const orderMonth = parseInt(parts[1]) - 1; // 0-indexed

            if (orderMonth === month && orderYear === year) {
                let key = 'Outros';
                if (type === 'unit') key = o.unit?.name || 'N/A';
                if (type === 'category') key = o.category?.name || 'Outros';
                if (type === 'maintenance_type') key = o.type?.name || 'Outros';

                counts[key] = (counts[key] || 0) + 1;
            }
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [orders, month, year, type]);

    return (
        <div className={`${styles.card} ${styles.colSpan1}`}>
            <ChartHeader title={title} month={month} setMonth={setMonth} year={year} setYear={setYear} showMonth={true} />
            <div style={{ width: '100%', height: '300px' }}>
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={innerRadius}
                                outerRadius={80}
                                paddingAngle={showRounded ? 5 : 0}
                                dataKey="value"
                            >
                                {data.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                        stroke="none"
                                    />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                        Sem dados neste período
                    </div>
                )}
            </div>
        </div>
    );
};

export const ManagementDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { orders, loading, fetchOrders } = useMaintenanceOrders();

    // Delay Modal State
    const [delayModalOpen, setDelayModalOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [delayDays, setDelayDays] = useState(1);
    const [updatingDelay, setUpdatingDelay] = useState(false);

    const openDelayModal = (orderId: string) => {
        setSelectedOrderId(orderId);
        setDelayDays(1);
        setDelayModalOpen(true);
    };

    const handlePostpone = async () => {
        if (!selectedOrderId) return;
        setUpdatingDelay(true);
        try {
            // Find current due_date
            const order = orders.find(o => o.id === selectedOrderId);
            const currentDue = order?.due_date ? new Date(order.due_date) : new Date();

            // Add days
            const newDue = new Date(currentDue);
            newDue.setDate(newDue.getDate() + delayDays);

            const { error } = await supabase
                .from('maintenance_orders')
                .update({ due_date: newDue.toISOString() })
                .eq('id', selectedOrderId);

            if (error) throw error;

            await fetchOrders();
            setDelayModalOpen(false);
        } catch (err) {
            console.error('Error postponing order:', err);
            alert('Erro ao adiar data.');
        } finally {
            setUpdatingDelay(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Painel de Manutenção (Gestão)</h1>
            </div>

            {/* Charts Grid */}
            <div className={styles.grid}>
                <AnnualEvolutionChart orders={orders} />
                <MonthlyDistributionChart
                    title="Por Unidade"
                    orders={orders}
                    type="unit"
                    innerRadius={60}
                    showRounded={true}
                />
                <MonthlyDistributionChart
                    title="Por Categoria"
                    orders={orders}
                    type="category"
                    innerRadius={60}
                />
                <MonthlyDistributionChart
                    title="Por Tipo"
                    orders={orders}
                    type="maintenance_type"
                    innerRadius={60}
                />
            </div>

            {/* Table Section */}
            <div className={styles.card}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Todas as Ordens de Serviço</h2>
                    <button className={styles.secondaryButton}>
                        <Filter size={16} className="mr-2" />
                        Filtrar
                    </button>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>Código</th>
                                <th className={styles.th}>Solicitante</th>
                                <th className={styles.th}>Unidade</th>
                                <th className={styles.th}>Data</th>
                                <th className={styles.th}>Prazo</th>
                                <th className={styles.th}>Categoria</th>
                                <th className={styles.th}>Prioridade</th>
                                <th className={styles.th}>Status</th>
                                <th className={styles.th} style={{ textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} className="p-4 text-center">Carregando...</td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan={8} className="p-4 text-center text-gray-500">Nenhuma OS encontrada.</td></tr>
                            ) : (
                                orders.map(os => (
                                    <tr key={os.id} className={styles.tr}>
                                        <td className={styles.td}>{os.code}</td>
                                        <td className={styles.td}>{os.profile?.full_name || 'N/A'}</td>
                                        <td className={styles.td}>{os.unit?.name || '-'}</td>
                                        <td className={styles.td}>{new Date(os.service_date).toLocaleDateString('pt-BR')}</td>
                                        <td className={styles.td}>
                                            {os.due_date ? new Date(os.due_date).toLocaleDateString('pt-BR') : '-'}
                                            {os.due_date && new Date() > new Date(os.due_date) && os.status !== 'Concluído' && (
                                                <span className="block text-[10px] text-red-600 font-bold uppercase mt-1">Em Atraso</span>
                                            )}
                                        </td>
                                        <td className={styles.td}>{os.category?.name || '-'}</td>
                                        <td className={styles.td}>
                                            <span
                                                className="inline-flex items-center justify-center text-xs font-bold border"
                                                style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '25px',
                                                    backgroundColor: (os.priority === 'Urgente' || os.priority === '4') ? '#fee2e2' : // red-100
                                                        (os.priority === 'Alta' || os.priority === '3') ? '#ffedd5' : // orange-100
                                                            (os.priority === 'Normal' || os.priority === '2') ? '#dbeafe' : // blue-100
                                                                '#dcfce7', // green-100
                                                    color: (os.priority === 'Urgente' || os.priority === '4') ? '#991b1b' : // red-800
                                                        (os.priority === 'Alta' || os.priority === '3') ? '#9a3412' : // orange-800
                                                            (os.priority === 'Normal' || os.priority === '2') ? '#1e40af' : // blue-800
                                                                '#166534', // green-800
                                                    borderColor: (os.priority === 'Urgente' || os.priority === '4') ? '#fecaca' : // red-200
                                                        (os.priority === 'Alta' || os.priority === '3') ? '#fed7aa' : // orange-200
                                                            (os.priority === 'Normal' || os.priority === '2') ? '#bfdbfe' : // blue-200
                                                                '#bbf7d0' // green-200
                                                }}
                                            >
                                                {os.priority}
                                            </span>
                                        </td>
                                        <td className={styles.td}>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${os.status === 'Rascunho' ? 'bg-gray-100 text-gray-800' :
                                                os.status === 'Aberto' ? 'bg-yellow-100 text-yellow-800' :
                                                    os.status === 'Pendente' ? 'bg-orange-100 text-orange-800' :
                                                        'bg-green-100 text-green-800'
                                                }`}>
                                                {os.status}
                                            </span>
                                        </td>
                                        <td className={styles.td} style={{ textAlign: 'right' }}>
                                            <button
                                                onClick={() => openDelayModal(os.id)}
                                                className="text-orange-500 hover:text-orange-700 p-1 mr-1"
                                                title="Adiar Prazo"
                                            >
                                                <Clock size={16} />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/maintenance/os/${os.id}`)}
                                                className="text-blue-600 hover:text-blue-900 p-1"
                                                title="Visualizar/Editar"
                                            >
                                                {(os.status === 'Aberto' || os.status === 'Pendente') ? <Edit size={18} /> : <Eye size={18} />}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Modal de Adiar */}
            {delayModalOpen && createPortal(
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <div
                        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm relative animate-in fade-in zoom-in duration-200"
                        style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', maxWidth: '24rem', width: '100%', position: 'relative' }}
                    >
                        <button
                            onClick={() => setDelayModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 'bold' }}>
                            <Clock size={20} className="text-orange-500" style={{ color: '#f5be14' }} />
                            Adiar Prazo da OS
                        </h3>

                        <div className="mb-6" style={{ marginBottom: '1.5rem' }}>
                            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                                Adiar por quantos dias?
                            </label>
                            <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={delayDays}
                                    onChange={(e) => setDelayDays(parseInt(e.target.value) || 1)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                                />
                                <span className="text-gray-500 text-sm" style={{ fontSize: '0.875rem', color: '#6b7280' }}>dias</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2" style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                                O novo prazo será a partir da data atual de vencimento.
                            </p>
                        </div>

                        <div className="flex justify-end gap-2" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                                onClick={() => setDelayModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors font-medium"
                                style={{ padding: '0.5rem 1rem', color: '#4b5563', backgroundColor: '#f3f4f6', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handlePostpone}
                                disabled={updatingDelay}
                                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50 font-medium shadow-sm"
                                style={{ padding: '0.5rem 1rem', backgroundColor: '#f5be14', color: 'black', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                {updatingDelay ? 'Salvando...' : 'Confirmar Adição'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
