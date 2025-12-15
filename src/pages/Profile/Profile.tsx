import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Camera, Save, Loader2, Lock, User } from 'lucide-react';
import styles from './Profile.module.css';

export const ProfilePage: React.FC = () => {
    const { profile, user } = useAuth();
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpdateProfile = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: fullName })
                .eq('id', user?.id);

            if (error) throw error;
            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
            // Refresh logic would be ideal here or strict reload
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Erro ao atualizar perfil.' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não conferem.' });
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
            setPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Erro ao atualizar senha.' });
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        // Check size (185KB = 185 * 1024 bytes)
        if (file.size > 185 * 1024) {
            setMessage({ type: 'error', text: 'A imagem deve ter no máximo 185KB.' });
            return;
        }

        // Check format
        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
            setMessage({ type: 'error', text: 'Formato inválido. Use JPG ou PNG.' });
            return;
        }

        setLoading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('profile_picture')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('profile_picture')
                .getPublicUrl(filePath);

            // Update Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setMessage({ type: 'success', text: 'Foto de perfil atualizada!' });
            // Ideally force refresh context here
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Erro ao fazer upload da imagem.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Meu Perfil</h1>

            {message && (
                <div className={`p-4 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <div className={styles.grid}>
                {/* Profile Card */}
                <div className={styles.card}>
                    <div className="flex flex-col items-center mb-6">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-24 h-24 rounded-full bg-slate-200 overflow-hidden border-4 border-white shadow-lg">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <User size={40} />
                                    </div>
                                )}
                            </div>
                            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <p className="mt-2 text-sm text-gray-500">Clique para alterar (Máx 185KB)</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className={styles.input}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={user?.email}
                                disabled
                                className={`${styles.input} bg-gray-50 cursor-not-allowed`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                            <input
                                type="text"
                                value={profile?.role}
                                disabled
                                className={`${styles.input} bg-gray-50 capitalize`}
                            />
                        </div>

                        <button
                            onClick={handleUpdateProfile}
                            disabled={loading}
                            className={styles.primaryButton}
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Salvar Dados
                        </button>
                    </div>
                </div>

                {/* Password Card */}
                <div className={styles.card}>
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Lock size={20} className="text-primary" />
                        Segurança
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={styles.input}
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={styles.input}
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            onClick={handleUpdatePassword}
                            disabled={loading || !password}
                            className={styles.secondaryButton}
                        >
                            Atualizar Senha
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
