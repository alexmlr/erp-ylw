import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CommercialDashboard } from './CommercialDashboard';
import { ManagementDashboard } from './ManagementDashboard';

export const MaintenanceDashboard: React.FC = () => {
    const { profile } = useAuth();

    // Roles allowed for Management view
    const isManagement = ['admin', 'manager', 'Gestão', 'Administrador'].includes(profile?.role || '');

    if (isManagement) {
        return <ManagementDashboard />;
    }

    return <CommercialDashboard />;
};
