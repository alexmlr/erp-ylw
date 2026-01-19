import React, { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { quotationService } from '../../services/quotationService';
import type { Quotation } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../Inventory/Inventory.module.css'; // Reusing inventory styles for consistency

export const QuotationsPage: React.FC = () => {
    const navigate = useNavigate();
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const { user, profile } = useAuth(); // Needed for filtering

    useEffect(() => {
        loadQuotations();
    }, []);

    const loadQuotations = async () => {
        try {
            setLoading(true);
            const data = await quotationService.getQuotations();
            setQuotations(data);
        } catch (error) {
            console.error('Error loading quotations:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open':
                return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">Em Aberto</span>;
            case 'negotiation':
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">Negociação</span>;
            case 'approved':
                return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Aprovada</span>;
            case 'rejected':
                return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Recusada</span>;
            case 'draft':
                return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">Rascunho</span>;
            default:
                return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">{status}</span>;
        }
    };

    const filteredQuotations = quotations.filter(q => {
        // Filter Logic:
        // 1. If status is 'draft', ONLY the creator can see it.
        // 2. Managers/Admins can see everything EXCEPT drafts not owned by them (which essentially is point 1).

        if ((q.status as string) === 'draft' && q.created_by !== user?.id) {
            return false;
        }

        // Search Filter
        return q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.display_id.toString().includes(searchTerm) ||
            q.created_by_user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Cotações de Preço</h1>
                <div className={styles.actions}>
                    <div className={styles.searchBox}>
                        <Search className={styles.searchIcon} size={18} />
                        <input
                            type="text"
                            placeholder="Buscar cotação..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    <button
                        className={styles.inboundButton} // Reusing primary button style
                        onClick={() => navigate('/purchases/quotations/new')}
                    >
                        <Plus size={20} />
                        Nova Cotação
                    </button>
                </div>
            </div>

            <div className={styles.grid}>
                <div className={styles.stockCard} style={{ gridColumn: '1 / -1' }}>
                    <div className={styles.tableResponsive}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Cotação #</th>
                                    <th>Data</th>
                                    <th>Solicitante</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8">Carregando cotações...</td>
                                    </tr>
                                ) : filteredQuotations.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-gray-500">Nenhuma cotação encontrada.</td>
                                    </tr>
                                ) : (
                                    filteredQuotations.map(quote => (
                                        <tr key={quote.id}>
                                            <td className="font-medium">#{String(quote.display_id).padStart(6, '0')}</td>
                                            <td>{new Date(quote.created_at).toLocaleDateString()}</td>
                                            <td>{quote.created_by_user?.full_name || 'Desconhecido'}</td>
                                            <td>{getStatusBadge(quote.status)}</td>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <Link
                                                        to={`/purchases/quotations/${quote.id}`}
                                                        className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                                                    >
                                                        Abrir
                                                    </Link>
                                                    {(profile?.role === 'admin' || profile?.role === 'manager') && (
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm('Tem certeza que deseja EXCLUIR permanentemente esta cotação?')) {
                                                                    try {
                                                                        await quotationService.deleteQuotation(quote.id);
                                                                        loadQuotations();
                                                                    } catch (error) {
                                                                        console.error(error);
                                                                        alert('Erro ao excluir cotação.');
                                                                    }
                                                                }
                                                            }}
                                                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                                                        >
                                                            Excluir
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
