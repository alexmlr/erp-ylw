import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useBranding } from '../../contexts/BrandingContext';
import { Upload, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './Settings.module.css';

export const SettingsPage: React.FC = () => {
    const { logoUrl, refreshLogo } = useBranding();
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        // Validate size (120kb = 122880 bytes)
        if (file.size > 122880) {
            alert('O arquivo deve ter no máximo 120kb.');
            return;
        }

        setUploading(true);
        try {
            // 1. Upload to Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `logo-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('library')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('library')
                .getPublicUrl(filePath);

            // 3. Update Settings in DB
            // First check if a row exists, otherwise insert
            const { data: existingSettings } = await supabase
                .from('system_settings')
                .select('id')
                .limit(1)
                .single();

            if (existingSettings) {
                const { error: dbError } = await supabase
                    .from('system_settings')
                    .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
                    .eq('id', existingSettings.id);
                if (dbError) throw dbError;
            } else {
                const { error: dbError } = await supabase
                    .from('system_settings')
                    .insert({ logo_url: publicUrl });
                if (dbError) throw dbError;
            }

            // 4. Refresh Context
            await refreshLogo();
            alert('Logo atualizada com sucesso!');
        } catch (error: unknown) {
            console.error('Error uploading logo:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert('Erro ao atualizar logo: ' + errorMessage);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Configurações</h1>

            <div className={styles.grid}>
                {/* Branding Section */}
                <div className={styles.card}>
                    <h2 className={styles.cardHeader}>
                        Identidade Visual
                    </h2>

                    <div>
                        <div className={styles.uploadArea}>
                            {logoUrl ? (
                                <div className={styles.currentLogoContainer}>
                                    <span className={styles.currentLogoLabel}>Logo Atual:</span>
                                    <img src={logoUrl} alt="Current Logo" className={styles.currentLogo} />
                                </div>
                            ) : (
                                <div className={styles.noLogoText}>Nenhuma logo configurada</div>
                            )}

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept="image/*"
                                className={styles.hiddenInput}
                                id="logo-upload"
                            />

                            <label
                                htmlFor="logo-upload"
                                className={`${styles.uploadButton} ${uploading ? styles.disabled : ''}`}
                            >
                                {uploading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Upload size={18} />
                                )}
                                {uploading ? 'Enviando...' : 'Carregar Nova Logo'}
                            </label>
                            <p className={styles.helperText}>Máx. 120kb (PNG, JPG, SVG)</p>
                        </div>
                    </div>
                </div>

                {/* Sub Menu Links */}
                <div className={styles.card}>
                    <h2 className={styles.cardHeader}>Geral</h2>
                    <ul className={styles.menuList}>
                        <li>
                            <Link to="/settings/units" className={styles.menuLink}>
                                <div className={styles.linkContent}>
                                    <span className={styles.linkTitle}>Unidades</span>
                                    <span className={styles.linkDescription}>Gerenciar unidades de negócio</span>
                                </div>
                            </Link>
                        </li>
                        {/* Add more settings links here */}
                    </ul>
                </div>
            </div>
        </div>
    );
};
