import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';
import styles from './PermissionsModal.module.css';

interface PermissionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: Profile | null;
    onUpdate: () => void;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({ isOpen, onClose, user, onUpdate }) => {
    const [role, setRole] = useState<string>('user');
    const [permissions, setPermissions] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setRole(user.role);
            setPermissions(user.permissions || []);
        }
    }, [user]);

    if (!isOpen || !user) return null;

    const handlePermissionChange = (perm: string) => {
        setPermissions(prev =>
            prev.includes(perm)
                ? prev.filter(p => p !== perm)
                : [...prev, perm]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role, permissions })
                .eq('id', user.id);

            if (error) throw error;
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating permissions:', error);
            alert('Erro ao atualizar permissões. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Gerenciar Acessos</h3>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.body}>
                    <div className={styles.section}>
                        <p className={styles.label}>Usuário</p>
                        <p className={styles.value}>{user.full_name || 'Sem nome'}</p>
                    </div>

                    <div className={styles.section}>
                        <label className={styles.label}>Grupo de Usuário (Role)</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className={styles.select}
                        >
                            <option value="admin">Administrador</option>
                            <option value="manager">Gestor</option>
                            <option value="administrative">Administrativo</option>
                            <option value="commercial">Comercial</option>
                            <option value="user">Usuário Padrão</option>
                        </select>
                        <p className={styles.helperText}>
                            Define o nível base de acesso do usuário no sistema.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <label className={styles.label}>Módulos Adicionais</label>
                        <div className={styles.checkboxList}>
                            <label className={styles.checkboxItem}>
                                <input
                                    type="checkbox"
                                    checked={permissions.includes('inventory')}
                                    onChange={() => handlePermissionChange('inventory')}
                                    className={styles.checkbox}
                                />
                                <div>
                                    <span className={styles.label} style={{ marginBottom: 0 }}>Inventário</span>
                                    <span className={styles.helperText}>Acesso completo ao estoque</span>
                                </div>
                            </label>

                            <label className={styles.checkboxItem}>
                                <input
                                    type="checkbox"
                                    checked={permissions.includes('purchases')}
                                    onChange={() => handlePermissionChange('purchases')}
                                    className={styles.checkbox}
                                />
                                <div>
                                    <span className={styles.label} style={{ marginBottom: 0 }}>Compras</span>
                                    <span className={styles.helperText}>Pedidos e fornecedores</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button
                        onClick={onClose}
                        className={styles.secondaryButton}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={styles.primaryButton}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};
