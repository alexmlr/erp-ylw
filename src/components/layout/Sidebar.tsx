import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Settings, Users, FileText, Truck, FileSpreadsheet, ChevronDown, ChevronRight, Box, Database } from 'lucide-react';
import styles from './Layout.module.css';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
    isOpen: boolean;
    toggleSidebar: () => void;
}

interface NavItem {
    path: string;
    label: string;
    icon: any;
    show: boolean;
    children?: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
    const { profile } = useAuth();
    const location = useLocation();
    const [expandedMenus, setExpandedMenus] = useState<string[]>(['/inventory', '/purchases']);

    const hasPermission = (module: string) => {
        if (!profile) return false;
        if (profile.role === 'admin' || profile.role === 'manager') return true;
        if (profile.role === 'administrative' && module === 'inventory') return true;
        // Commercial needs explicit permission
        return profile.permissions?.includes(module) || false;
    };

    const toggleMenu = (path: string, e: React.MouseEvent) => {
        e.preventDefault();
        setExpandedMenus(prev =>
            prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
        );
    };

    // Helper to check if user is in one of the allowed roles
    const checkRole = (allowedRoles: string[]) => {
        if (!profile?.role) return false;
        return allowedRoles.includes(profile.role);
    };

    const navItems: NavItem[] = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard, show: true },

        // Requisitions (Moved to Root) - Available to everyone
        { path: '/inventory/requisitions', label: 'Requisições', icon: FileText, show: true },

        {
            path: '/registrations',
            label: 'Cadastros',
            icon: Database,
            // Show if user has access to any child module (Products via inventory, Suppliers via purchases)
            // or is an admin/manager/administrative (who have default access)
            show: checkRole(['admin', 'manager', 'administrative']) || hasPermission('inventory') || hasPermission('purchases'),
            children: [
                // Products: Admin, Manager, Administrative OR Inventory Permission
                {
                    path: '/inventory/products',
                    label: 'Produtos',
                    icon: Box,
                    show: checkRole(['admin', 'manager', 'administrative']) || hasPermission('inventory')
                },
                // Categories: Admin, Manager, Administrative OR Inventory Permission
                {
                    path: '/inventory/categories',
                    label: 'Categorias',
                    icon: Database,
                    show: checkRole(['admin', 'manager', 'administrative']) || hasPermission('inventory')
                },
                // Suppliers: Admin, Manager, Administrative OR Purchases Permission
                {
                    path: '/purchases/suppliers',
                    label: 'Fornecedores',
                    icon: Truck,
                    show: checkRole(['admin', 'manager', 'administrative']) || hasPermission('purchases')
                },
                // Users: Admin, Manager
                {
                    path: '/users',
                    label: 'Usuários',
                    icon: Users,
                    show: checkRole(['admin', 'manager'])
                },
                // Units: Admin, Manager
                {
                    path: '/settings/units',
                    label: 'Unidades',
                    icon: FileSpreadsheet,
                    show: checkRole(['admin', 'manager'])
                },
            ]
        },
        {
            path: '/inventory',
            label: 'Inventário',
            icon: Package,
            // Inventory: Admin, Manager, Administrative OR Inventory Permission
            // Commercial removed from default role list
            show: checkRole(['admin', 'manager', 'administrative']) || hasPermission('inventory'),
            children: [
                // Requisitions was here, now moved to root
            ]
        },
        {
            path: '/purchases',
            label: 'Compras',
            icon: ShoppingCart,
            show: hasPermission('purchases'),
            children: [
                { path: '/purchases/quotations', label: 'Cotações', icon: FileSpreadsheet, show: true },
                { path: '/purchases/suppliers', label: 'Fornecedores', icon: Truck, show: true },
            ]
        },
        {
            path: '/logs',
            label: 'Logs',
            icon: FileText,
            show: checkRole(['admin', 'manager'])
        },
        {
            path: '/settings',
            label: 'Configurações',
            icon: Settings,
            show: profile?.role === 'admin'
        },
    ];

    const renderNavItem = (item: NavItem) => {
        const visibleChildren = item.children?.filter(child => child.show) || [];
        const hasChildren = visibleChildren.length > 0;
        const isExpanded = expandedMenus.includes(item.path);
        const isActive = location.pathname === item.path || visibleChildren.some(child => location.pathname === child.path);

        return (
            <div key={item.path}>
                <NavLink
                    to={item.path}
                    className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                    title={!isOpen ? item.label : ''}
                >
                    <item.icon size={16} />
                    <span className={styles.navLabel}>{item.label}</span>
                    {hasChildren && isOpen && (
                        <div
                            className="ml-auto p-1 cursor-pointer hover:bg-white/10 rounded transition-colors"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleMenu(item.path, e);
                            }}
                        >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                    )}
                </NavLink>

                {hasChildren && isExpanded && isOpen && (
                    <div className={styles.submenu}>
                        {item.children?.filter(child => child.show).map(child => (
                            <NavLink
                                key={child.path}
                                to={child.path}
                                className={({ isActive }) =>
                                    `${styles.submenuItem} ${isActive ? styles.active : ''}`
                                }
                            >
                                <span className="truncate">{child.label}</span>
                            </NavLink>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <aside className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed}`}>
            <nav className={styles.nav}>
                {navItems.filter(item => item.show).map(renderNavItem)}
            </nav>
        </aside>
    );
};
