import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface BrandingContextType {
    logoUrl: string | null;
    refreshLogo: () => Promise<void>;
    loading: boolean;
}

const BrandingContext = createContext<BrandingContextType>({
    logoUrl: null,
    refreshLogo: async () => { },
    loading: true,
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchLogo = async () => {
        try {
            const { data } = await supabase
                .from('system_settings')
                .select('logo_url')
                .limit(1)
                .single();

            if (data) {
                setLogoUrl(data.logo_url);
            }
        } catch (error) {
            console.error('Error fetching branding:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogo();
    }, []);

    const refreshLogo = async () => {
        await fetchLogo();
    };

    return (
        <BrandingContext.Provider value={{ logoUrl, refreshLogo, loading }}>
            {children}
        </BrandingContext.Provider>
    );
};
