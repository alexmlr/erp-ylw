import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';
import { Loader2, Plus, Shield } from 'lucide-react';
import styles from './UserList.module.css';
import { PermissionsModal } from './PermissionsModal';
import { UserCreateModal } from './UserCreateModal';
import { useAuth } from '../../contexts/AuthContext';

export const UserList: React.FC = () => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { profile: currentUser } = useAuth();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePermissionsClick = (user: Profile) => {
        setSelectedUser(user);
        setIsPermissionsModalOpen(true);
    };

    const canManageUsers = currentUser?.role === 'admin' || currentUser?.role === 'manager';

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Gerenciar Usuários</h1>
                <button
                    className={styles.addButton}
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <Plus size={20} /> Novo Usuário
                </button>
            </div>

            <div className={styles.tableContainer}>
                {loading ? (
                    <div className={styles.loading}>
                        <Loader2 className="animate-spin" size={32} />
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Usuário</th>
                                <th>Função</th>
                                <th>Data Criação</th>
                                <th>Status</th>
                                {canManageUsers && <th>Ações</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <div className={styles.userInfo}>
                                            <div className={styles.avatar}>
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt="" className={styles.avatarImg} />
                                                ) : (
                                                    (user.full_name?.slice(0, 2).toUpperCase() || 'U')
                                                )}
                                            </div>
                                            <div className={styles.userName}>{user.full_name || 'Sem nome'}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={styles.roleBadge}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--color-text-muted)' }}>
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <div className={styles.statusActive}>
                                            <span className={styles.statusDot}></span>
                                            Ativo
                                        </div>
                                    </td>
                                    {canManageUsers && (
                                        <td>
                                            <button
                                                onClick={() => handlePermissionsClick(user)}
                                                className="text-primary hover:text-primary-hover font-medium text-sm flex items-center gap-1.5 px-3 py-1.5 hover:bg-yellow-50 rounded-md transition-colors"
                                                title="Gerenciar Acessos"
                                            >
                                                <Shield size={16} /> Acessos
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={5} className={styles.empty}>
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <PermissionsModal
                isOpen={isPermissionsModalOpen}
                onClose={() => setIsPermissionsModalOpen(false)}
                user={selectedUser}
                onUpdate={fetchUsers}
            />

            <UserCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    fetchUsers();
                    alert('Usuário criado com sucesso!');
                }}
            />
        </div>
    );
};
