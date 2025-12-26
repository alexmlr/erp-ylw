
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit2, ArrowLeft, MessageCircle } from 'lucide-react';
import styles from './Suppliers.module.css';
import type { Supplier } from '../../../types';
import { supplierService } from '../../../services/supplierService';
import { SupplierModal } from './SupplierModal';

export const SupplierDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'purchases' | 'quotations'>('purchases');

    const loadSupplier = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await supplierService.getSupplierById(id);
            setSupplier(data);
        } catch (error) {
            console.error('Error loading supplier:', error);
            alert('Erro ao carregar fornecedor');
            navigate('/purchases/suppliers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSupplier();
    }, [id]);

    const formatWhatsappLink = (phone: string | null | undefined) => {
        if (!phone) return '#';
        const cleanPhone = phone.replace(/\D/g, '');
        return `https://wa.me/55${cleanPhone}`;
    };

    if (loading) {
        return <div className={styles.container}>Carregando...</div>;
    }

    if (!supplier) {
        return <div className={styles.container}>Fornecedor não encontrado.</div>;
    }

    return (
        <div className={styles.container}>
            <button className={styles.backButton} onClick={() => navigate('/purchases/suppliers')}>
                <ArrowLeft size={20} />
                Voltar
            </button>

            <div className={styles.detailsHeader}>
                <div className={styles.headerTop}>
                    <div>
                        <h1 className={styles.detailsTitle}>{supplier.name}</h1>
                        <span className={styles.cnpj}>CNPJ: {supplier.cnpj || '-'}</span>
                    </div>
                    <button className={styles.editButton} onClick={() => setIsEditModalOpen(true)}>
                        <Edit2 size={16} />
                        Editar Fornecedor
                    </button>
                </div>

                <div className={styles.infoGrid}>
                    <div className={styles.infoSection}>
                        <h3>Endereço</h3>
                        <p>{supplier.address_street}, {supplier.address_number} {supplier.address_complement}</p>
                        <p>{supplier.address_neighborhood} - {supplier.address_city}/{supplier.address_state}</p>
                    </div>
                    <div className={styles.infoSection}>
                        <h3>Contato</h3>
                        <p>Telefone: {supplier.phone || '-'}</p>
                        <div className={styles.whatsappRow}>
                            Whatsapp:
                            {supplier.whatsapp ? (
                                <a
                                    href={formatWhatsappLink(supplier.whatsapp)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.whatsappLink}
                                >
                                    <MessageCircle size={16} />
                                    {supplier.whatsapp}
                                </a>
                            ) : '-'}
                        </div>
                    </div>
                    <div className={styles.infoSection}>
                        <h3>Vendedor</h3>
                        <p>Nome: {supplier.seller_name || '-'}</p>
                        <p>Tel: {supplier.seller_phone || '-'}</p>
                        <div className={styles.whatsappRow}>
                            Zap:
                            {supplier.seller_whatsapp ? (
                                <a
                                    href={formatWhatsappLink(supplier.seller_whatsapp)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.whatsappLink}
                                >
                                    <MessageCircle size={16} />
                                    {supplier.seller_whatsapp}
                                </a>
                            ) : '-'}
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.tabsContainer}>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'purchases' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('purchases')}
                    >
                        Histórico de Compras
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'quotations' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('quotations')}
                    >
                        Histórico de Cotações
                    </button>
                </div>

                <div className={styles.tabContent}>
                    {activeTab === 'purchases' && (
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Data da Cotação</th>
                                        <th>Status</th>
                                        <th>Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colSpan={3} style={{ textAlign: 'center', color: '#6B7280', padding: '2rem' }}>
                                            Nenhuma compra registrada.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'quotations' && (
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Status</th>
                                        <th>Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colSpan={3} style={{ textAlign: 'center', color: '#6B7280', padding: '2rem' }}>
                                            Nenhuma cotação registrada.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <SupplierModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={loadSupplier}
                supplierToEdit={supplier}
            />
        </div>
    );
};
