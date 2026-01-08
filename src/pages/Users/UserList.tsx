import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';
import { Loader2, Plus, Pencil, X } from 'lucide-react';
import styles from './UserList.module.css';
import { UserEditModal } from './UserEditModal';
import { UserCreateModal } from './UserCreateModal';
import { useAuth } from '../../contexts/AuthContext';

export const UserList: React.FC = () => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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

    const handleEditClick = (user: Profile) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = async (user: Profile) => {
        if (!confirm(`Tem certeza que deseja excluir o usuário ${user.full_name}?`)) return;

        try {
            // Note: Deleting from 'profiles' usually requires deleting from auth.users first if there's a trigger,
            // or vice-verse depending on cascade. 
            // Since we don't have a direct admin API here for auth.users, and we are likely relying on shared logic:
            // if we delete profile, it might not delete the auth user without an edge function. 
            // However, usually deleting the profile (if RLS allows) is the first step.
            // CAUTION: Standard Supabase setups usually CASCADE from auth.users -> public.profiles.
            // So to delete a user properly, we need to delete from auth.users which is an admin-only RPC or API call.
            // If I just delete the profile, the auth user remains.
            // For now, I will try to delete the profile. If it fails due to FK, I will notify the limitation.
            // Assuming there might be an 'active' flag or we just delete the profile.

            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', user.id);

            if (error) {
                console.error("Error deleting profile:", error);
                alert("Erro ao excluir usuário. Talvez seja necessário permissão de super-admin no Supabase.");
                return;
            }

            setUsers(users.filter(u => u.id !== user.id));
            alert('Usuário excluído (perfil) com sucesso.');

        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Erro ao excluir usuário.');
        }
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
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEditClick(user)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                    title="Editar Usuário"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(user)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Excluir Usuário"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
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

            <UserEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
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
