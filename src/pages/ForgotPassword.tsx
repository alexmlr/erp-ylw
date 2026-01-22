import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useBranding } from '../contexts/BrandingContext';
import { Loader2, TrendingUp, Zap, BarChart3, Lock, ArrowLeft, Mail } from 'lucide-react';
import styles from './Login.module.css'; // Reusing Login styles

export const ForgotPassword: React.FC = () => {
    const { logoUrl } = useBranding();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setMessage({
                type: 'success',
                text: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.'
            });
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.message || 'Erro ao enviar email de recuperação.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Left Panel - Branding */}
            <div className={styles.leftPanel}>
                <img
                    src="/bg_login.jpg"
                    alt="Background"
                    className={styles.bgImage}
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                    }}
                />
                <div className={styles.overlay}></div>

                <div className={styles.brandingContent}>
                    {/* Logo Section */}
                    <div>
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt="ERP Yellow"
                                className={styles.brandingLogo}
                            />
                        ) : (
                            <div className="text-white text-2xl font-bold flex items-center gap-2">
                                <div className="w-8 h-8 bg-yellow-400 rounded"></div>
                                Yellow
                            </div>
                        )}
                    </div>

                    {/* Hero Text */}
                    <div className={styles.heroText}>
                        <h1 className={styles.heroTitle}>
                            ERP<br />
                            <span className={styles.highlight}>Yellow Self Storage</span>
                        </h1>
                        <p className={styles.heroSubtitle}>
                            Acesse o inventário, faça requisiçoes de material, cotações e pedidos de manutenção.
                        </p>
                    </div>

                    {/* Footer Icons */}
                    <div className={styles.brandingFooter}>
                        <div className={styles.footerItem}>
                            <TrendingUp size={20} className={styles.highlight} />
                            Transparência
                        </div>
                        <div className={styles.footerItem}>
                            <Zap size={20} className={styles.highlight} />
                            Agilidade
                        </div>
                        <div className={styles.footerItem}>
                            <BarChart3 size={20} className={styles.highlight} />
                            Resultados
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className={styles.rightPanel}>
                <div className={styles.formContainer}>
                    <div className={styles.formHeader}>
                        <Link to="/login" className="flex items-center text-slate-500 hover:text-slate-800 mb-6 text-sm">
                            <ArrowLeft size={16} className="mr-1" />
                            Voltar para login
                        </Link>
                        <h2 className={styles.welcomeTitle}>Recuperar Senha</h2>
                        <p className={styles.welcomeSubtitle}>
                            Digite seu email para receber as instruções de recuperação.
                        </p>
                    </div>

                    {message && (
                        <div className={`${styles.error} ${message.type === 'success' ? 'bg-green-50 text-green-700' : ''}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleResetPassword} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="email">Email</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu.email@yellow.com.br"
                                    required
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className={styles.button}>
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    <Mail size={18} className="mr-2" />
                                    Enviar Link de Recuperação
                                </>
                            )}
                        </button>
                    </form>

                    <div className={styles.privacyFooter}>
                        <Lock size={14} />
                        <p>
                            Seus dados são privados e seguros.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
