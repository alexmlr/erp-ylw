import React from 'react';
import { Edit2, Trash2, Package } from 'lucide-react';
import styles from './Products.module.css';

export interface Product {
    id: string;
    name: string;
    category: string;
    unit: string;
    image_url: string | null;
    quantity?: number;
    min_quantity?: number;
    created_at: string;
}

interface ProductCardProps {
    product: Product;
    onEdit: (product: Product) => void;
    onDelete: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onDelete }) => {
    return (
        <div className={styles.card}>
            <div className={styles.imageContainer}>
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className={styles.productImage}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = ''; // Fallback if functionality needed
                            // For now just letting it break or we could toggle a state to show placeholder
                        }}
                    />
                ) : (
                    <div className={styles.placeholderImage}>
                        <Package size={32} />
                    </div>
                )}
            </div>

            <div className={styles.info}>
                <div className={styles.category}>{product.category}</div>
                <h3 className={styles.productName} title={product.name}>{product.name}</h3>
                <div className={styles.details}>
                    <span>UN: {product.unit}</span>
                </div>
            </div>

            <div className={styles.actions}>
                <button
                    onClick={() => onEdit(product)}
                    className={styles.actionButton}
                    title="Editar"
                >
                    <Edit2 size={18} />
                </button>
                <button
                    onClick={() => onDelete(product.id)}
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    title="Excluir"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
};
