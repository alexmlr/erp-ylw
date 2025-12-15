import React from 'react';
import styles from './Layout.module.css';

export const Footer: React.FC = () => {
    return (
        <footer className={styles.footer}>
            &copy; {new Date().getFullYear()} ERP Yellow. Todos os direitos reservados.
        </footer>
    );
};
