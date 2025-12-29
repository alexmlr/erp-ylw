import React, { useState, useRef, useEffect } from 'react';
import { Menu, User, LogOut, Bell } from 'lucide-react';
import styles from './Layout.module.css';
import { useAuth } from '../../contexts/AuthContext';
import { useBranding } from '../../contexts/BrandingContext';
import { NavLink, useNavigate } from 'react-router-dom';
import { notificationService, type Notification } from '../../services/notificationService';

interface HeaderProps {
    toggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
    const { profile, signOut } = useAuth();
    const { logoUrl } = useBranding();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Notification State
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
    const notifDropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        if (profile?.id) {
            try {
                const data = await notificationService.getNotifications(profile.id);
                setNotifications(data);
                const count = await notificationService.getUnreadCount(profile.id);
                setUnreadCount(count);
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [profile?.id]);

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) {
            await notificationService.markAsRead(notification.id);
            fetchNotifications();
        }
        setNotifDropdownOpen(false);
        if (notification.link) {
            navigate(notification.link);
        }
    };

    const handleMarkAllRead = async () => {
        if (profile?.id) {
            await notificationService.markAllAsRead(profile.id);
            fetchNotifications();
        }
    };


    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        return name.slice(0, 2).toUpperCase();
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
            if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
                setNotifDropdownOpen(false);
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
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt="ERP Yellow"
                            style={{ height: 32, objectFit: 'contain' }}
                        />
                    ) : (
                        <>
                            <div style={{ width: 24, height: 24, background: 'var(--color-primary)', borderRadius: 4 }}></div>
                            ERP Yellow
                        </>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className={styles.notificationContainer} ref={notifDropdownRef}>
                    <button
                        className={styles.notificationButton}
                        onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                        )}
                    </button>

                    <div className={`${styles.notificationDropdown} ${notifDropdownOpen ? styles.show : ''}`}>
                        <div className={styles.notificationHeader}>
                            <h3>Notificações</h3>
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllRead} className={styles.markAllRead}>
                                    Marcar todas como lidas
                                </button>
                            )}
                        </div>
                        <div className={styles.notificationList}>
                            {notifications.length === 0 ? (
                                <div className={styles.emptyState}>
                                    Nenhuma notificação.
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <button
                                        key={notif.id}
                                        className={`${styles.notificationItem} ${!notif.is_read ? styles.unread : ''}`}
                                        onClick={() => handleNotificationClick(notif)}
                                        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none' }}
                                    >
                                        <div className={styles.notificationTitle}>{notif.title}</div>
                                        <div className={styles.notificationMessage}>{notif.message}</div>
                                        <div className={styles.notificationTime}>
                                            {new Date(notif.created_at).toLocaleString()}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
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
            </div>
        </header>
    );
};
