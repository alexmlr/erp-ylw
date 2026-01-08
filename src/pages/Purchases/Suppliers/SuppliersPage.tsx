import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, MessageCircle } from 'lucide-react';

import styles from './Suppliers.module.css';
import type { Supplier } from '../../../types';
import { supplierService } from '../../../services/supplierService';
import { SupplierModal } from './SupplierModal';
import { loggerService } from '../../../services/loggerService';

export const SuppliersPage: React.FC = () => {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [supplierToEdit, setSupplierToEdit] = useState<Supplier | undefined>(undefined);

    const loadSuppliers = async () => {
        try {
            setLoading(true);
            const data = await supplierService.getSuppliers();
            setSuppliers(data);
        } catch (error) {
            console.error('Error loading suppliers:', error);
            // alert('Erro ao carregar fornecedores');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSuppliers();
    }, []);

    const handleCreate = () => {
        setSupplierToEdit(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (supplier: Supplier) => {
        setSupplierToEdit(supplier);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Tem certeza que deseja excluir o fornecedor ${name}?`)) {
            try {
                await supplierService.deleteSupplier(id);
                // Log Delete
                await loggerService.logAction({
                    action: 'Excluiu Fornecedor',
                    entity: 'Fornecedor',
                    entity_id: id,
                    details: { name: name }
                });
                loadSuppliers();
            } catch (error) {
                console.error('Error deleting supplier:', error);
                alert('Erro ao excluir fornecedor');
            }
        }
    };

    const formatWhatsappLink = (phone: string | null | undefined) => {
        if (!phone) return '#';
        // Remove non-numeric characters
        const cleanPhone = phone.replace(/\D/g, '');
        return `https://wa.me/55${cleanPhone}`;
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Fornecedores</h1>
                <button className={styles.newButton} onClick={handleCreate}>
                    <Plus size={20} />
                    Novo Fornecedor
                </button>
            </div>

            <div className={styles.content}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando...</div>
                ) : suppliers.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>Nenhum fornecedor cadastrado.</p>
                    </div>
                ) : (
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Telefone</th>
                                    <th>Whatsapp</th>
                                    <th>Vendedor</th>
                                    <th>Cidade/UF</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.map((supplier: Supplier) => (

                                    <tr key={supplier.id} className={styles.tableRow}>
                                        <td>
                                            <span
                                                className={styles.supplierNameLink}
                                                onClick={() => navigate(`/purchases/suppliers/${supplier.id}`)}
                                                style={{ cursor: 'pointer', fontWeight: 500, color: '#111827' }}
                                                onMouseOver={(e) => e.currentTarget.style.color = '#F59E0B'}
                                                onMouseOut={(e) => e.currentTarget.style.color = '#111827'}
                                            >
                                                {supplier.name}
                                            </span>
                                        </td>
                                        <td>{supplier.phone || '-'}</td>

                                        <td>
                                            {supplier.whatsapp && (
                                                <a
                                                    href={formatWhatsappLink(supplier.whatsapp)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.whatsappLink}
                                                    title="Conversar no Whatsapp"
                                                >
                                                    <MessageCircle size={18} />
                                                    {supplier.whatsapp}
                                                </a>
                                            )}
                                            {!supplier.whatsapp && '-'}
                                        </td>
                                        <td>
                                            {supplier.seller_name ? (
                                                <div>
                                                    <div>{supplier.seller_name}</div>
                                                    {supplier.seller_whatsapp && (
                                                        <a
                                                            href={formatWhatsappLink(supplier.seller_whatsapp)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={styles.whatsappLink}
                                                            style={{ fontSize: '0.8em' }}
                                                        >
                                                            <MessageCircle size={14} />
                                                            {supplier.seller_whatsapp}
                                                        </a>
                                                    )}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            {supplier.address_city && supplier.address_state
                                                ? `${supplier.address_city}/${supplier.address_state}`
                                                : '-'}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className={styles.actionButton}
                                                    onClick={() => handleEdit(supplier)}
                                                    title="Editar"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    className={styles.actionButton}
                                                    onClick={() => handleDelete(supplier.id, supplier.name)}
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <SupplierModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={loadSuppliers}
                supplierToEdit={supplierToEdit}
            />
        </div>
    );
};
