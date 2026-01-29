import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Filter } from 'lucide-react';
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
                const d = new Date(o.service_date);
                if (d.getMonth() === index && d.getFullYear() === year) {
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
            <div className="h-64">
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
            const d = new Date(o.service_date);
            if (d.getMonth() === month && d.getFullYear() === year) {
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
            <div className="h-64">
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
                                        <td className={styles.td}>OS{os.code}</td>
                                        <td className={styles.td}>{os.profile?.full_name || 'N/A'}</td>
                                        <td className={styles.td}>{os.unit?.name || '-'}</td>
                                        <td className={styles.td}>{new Date(os.service_date).toLocaleDateString('pt-BR')}</td>
                                        <td className={styles.td}>{os.category?.name || '-'}</td>
                                        <td className={styles.td}>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${os.priority === 'Urgente' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                                }`}>
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
        </div>
    );
};
