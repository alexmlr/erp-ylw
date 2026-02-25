import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import styles from './Inventory.module.css';
import { FileText, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const InventoryMovementsPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const typeFilter = searchParams.get('type'); // IN or OUT

    const [movements, setMovements] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [units, setUnits] = useState<any[]>([]);
    const [unitId, setUnitId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const fetchUnits = async () => {
            const { data } = await supabase.from('units').select('id, name').order('name');
            if (data) setUnits(data);
        };
        fetchUnits();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [unitId, startDate, endDate]);

    const fetchMovements = async () => {
        try {
            let query = supabase
                .from('inventory_movements')
                .select('id, type, created_at, movement_date, quantity, product_id, user_id, unit_id, product:products(name), user:profiles(full_name), unit:units(name)', { count: 'exact' });

            if (typeFilter) {
                query = query.eq('type', typeFilter);
            }
            if (unitId) {
                query = query.eq('unit_id', unitId);
            }
            if (startDate) {
                query = query.gte('movement_date', `${startDate}T00:00:00`);
            }
            if (endDate) {
                query = query.lte('movement_date', `${endDate}T23:59:59`);
            }

            const { data, count } = await query
                .order('created_at', { ascending: false })
                .range((page - 1) * 20, page * 20 - 1);

            setMovements(data || []);
            if (count) setTotalPages(Math.ceil(count / 20));
        } catch (error: any) {
            console.error('Error fetching movements:', error);
            // alert('Erro ao carregar histórico: ' + (error.message || 'Erro desconhecido'));
        }
    };

    useEffect(() => {
        fetchMovements();
    }, [page, typeFilter, unitId, startDate, endDate]);

    const buildExportQuery = () => {
        let query = supabase
            .from('inventory_movements')
            .select('id, type, created_at, movement_date, quantity, product_id, user_id, unit_id, product:products(name), user:profiles(full_name), unit:units(name)')
            .order('created_at', { ascending: false });

        if (typeFilter) query = query.eq('type', typeFilter);
        if (unitId) query = query.eq('unit_id', unitId);
        if (startDate) query = query.gte('movement_date', `${startDate}T00:00:00`);
        if (endDate) query = query.lte('movement_date', `${endDate}T23:59:59`);

        return query;
    };

    const exportToPDF = async () => {
        try {
            setIsExporting(true);
            const { data, error } = await buildExportQuery();
            if (error) throw error;
            if (!data || data.length === 0) {
                alert('Nenhum dado para exportar.');
                return;
            }

            const doc = new jsPDF('landscape', 'mm', 'a4');
            const title = `Histórico de ${typeFilter === 'IN' ? 'Entradas' : typeFilter === 'OUT' ? 'Saídas' : 'Movimentações'}`;

            doc.setFontSize(16);
            doc.text(title, 14, 15);
            doc.setFontSize(10);

            let filterText = '';
            if (unitId) filterText += `Unidade: ${units.find(u => u.id === unitId)?.name || ''}   `;
            if (startDate) filterText += `De: ${new Date(startDate).toLocaleDateString()}   `;
            if (endDate) filterText += `Até: ${new Date(endDate).toLocaleDateString()}`;
            if (filterText) doc.text(filterText, 14, 22);

            const tableData = data.map((m: any) => [
                new Date(m.movement_date || m.created_at).toLocaleString(),
                m.type === 'IN' ? 'Entrada' : 'Saída',
                m.product?.name || '',
                m.quantity?.toString() || '',
                m.unit?.name || '-',
                m.user?.full_name || ''
            ]);

            autoTable(doc, {
                startY: filterText ? 26 : 22,
                head: [['Data', 'Tipo', 'Produto', 'Qtd', 'Unidade', 'Responsável']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185], textColor: 255 },
                styles: { fontSize: 8, cellPadding: 3 },
            });

            doc.save(`movimentacoes_${new Date().getTime()}.pdf`);
        } catch (error) {
            console.error('Erro na exportação para PDF:', error);
            alert('Erro ao exportar PDF.');
        } finally {
            setIsExporting(false);
        }
    };

    const exportToCSV = async () => {
        try {
            setIsExporting(true);
            const { data, error } = await buildExportQuery();
            if (error) throw error;
            if (!data || data.length === 0) {
                alert('Nenhum dado para exportar.');
                return;
            }

            const headers = ['Data', 'Tipo', 'Produto', 'Qtd', 'Unidade', 'Responsável'];
            const rows = data.map((m: any) => [
                new Date(m.movement_date || m.created_at).toLocaleString().replace(',', ''),
                m.type === 'IN' ? 'Entrada' : 'Saída',
                `"${m.product?.name || ''}"`,
                m.quantity,
                `"${m.unit?.name || '-'}"`,
                `"${m.user?.full_name || ''}"`
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(e => e.join(','))
            ].join('\n');

            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `movimentacoes_${new Date().getTime()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Erro na exportação para CSV:', error);
            alert('Erro ao exportar CSV.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header} style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <h1 className={styles.title}>
                    Histórico de {typeFilter === 'IN' ? 'Entradas' : typeFilter === 'OUT' ? 'Saídas' : 'Movimentações'}
                </h1>

                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>Unidade</label>
                            <select
                                className={styles.select}
                                style={{ padding: '0.5rem', minWidth: '160px', height: '38px', boxSizing: 'border-box' }}
                                value={unitId}
                                onChange={e => setUnitId(e.target.value)}
                            >
                                <option value="">Todas</option>
                                {units.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>Data Inicial</label>
                            <input
                                type="date"
                                className={styles.input}
                                style={{ padding: '0.5rem', height: '38px', boxSizing: 'border-box' }}
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>Data Final</label>
                            <input
                                type="date"
                                className={styles.input}
                                style={{ padding: '0.5rem', height: '38px', boxSizing: 'border-box' }}
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', height: '38px' }}>
                        <button
                            className={styles.secondaryButton}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1rem', height: '100%', boxSizing: 'border-box' }}
                            onClick={exportToPDF}
                            disabled={isExporting}
                            title="Exportar para PDF"
                        >
                            <FileText size={18} color="#DC2626" />
                            PDF
                        </button>
                        <button
                            className={styles.secondaryButton}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1rem', height: '100%', boxSizing: 'border-box' }}
                            onClick={exportToCSV}
                            disabled={isExporting}
                            title="Exportar para CSV"
                        >
                            <FileSpreadsheet size={18} color="#16A34A" />
                            CSV
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.stockCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th>Produto</th>
                            <th>Qtd</th>
                            <th>Unidade (Destino)</th>
                            <th>Responsável</th>
                        </tr>
                    </thead>
                    <tbody>
                        {movements.map(m => (
                            <tr key={m.id}>
                                <td>
                                    {new Date(m.movement_date || m.created_at).toLocaleDateString()}
                                    {' '}
                                    <span style={{ fontSize: '0.8em', color: '#666' }}>
                                        {new Date(m.movement_date || m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </td>
                                <td>
                                    <span className={m.type === 'IN' ? styles.okBadge : ''} style={{ color: m.type === 'OUT' ? 'red' : 'green' }}>
                                        {m.type === 'IN' ? 'Entrada' : 'Saída'}
                                    </span>
                                </td>
                                <td>{m.product?.name}</td>
                                <td>{m.quantity}</td>
                                <td>{m.unit?.name || '-'}</td>
                                <td>{m.user?.full_name}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className={styles.pagination}>
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                    <span>{page} de {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</button>
                </div>
            </div>
        </div>
    );
};
