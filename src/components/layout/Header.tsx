import React, { useState, useRef, useEffect } from 'react';
import { Menu, User, LogOut } from 'lucide-react';
import styles from './Layout.module.css';
import { useAuth } from '../../contexts/AuthContext';
import { NavLink } from 'react-router-dom';

interface HeaderProps {
    toggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
    const { profile, signOut } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        return name.slice(0, 2).toUpperCase();
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className={styles.header}>
            <div className={styles.logoContainer}>
                <button onClick={toggleSidebar} className={styles.hamburger} title="Toggle Sidebar">
                    <Menu size={24} />
                </button>
                <div className={styles.logo}>
                    <div style={{ width: 24, height: 24, background: 'var(--color-primary)', borderRadius: 4 }}></div>
                    ERP Yellow
                </div>
            </div>

            <div className={styles.userMenu} ref={dropdownRef}>
                <button
                    className={styles.userButton}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                    <span className={styles.userNameLabel}>
                        {profile?.full_name || 'Usuário'}
                    </span>
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Profile" className={styles.avatar} />
                    ) : (
                        <div className={styles.avatar}>
                            {getInitials(profile?.full_name)}
                        </div>
                    )}
                </button>

                <div className={`${styles.userDropdown} ${dropdownOpen ? styles.show : ''}`}>
                    <div className={styles.userHeader}>
                        <p className={styles.userName}>{profile?.full_name}</p>
                        <p className={styles.userRole}>{profile?.role}</p>
                    </div>
                    <NavLink to="/profile" className={styles.dropdownItem} onClick={() => setDropdownOpen(false)}>
                        <User size={16} /> Perfil
                    </NavLink>
                    <button onClick={signOut} className={`${styles.dropdownItem} ${styles.logoutButton}`}>
                        <LogOut size={16} /> Sair
                    </button>
                </div>
            </div>
        </header>
    );
};
