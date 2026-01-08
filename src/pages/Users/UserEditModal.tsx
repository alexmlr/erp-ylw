import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2, Camera, User, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';
import styles from './UserEditModal.module.css';
import { loggerService } from '../../services/loggerService';
import { useAuth } from '../../contexts/AuthContext';

interface UserEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: Profile | null;
    onUpdate: () => void;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({ isOpen, onClose, user, onUpdate }) => {
    const { profile: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'admin';

    const [activeTab, setActiveTab] = useState<'details' | 'permissions'>('details');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form Stats
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('user');
    const [unitId, setUnitId] = useState('');
    const [permissions, setPermissions] = useState<string[]>([]);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    // Auth Fields (Admin only)
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Units for selection
    const [units, setUnits] = useState<any[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && user) {
            setFullName(user.full_name || '');
            setRole(user.role);
            setUnitId(user.unit_id || '');
            setPermissions(user.permissions || []);
            setAvatarUrl(user.avatar_url);
            setEmail(user.email || ''); // Assuming user.email is populated
            setPassword(''); // Always reset password field
            fetchUnits();
        }
    }, [isOpen, user]);

    const fetchUnits = async () => {
        try {
            const { data, error } = await supabase
                .from('units')
                .select('*')
                .eq('active', true)
                .order('name');

            if (error) throw error;
            setUnits(data || []);
        } catch (error) {
            console.error('Error fetching units:', error);
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        if (file.size > 185 * 1024) {
            setError('A imagem deve ter no máximo 185KB.');
            return;
        }

        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
            setError('Formato inválido. Use JPG ou PNG.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('profile_picture')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('profile_picture')
                .getPublicUrl(filePath);

            setAvatarUrl(publicUrl);
        } catch (err: any) {
            console.error('Error uploading avatar:', err);
            setError('Erro ao fazer upload da imagem.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            // 1. Update Profile Data
            const updates = {
                full_name: fullName,
                role,
                unit_id: unitId || null,
                permissions,
                avatar_url: avatarUrl
            };

            const { error: updateError } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 2. Update Auth Data (Email/Password) - Admin Only
            if (isAdmin && (email !== user.email || password)) {
                const { error: rpcError } = await supabase.rpc('update_user_credentials', {
                    target_user_id: user.id,
                    new_email: email !== user.email ? email : null,
                    new_password: password || null
                });

                if (rpcError) throw rpcError;
            }

            await loggerService.logAction({
                action: 'Atualizou Usuário',
                entity: 'Usuário',
                entity_id: user.id,
                details: {
                    previous: {
                        name: user.full_name,
                        role: user.role,
                        permissions: user.permissions
                    },
                    new: updates
                }
            });

            onUpdate();
            onClose();
        } catch (err: any) {
            console.error('Error updating user:', err);
            setError('Erro ao atualizar usuário: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePermissionChange = (perm: string) => {
        setPermissions(prev =>
            prev.includes(perm)
                ? prev.filter(p => p !== perm)
                : [...prev, perm]
        );
    };

    if (!isOpen || !user) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Editar Usuário</h3>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'details' ? styles.active : ''}`}
                        onClick={() => setActiveTab('details')}
                    >
                        Dados Pessoais
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'permissions' ? styles.active : ''}`}
                        onClick={() => setActiveTab('permissions')}
                    >
                        Acessos e Permissões
                    </button>
                </div>

                <div className={styles.body}>
                    {error && <div className={styles.error}>{error}</div>}

                    {activeTab === 'details' ? (
                        <>
                            <div className={styles.avatarSection}>
                                <div
                                    className={styles.avatarContainer}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={fullName} className={styles.avatarImg} />
                                    ) : (
                                        <div className={styles.avatarPlaceholder}>
                                            <User size={32} />
                                        </div>
                                    )}
                                    <div className={styles.avatarOverlay}>
                                        <Camera className="text-white" size={24} />
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/jpeg,image/png"
                                    onChange={handleAvatarUpload}
                                />
                                <p className={styles.helperText}>Clique para alterar foto (Máx 185KB)</p>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Nome Completo</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className={styles.input}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Email</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={email}
                                        disabled={!isAdmin}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                                {!isAdmin && (
                                    <p className={styles.helperText}>O email não pode ser alterado por aqui.</p>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Senha</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={!isAdmin}
                                        className={styles.input}
                                        placeholder={isAdmin ? "Digite para alterar a senha" : "********"}
                                    />
                                    <div className="flex items-center" style={{ marginTop: '10px' }}>
                                        <Lock size={16} className="text-gray-400" style={{ marginRight: '10px' }} />
                                        <p className={styles.helperText} style={{ marginTop: 0 }}>
                                            {isAdmin
                                                ? "Deixe em branco para manter a senha atual."
                                                : "Apenas administradores podem alterar senhas."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Grupo de Usuário (Role)</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className={styles.select}
                                >
                                    <option value="user">Usuário Padrão</option>
                                    <option value="administrative">Administrativo</option>
                                    <option value="commercial">Comercial</option>
                                    <option value="manager">Gestor</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Unidade</label>
                                <select
                                    value={unitId}
                                    onChange={(e) => setUnitId(e.target.value)}
                                    className={styles.select}
                                >
                                    <option value="">Nenhuma unidade selecionada</option>
                                    {units.map(unit => (
                                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.formGroup}>
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
                        </>
                    )}
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
                        disabled={loading}
                        className={styles.primaryButton}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};
