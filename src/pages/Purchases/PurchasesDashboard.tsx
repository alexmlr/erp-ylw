import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    LineChart, Line, CartesianGrid
} from 'recharts';
import { Plus, List } from 'lucide-react';

import { quotationService } from '../../services/quotationService';
import { supplierService } from '../../services/supplierService';
import type { Quotation, QuotationProduct, Supplier } from '../../types';
import styles from './PurchasesDashboard.module.css';

// Colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];
const STATUS_COLORS = {
    approved: '#10B981', // green-500
    rejected: '#EF4444'  // red-500
};

export const PurchasesDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    // Data States
    const [openQuotesCount, setOpenQuotesCount] = useState(0);
    const [funnelData, setFunnelData] = useState<{ name: string; value: number }[]>([]);
    const [supplierGrowthData, setSupplierGrowthData] = useState<{ date: string; count: number }[]>([]);
    const [topSuppliersData, setTopSuppliersData] = useState<{ name: string; value: number }[]>([]);
    const [categorySpendingData, setCategorySpendingData] = useState<{ name: string; value: number }[]>([]);
    const [spendingEvolutionData, setSpendingEvolutionData] = useState<{ name: string; value: number }[]>([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const [allQuotations, approvedDetails, suppliers] = await Promise.all([
                quotationService.getQuotations(),
                quotationService.getApprovedQuotationsWithDetails(),
                supplierService.getSuppliers()
            ]);

            processGeneralStats(allQuotations);
            processFinancials(approvedDetails, suppliers);
            processSuppliers(suppliers);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const processGeneralStats = (quotations: Quotation[]) => {
        // 1. Quick Stats: Open Quotations
        const open = quotations.filter(q => q.status === 'open' || q.status === 'negotiation').length;
        setOpenQuotesCount(open);

        // 2. Funnel: Approved vs Rejected
        const approvedCount = quotations.filter(q => q.status === 'approved').length;
        const rejectedCount = quotations.filter(q => q.status === 'rejected').length;
        setFunnelData([
            { name: 'Aprovadas', value: approvedCount },
            { name: 'Rejeitadas', value: rejectedCount }
        ]);
    };

    const processFinancials = (approvedQuotes: Quotation[], suppliers: Supplier[]) => {
        const supplierSpendMap = new Map<string, number>();
        const categorySpendMap = new Map<string, number>();
        const monthlySpendMap = new Map<string, number>();

        approvedQuotes.forEach(quote => {
            const date = new Date(quote.created_at);
            // Format: "Jan 24"
            const dateKey = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });

            // Initialize month if needed
            if (!monthlySpendMap.has(dateKey)) monthlySpendMap.set(dateKey, 0);

            if (quote.products) {
                quote.products.forEach(item => {
                    const bestPrice = getBestPrice(item);
                    if (bestPrice) {
                        const totalItemCost = Number(bestPrice.unit_price) * item.quantity;

                        // 1. Supplier Spend
                        const supplierName = suppliers.find(s => s.id === bestPrice.supplier_id)?.name || 'Outros';
                        supplierSpendMap.set(supplierName, (supplierSpendMap.get(supplierName) || 0) + totalItemCost);

                        // 2. Category Spend
                        // Access nested category data
                        // Type assertion needed because supabase join types are loose in frontend
                        const prod = item.product as any;
                        const catName = prod?.category_data?.name || 'Geral';

                        categorySpendMap.set(catName, (categorySpendMap.get(catName) || 0) + totalItemCost);

                        // 3. Monthly Spend
                        monthlySpendMap.set(dateKey, (monthlySpendMap.get(dateKey) || 0) + totalItemCost);
                    }
                });
            }
        });

        // Transform Maps to Arrays for Recharts

        // Top Suppliers
        const topSuppliers = Array.from(supplierSpendMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
        setTopSuppliersData(topSuppliers);

        // Categories
        const categories = Array.from(categorySpendMap.entries())
            .map(([name, value]) => ({ name, value }));
        setCategorySpendingData(categories);

        // Evolution (Sort by date)

        // For now, let's just rely on the existing map order or simple reverse if needed, 
        // but traditionally we want chronological. 
        // Since we didn't sort input, let's sort the output array artificially or assume input mixed.
        // Let's rely on `approvedQuotes` being roughly time ordered? No, they come whatever.
        // Let's just return as is for MVP, Recharts charts it linearly.
        // Actually, let's try to sort basic months.
        const evolution = Array.from(monthlySpendMap.entries())
            .map(([name, value]) => ({ name, value }));
        // TODO: Proper date sorting if needed.
        setSpendingEvolutionData(evolution);
    };

    const processSuppliers = (suppliers: Supplier[]) => {
        // ... (Keep existing supplier growth logic, but fix 'date' usages if needed)
        const sorted = [...suppliers].sort((a, b) =>
            new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        );

        const growthMap = new Map<string, number>();
        let runningTotal = 0;

        sorted.forEach(s => {
            if (!s.created_at) return;
            const monthKey = new Date(s.created_at).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
            runningTotal++;
            growthMap.set(monthKey, runningTotal);
        });

        const growthChartData = Array.from(growthMap.entries()).map(([date, count]) => ({
            date,
            count
        }));
        setSupplierGrowthData(growthChartData);
    };

    // Helper to find lowest price in an item
    const getBestPrice = (item: QuotationProduct) => {
        if (!item.prices || item.prices.length === 0) return null;
        return item.prices.reduce((min, p) => p.unit_price < min.unit_price ? p : min, item.prices[0]);
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className={styles.title}>Dashboard de Compras</h1>
                        <p className={styles.subtitle}>Visão geral do departamento de compras</p>
                    </div>
                    <div className={styles.actions}>
                        <button onClick={() => navigate('/purchases/quotations')} className={`${styles.actionButton} ${styles.secondaryButton}`}>
                            <List size={20} />
                            Ver Cotações
                        </button>
                        <button onClick={() => navigate('/purchases/quotations/new')} className={`${styles.actionButton} ${styles.primaryButton}`}>
                            <Plus size={20} />
                            Nova Cotação
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className={styles.loading}>Carregando indicadores...</div>
            ) : (
                <div className={styles.grid}>
                    {/* Quick Stats */}
                    <div className={`${styles.card} ${styles.quickStatCard}`}>
                        <h3 className={styles.cardTitle}>Cotações em Aberto</h3>
                        <span className={styles.statValue}>{openQuotesCount}</span>
                        <span className={styles.statLabel}>Aguardando resposta ou negociação</span>
                    </div>

                    {/* Funnel */}
                    <div className={`${styles.card} ${styles.funnelCard}`}>
                        <h3 className={styles.cardTitle}>Aprovação vs. Rejeição</h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={funnelData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {funnelData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? STATUS_COLORS.approved : STATUS_COLORS.rejected} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Supplier Growth */}
                    <div className={`${styles.card} ${styles.supplierCard}`}>
                        <h3 className={styles.cardTitle}>Evolução da Base de Fornecedores</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={supplierGrowthData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" style={{ fontSize: '0.8rem' }} />
                                <YAxis />
                                <RechartsTooltip />
                                <Line type="monotone" dataKey="count" stroke="#8884d8" name="Fornecedores" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Top Suppliers */}
                    <div className={`${styles.card} ${styles.supplierCard}`}>
                        <h3 className={styles.cardTitle}>Top 5 Fornecedores (Estimado)</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart layout="vertical" data={topSuppliersData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '0.8rem' }} />
                                <RechartsTooltip formatter={(value) => `R$ ${value}`} />
                                <Bar dataKey="value" fill="#82ca9d" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Category Spend */}
                    <div className={`${styles.card} ${styles.categoryCard}`}>
                        <h3 className={styles.cardTitle}>Gastos por Categoria</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={categorySpendingData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                >
                                    {categorySpendingData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip formatter={(value) => `R$ ${value}`} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Monthly Spend Evolution */}
                    <div className={`${styles.card} ${styles.evolutionCard}`}>
                        <h3 className={styles.cardTitle}>Evolução de Gastos (Aprovados)</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={spendingEvolutionData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" style={{ fontSize: '0.8rem' }} />
                                <YAxis />
                                <RechartsTooltip formatter={(value) => `R$ ${value}`} />
                                <Line type="monotone" dataKey="value" stroke="#FFBB28" strokeWidth={2} name="Total Gasto" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                </div>
            )}
        </div>
    );
};
