import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { loggerService } from '../../services/loggerService';
import { Download, Calendar, User, Building2, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Link } from 'react-router-dom';
import styles from './Logs.module.css';

interface LogEntry {
    id: string;
    created_at: string;
    action: string;
    entity: string;
    entity_id?: string;
    details: any;
    profile: {
        full_name: string;
    };
}

export const LogsPage: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [selectedUnit, setSelectedUnit] = useState('');
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedDate, setSelectedDate] = useState('');

    // Dropdown Data
    const [units, setUnits] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        fetchDropdowns();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [page, pageSize, selectedUnit, selectedUser, selectedDate]);

    const fetchDropdowns = async () => {
        const { data: unitsData } = await supabase.from('units').select('id, name').order('name');
        const { data: usersData } = await supabase.from('profiles').select('id, full_name').order('full_name');
        setUnits(unitsData || []);
        setUsers(usersData || []);
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, count } = await loggerService.getLogs(page, pageSize, {
                unitId: selectedUnit || undefined,
                userId: selectedUser || undefined,
                date: selectedDate || undefined
            });
            setLogs((data as LogEntry[]) || []);
            setTotalCount(count || 0);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();

        const title = "Logs do Sistema";
        const subtitle = `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
        const filtersApplied = [];
        if (selectedUnit) filtersApplied.push(`Unidade: ${units.find(u => u.id === selectedUnit)?.name}`);
        if (selectedUser) filtersApplied.push(`Usuário: ${users.find(u => u.id === selectedUser)?.full_name}`);
        if (selectedDate) filtersApplied.push(`Data: ${new Date(selectedDate).toLocaleDateString('pt-BR')}`);

        doc.setFontSize(18);
        doc.text(title, 14, 20);

        doc.setFontSize(10);
        doc.text(subtitle, 14, 28);
        if (filtersApplied.length > 0) {
            doc.text(`Filtros: ${filtersApplied.join(' | ')}`, 14, 34);
        }

        const tableColumn = ["Data/Hora", "Usuário", "Ação", "Módulo", "Detalhes"];
        const tableRows = logs.map(log => {
            let detailsStr = '';
            // Logic duplicated from render, simplified for PDF
            const details = log.details;
            if (details) {
                if (details.message) {
                    // Basic cleanup for PDF
                    detailsStr = details.message.replace(/PENDENTE/g, 'Pendente')
                        .replace(/EM_SEPARACAO/g, 'Em Separação')
                        .replace(/APROVADO/g, 'Aprovado')
                        .replace(/ENTREGUE/g, 'Entregue');
                }
                else if (details.items && Array.isArray(details.items)) {
                    detailsStr = details.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ');
                } else if (details.items_count !== undefined) {
                    detailsStr = `Movimentou ${details.items_count} items`;
                } else if (details.name) {
                    detailsStr = details.name;
                } else {
                    try { detailsStr = JSON.stringify(details); } catch { detailsStr = '-'; }
                }
            }

            return [
                new Date(log.created_at).toLocaleString('pt-BR'),
                log.profile?.full_name || 'Desconhecido',
                log.action === 'Atualizou Status Requisição' ? 'Mudança de Status' : log.action,
                log.entity,
                detailsStr
            ];
        });

        // @ts-ignore
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: filtersApplied.length > 0 ? 40 : 35,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            styles: { fontSize: 8, overflow: 'linebreak', cellWidth: 'wrap' },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 30 },
                2: { cellWidth: 35 },
                3: { cellWidth: 25 },
                4: { cellWidth: 'auto' }
            },
            didDrawPage: () => {
                // Header is repeated automatically by autotable default
            }
        });

        doc.save(`system_logs_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // Date Grouping logic for display
    const groupedLogs = useMemo(() => {
        if (selectedDate) return null; // No need to group if filtering by single date

        const groups: { [key: string]: LogEntry[] } = {};
        logs.forEach(log => {
            const dateKey = new Date(log.created_at).toLocaleDateString('pt-BR');
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(log);
        });
        return groups;
    }, [logs, selectedDate]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>
                    <FileText size={28} />
                    Logs do Sistema
                </h1>
                <button
                    onClick={handleExportPDF}
                    className={styles.exportButton}
                    disabled={logs.length === 0}
                >
                    <Download size={18} />
                    Exportar PDF
                </button>
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>
                        <Building2 size={14} />
                        Unidade
                    </label>
                    <select
                        value={selectedUnit}
                        onChange={(e) => setSelectedUnit(e.target.value)}
                        className={styles.select}
                    >
                        <option value="">Todas as Unidades</option>
                        {units.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>
                        <User size={14} />
                        Usuário
                    </label>
                    <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className={styles.select}
                    >
                        <option value="">Todos os Usuários</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.full_name}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>
                        <Calendar size={14} />
                        Data
                    </label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className={styles.input}
                    />
                </div>

                <div style={{ minWidth: '100px' }}>
                    <label className={styles.filterLabel}>
                        Exibir
                    </label>
                    <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className={styles.select}
                    >
                        <option value={25}>25 itens</option>
                        <option value={50}>50 itens</option>
                        <option value={100}>100 itens</option>
                    </select>
                </div>
            </div>

            {/* Logs Table */}
            <div className={styles.tableContainer}>
                {loading ? (
                    <div className={styles.loading}>Carregando logs...</div>
                ) : logs.length === 0 ? (
                    <div className={styles.empty}>Nenhum registro encontrado.</div>
                ) : (
                    <div className={styles.overflowX}>
                        <table className={styles.table}>
                            <thead>
                                <tr className={styles.tableHeader}>
                                    <th className={styles.th}>Data/Hora</th>
                                    <th className={styles.th}>Usuário</th>
                                    <th className={styles.th}>Ação</th>
                                    <th className={styles.th}>Módulo</th>
                                    <th className={styles.th}>Detalhes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupedLogs ? (
                                    // Grouped View
                                    Object.entries(groupedLogs).map(([date, groupLogs]) => (
                                        <React.Fragment key={date}>
                                            <tr className={styles.dateGroupRow}>
                                                <td colSpan={5} className={styles.dateGroupCell}>
                                                    {date}
                                                </td>
                                            </tr>
                                            {groupLogs.map(log => (
                                                <LogRow key={log.id} log={log} units={units} />
                                            ))}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    // Flat View (Filtered by Date or fallback)
                                    logs.map(log => (
                                        <LogRow key={log.id} log={log} units={units} />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && totalCount > pageSize && (
                    <div className={styles.pagination}>
                        <span className={styles.paginationInfo}>
                            Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, totalCount)} de {totalCount} registros
                        </span>
                        <div className={styles.paginationControls}>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className={styles.pageButton}
                            >
                                Anterior
                            </button>
                            <span style={{ padding: '0.25rem 0.5rem' }}>{page}</span>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={page * pageSize >= totalCount}
                                className={styles.pageButton}
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const LogRow: React.FC<{ log: LogEntry; units: any[] }> = ({ log, units }) => {
    // Helper to format specific statuses to Title Case
    const formatStatus = (text: string) => {
        if (!text) return '';
        const statusMap: { [key: string]: string } = {
            'PENDENTE': 'Pendente',
            'APROVADO': 'Aprovado',
            'REJEITADO': 'Rejeitado',
            'EM_SEPARACAO': 'Em Separação',
            'ENTREGUE': 'Entregue',
            'CANCELADO': 'Cancelado'
        };
        // Replace known statuses or just capitalization if not in map
        return text.replace(/\b(PENDENTE|APROVADO|REJEITADO|EM_SEPARACAO|ENTREGUE|CANCELADO)\b/g, (match) => {
            return statusMap[match] || match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
        });
    };

    const formatDetails = (details: any): React.ReactNode => {
        if (!details) return '-';

        // Helper to get unit name
        const getUnitName = (id: string) => {
            const unit = units.find(u => u.id === id);
            return unit ? unit.name : 'Unidade ID: ' + id;
        };

        // Custom Message Override (e.g. Status Changes)
        if (details.message) {
            // Apply status formatting to the message
            const formattedMessage = formatStatus(details.message);

            // Check for Requisition ID pattern to linkify if needed
            // "Alterou status da requisição número #123 ..."
            if (log.entity === 'Requisição' && log.entity_id) {
                return (
                    <span>
                        {formattedMessage}
                        {' '}
                        <Link to="/inventory/requisitions" className="text-blue-600 hover:underline text-xs">
                            (Ir para Requisições)
                        </Link>
                    </span>
                );
            }
            return formattedMessage;
        }

        // Inventory/Requisition Actions with Items List
        if (details.items && Array.isArray(details.items) && details.items.length > 0) {
            // Contextual prefix
            let prefix = 'Movimentação: ';

            if (log.action === 'Saída de Inventário' && details.unit_id) {
                prefix = `Saída para ${getUnitName(details.unit_id)}: `;
            } else if (log.action === 'Entrada de Inventário') {
                prefix = `Entrada: `;
            } else if (log.action === 'Criou Requisição') {
                prefix = `Requisição de ${details.items_count} itens: `;
            } else if (details.unit_id && details.items_count) {
                // Fallback if action strings change
                prefix = `Movimentou ${details.items_count} itens na unidade ${getUnitName(details.unit_id)}: `;
            }

            const itemsStr = details.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ');
            return `${prefix}${itemsStr}`;
        }

        // Fallback for old Inventory Actions
        if (details.items_count !== undefined && details.unit_id) {
            return `Movimentou ${details.items_count} itens na unidade ${getUnitName(details.unit_id)}`;
        }

        // Generic Name Check
        if (details.name) {
            // e.g. "Name: Produto X" for CRUD
            let extra = '';
            if (details.email) extra += ` (${details.email})`;
            if (details.role) extra += ` - Função: ${details.role}`;

            // Permissions update special case
            if (details.new_role) {
                return `Alterou para função: ${details.new_role}`;
            }

            return `${details.name}${extra}`;
        }

        // Final fallback to JSON if strictly necessary, or simplified
        try {
            // If it's a simple object with just a few known keys, try to format
            const keys = Object.keys(details);
            if (keys.length === 0) return '-';

            return JSON.stringify(details)
                .replace(/"/g, '')
                .replace(/{/g, '')
                .replace(/}/g, '')
                .replace(/,/g, ', ');
        } catch {
            return 'Detalhes indisponíveis';
        }
    };

    // Shorten Action Name for UI
    const displayAction = log.action === 'Atualizou Status Requisição' ? 'Mudança de Status' : log.action;

    // Use raw details for tooltip, formatted (clean) for display
    const tooltipText = typeof log.details?.message === 'string' ? formatStatus(log.details.message) : JSON.stringify(log.details, null, 2);

    return (
        <tr className={styles.tr}>
            <td className={styles.td}>
                {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </td>
            <td className={styles.td}>
                {log.profile?.full_name || 'Usuário Desconhecido'}
            </td>
            <td className={styles.td}>
                <span className={styles.actionBadge}>
                    {displayAction}
                </span>
            </td>
            <td className={styles.td}>{log.entity}</td>
            <td className={styles.detailsTd}>
                <div title={tooltipText} style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {formatDetails(log.details)}
                </div>
            </td>
        </tr>
    );
};
