import React from 'react';
import styles from './Pages.module.css';

const Dashboard: React.FC = () => {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Dashboard</h1>
            <div className={styles.dashboardGrid}>
                <div className={styles.statCard}>
                    <h2 className={styles.statLabel}>Total Inventory</h2>
                    <p className={styles.statValue}>1,240</p>
                </div>
                <div className={`${styles.statCard} ${styles.blue}`}>
                    <h2 className={styles.statLabel}>New Orders</h2>
                    <p className={styles.statValue}>45</p>
                </div>
                <div className={`${styles.statCard} ${styles.green}`}>
                    <h2 className={styles.statLabel}>Revenue (Monthly)</h2>
                    <p className={styles.statValue}>$24,500</p>
                </div>
            </div>

            <div className={styles.card} style={{ textAlign: 'left', marginTop: '1rem' }}>
                <h2 className={styles.title} style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Recent Activity</h2>
                <div className="space-y-4">
                    <p className="text-gray-500 text-sm">No recent activity.</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
