import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useBranding } from '../contexts/BrandingContext';
import { Loader2 } from 'lucide-react';
import styles from './Login.module.css';

export const Login: React.FC = () => {
    const { logoUrl } = useBranding();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            navigate(from, { replace: true });
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt="ERP Yellow"
                            style={{
                                maxWidth: '170px',
                                width: 'auto',
                                height: 'auto',
                                margin: '0 auto 1.5rem',
                                display: 'block'
                            }}
                        />
                    ) : (
                        <div className={styles.logo}></div>
                    )}
                    <h1 className={styles.title}>Bem vindo</h1>
                    <p className={styles.subtitle}>Acesse o sistema de ERP da Yellow Self Storage</p>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleLogin} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@example.com"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button type="submit" disabled={loading} className={styles.button}>
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Acessar'}
                    </button>
                </form>
            </div>
        </div>
    );
};
