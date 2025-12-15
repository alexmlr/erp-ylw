import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import styles from './Layout.module.css';

export const MainLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className={styles.layout}>
            <Header toggleSidebar={toggleSidebar} />
            <div className={styles.mainWrapper}>
                <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
                <main className={styles.content}>
                    <Outlet />
                </main>
            </div>
            <Footer />
        </div>
    );
};
