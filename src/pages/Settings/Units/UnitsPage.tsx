import React, { useState, useEffect } from 'react';
import { Plus, Edit2, MapPin, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { UnitModal } from './UnitModal';
import styles from './Units.module.css';
import { loggerService } from '../../../services/loggerService';

import type { Unit } from '../../../types';

export const UnitsPage: React.FC = () => {
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

    const fetchUnits = async () => {
        try {
            const { data, error } = await supabase
                .from('units')
                .select('*')
                .order('name');

            if (error) throw error;
            setUnits(data || []);
        } catch (error) {
            console.error('Error fetching units:', error);
            alert('Erro ao carregar unidades');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUnits();
    }, []);

    const handleEdit = (unit: Unit) => {
        setSelectedUnit(unit);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setSelectedUnit(null);
        setIsModalOpen(true);
    };

    const handleSave = () => {
        fetchUnits();
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Unidades</h1>
                <button onClick={handleNew} className={styles.newButton}>
                    <Plus size={20} />
                    Nova Unidade
                </button>
            </div>

            {loading ? (
                <div className={styles.loading}>Carregando...</div>
            ) : (
                <div className={styles.grid}>
                    {units.map((unit) => (
                        <div key={unit.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3>{unit.name}</h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => handleEdit(unit)}
                                        className={styles.editButton}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (window.confirm(`Excluir unidade ${unit.name}?`)) {
                                                const { error } = await supabase.from('units').delete().eq('id', unit.id);
                                                if (!error) {
                                                    await loggerService.logAction({
                                                        action: 'Excluiu Unidade',
                                                        entity: 'Unidade',
                                                        entity_id: unit.id,
                                                        details: { name: unit.name }
                                                    });
                                                    fetchUnits();
                                                }
                                            }
                                        }}
                                        className={styles.editButton}
                                        style={{ color: 'red' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className={styles.cardContent}>
                                <div className={styles.infoRow}>
                                    <MapPin size={16} />
                                    <p>{unit.address || 'Endereço não informado'}</p>
                                </div>
                                <span className={`${styles.status} ${unit.active ? styles.active : styles.inactive}`}>
                                    {unit.active ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                        </div>
                    ))}

                    {units.length === 0 && (
                        <div className={styles.emptyState}>
                            Nenhuma unidade cadastrada
                        </div>
                    )}
                </div>
            )}

            <UnitModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                unit={selectedUnit}
            />
        </div>
    );
};
