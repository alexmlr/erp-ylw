import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CommercialDashboard } from '../components/dashboard/CommercialDashboard';
import { AdministrativeDashboard } from '../components/dashboard/AdministrativeDashboard';
import { ManagementDashboard } from '../components/dashboard/ManagementDashboard';

const Dashboard: React.FC = () => {
    const { profile } = useAuth();

    if (!profile) {
        return <div className="p-6">Carregando...</div>;
    }

    // Role-based rendering
    if (profile.role === 'admin' || profile.role === 'manager') {
        return <ManagementDashboard />;
    }

    if (profile.role === 'administrative') {
        return <AdministrativeDashboard />;
    }

    if (profile.role === 'commercial') {
        return <CommercialDashboard />;
    }

    // Fallback for standard users (uses Commercial view as default for now, or could be a simple welcome page)
    return <CommercialDashboard />;
};

export default Dashboard;
