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
        if (profile.role === 'commercial' && module === 'inventory') return true;
        return profile.permissions?.includes(module) || false;
    };

    const toggleMenu = (path: string, e: React.MouseEvent) => {
        e.preventDefault();
        setExpandedMenus(prev =>
            prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
        );
    };

    const navItems: NavItem[] = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard, show: true },
        {
            path: '/registrations',
            label: 'Cadastros',
            icon: Database,
            show: true,
            children: [
                { path: '/inventory/products', label: 'Produtos', icon: Box, show: true },
                { path: '/purchases/suppliers', label: 'Fornecedores', icon: Truck, show: true },
                { path: '/users', label: 'Usuários', icon: Users, show: profile?.role === 'admin' || profile?.role === 'manager' },
                { path: '/settings/units', label: 'Unidades', icon: FileSpreadsheet, show: true }, // Placeholder path for Unidades
            ]
        },
        {
            path: '/inventory',
            label: 'Inventário',
            icon: Package,
            show: hasPermission('inventory'),
            children: [
                { path: '/inventory/requisitions', label: 'Requisições', icon: FileText, show: true },
            ]
        },
        {
            path: '/purchases',
            label: 'Compras',
            icon: ShoppingCart,
            show: hasPermission('purchases'),
            children: [
                { path: '/purchases/quotes', label: 'Cotações', icon: FileSpreadsheet, show: true },
                { path: '/purchases/suppliers', label: 'Fornecedores', icon: Truck, show: true },
            ]
        },
        {
            path: '/settings',
            label: 'Configurações',
            icon: Settings,
            show: profile?.role === 'admin'
        },
    ];

    const renderNavItem = (item: NavItem) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedMenus.includes(item.path);
        const isActive = location.pathname === item.path || item.children?.some(child => location.pathname === child.path);

        return (
            <div key={item.path}>
                <NavLink
                    to={item.path}
                    className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                    title={!isOpen ? item.label : ''}
                >
                    <item.icon size={24} />
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
                        {item.children?.map(child => (
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
