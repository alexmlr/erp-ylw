import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { useMaintenanceOrders } from './hooks/useMaintenanceOrders';
import { supabase } from '../../lib/supabase';
import { loggerService } from '../../services/loggerService';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Maintenance.module.css';

export const CommercialDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const { orders, loading, fetchOrders } = useMaintenanceOrders(profile?.id);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja excluir este rascunho permanentemente?')) return;

        try {
            // Log before delete to capture info? Or just ID
            await supabase.from('maintenance_orders').delete().eq('id', id);

            await loggerService.logAction({
                action: 'Excluiu Rascunho OS',
                entity: 'Ordem de Serviço',
                entity_id: id
            });

            fetchOrders();
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir.');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Minhas Ordens de Serviço</h1>
                <button
                    onClick={() => navigate('/maintenance/os/new')}
                    className={styles.primaryButton}
                >
                    <Plus size={20} />
                    Nova OS
                </button>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.th}>Código</th>
                            <th className={styles.th}>Data</th>
                            <th className={styles.th}>Unidade</th>
                            <th className={styles.th}>Categoria</th>
                            <th className={styles.th}>Prioridade</th>
                            <th className={styles.th}>Status</th>
                            <th className={styles.th} style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="p-4 text-center">Carregando...</td></tr>
                        ) : orders.length === 0 ? (
                            <tr><td colSpan={7} className="p-4 text-center text-gray-500">Nenhuma OS encontrada.</td></tr>
                        ) : (
                            orders.map(os => (
                                <tr key={os.id} className={styles.tr}>
                                    <td className={styles.td}>OS{os.code}</td>
                                    <td className={styles.td}>{new Date(os.service_date).toLocaleDateString('pt-BR')}</td>
                                    <td className={styles.td}>{os.unit?.name || '-'}</td>
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
                                        <div className="flex justify-end gap-2">
                                            {os.status === 'Rascunho' ? (
                                                <>
                                                    <button
                                                        onClick={() => navigate(`/maintenance/os/${os.id}`)}
                                                        className="text-blue-600 hover:text-blue-900 p-1"
                                                        title="Editar"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(os.id)}
                                                        className="text-red-600 hover:text-red-900 p-1"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => navigate(`/maintenance/os/${os.id}`)}
                                                    className="text-gray-600 hover:text-gray-900 p-1"
                                                    title="Visualizar"
                                                >
                                                    <Eye size={18} />
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
    );
};
