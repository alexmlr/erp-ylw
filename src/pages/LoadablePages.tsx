import React from 'react';
import styles from './Pages.module.css';

export const Inventory: React.FC = () => (
    <div className={styles.container}>
        <h1 className={styles.title}>Inventário</h1>
        <div className={styles.card}>
            Módulo em desenvolvimento...
        </div>
    </div>
);

export const Purchases: React.FC = () => <PurchasesDashboard />;
import { PurchasesDashboard } from './Purchases/PurchasesDashboard';

export { SettingsPage as Settings } from './Settings/SettingsPage';
