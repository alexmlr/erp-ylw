import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface AccessRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
    requiredPermission?: string;
}

export const AccessRoute: React.FC<AccessRouteProps> = ({
    children,
    allowedRoles = [],
    requiredPermission
}) => {
    const { session, profile, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If profile is not loaded yet (but session exists), wait? 
    // Usually 'loading' covers this, but let's be safe.
    if (!profile) {
        // Fallback if profile is missing but session exists (rare)
        return null;
    }

    // 1. Superuser Check (Admin/Manager always access)
    // Console Log for debugging permissions
    // console.log('AccessRoute Check:', { 
    //    path: location.pathname, 
    //    role: profile.role, 
    //    required: requiredPermission, 
    //    userPerms: profile.permissions 
    // });

    if (profile.role === 'admin' || profile.role === 'manager') {
        return <>{children}</>;
    }

    // 2. Role Check
    if (allowedRoles.length > 0 && allowedRoles.includes(profile.role)) {
        return <>{children}</>;
    }

    // 3. Permission Check
    // If user has the specific permission, allow access
    if (requiredPermission && profile.permissions?.includes(requiredPermission)) {
        return <>{children}</>;
    }

    // 4. Special Case: AdministrativeRole has default access to some, 
    // but typically we pass 'administrative' in allowedRoles.

    // If all checks fail -> Redirect to Dashboard
    // But if we are already AT dashboard, prevent loop? 
    // No, AccessRoute wraps sub-routes. Dashboard is at /.

    // If authorized by EITHER role OR permission (logic above involves returns), we are good.
    // If code reaches here, user is unauthorized.

    // If code reaches here, user is unauthorized.
    return <Navigate to="/" replace />;
};
