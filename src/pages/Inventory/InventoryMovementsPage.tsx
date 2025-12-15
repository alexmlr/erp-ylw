import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import styles from './Inventory.module.css';

export const InventoryMovementsPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const typeFilter = searchParams.get('type'); // IN or OUT

    const [movements, setMovements] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMovements();
    }, [page, typeFilter]);

    const fetchMovements = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('inventory_movements')
                .select('id, type, created_at, movement_date, quantity, product_id, user_id, unit_id, product:products(name), user:profiles(full_name), unit:units(name)', { count: 'exact' });

            if (typeFilter) {
                query = query.eq('type', typeFilter);
            }

            const { data, count } = await query
                .order('created_at', { ascending: false })
                .range((page - 1) * 20, page * 20 - 1);

            setMovements(data || []);
            if (count) setTotalPages(Math.ceil(count / 20));
        } catch (error: any) {
            console.error('Error fetching movements:', error);
            // alert('Erro ao carregar histórico: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>
                    Histórico de {typeFilter === 'IN' ? 'Entradas' : typeFilter === 'OUT' ? 'Saídas' : 'Movimentações'}
                </h1>
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
