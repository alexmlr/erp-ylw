import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { X, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import styles from './UserCreateModal.module.css';
import { loggerService } from '../../services/loggerService';

interface UserCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const UserCreateModal: React.FC<UserCreateModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [unitId, setUnitId] = useState('');
    const [units, setUnits] = useState<any[]>([]); // Using any for simplicity here, ideally Unit[]
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        if (isOpen) {
            fetchUnits();
        }
    }, [isOpen]);

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

    if (!isOpen) return null;

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Create a temporary Supabase client to avoid logging out the admin
            // using in-memory storage so it doesn't persist the new user's session
            const tempSupabase = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                        detectSessionInUrl: false
                    }
                }
            );

            // 2. Sign up the new user
            const { data: authData, error: authError } = await tempSupabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        avatar_url: null,
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Falha ao criar usuário.');

            // 3. Update the role immediately (The trigger sets it to 'user' by default)
            // We use the main 'supabase' client here which has Admin/Manager permissions via RLS policies
            if (role !== 'user') {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        role: role,
                        unit_id: unitId || null
                    })
                    .eq('id', authData.user.id);

                if (profileError) {
                    console.error('Error updating role:', profileError);
                    // Non-blocking error, user is created but role might be wrong.
                    // In a real app we might want to retry or alert.
                }
            }

            // Log Create
            await loggerService.logAction({
                action: 'Criou Usuário',
                entity: 'Usuário',
                entity_id: authData.user.id,
                details: { name: fullName, email: email, role: role }
            });

            onSuccess();
            onClose();
            // Reset form
            setFullName('');
            setEmail('');
            setPassword('');
            setRole('user');
            setUnitId('');

        } catch (err: any) {
            console.error('Error creating user:', err);
            setError(err.message || 'Erro ao criar usuário.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Novo Usuário</h3>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleCreateUser} className={styles.form}>
                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Nome Completo</label>
                        <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className={styles.input}
                            placeholder="Ex: João Silva"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={styles.input}
                            placeholder="joao@empresa.com"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Senha Provisória</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.input}
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>


                    <div className={styles.formGroup}>
                        <label className={styles.label}>Grupo de Usuário</label>
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

                    {['user', 'administrative', 'commercial'].includes(role) && (
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Unidade</label>
                            <select
                                value={unitId}
                                onChange={(e) => setUnitId(e.target.value)}
                                className={styles.select}
                                required
                            >
                                <option value="">Selecione uma unidade...</option>
                                {units.map(unit => (
                                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className={styles.footer}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={styles.secondaryButton}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={styles.primaryButton}
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Criar Usuário
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
