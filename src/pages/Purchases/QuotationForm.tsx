import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Send, X, Plus, Trash2, Edit, Check, RefreshCw, ArrowDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { quotationService } from '../../services/quotationService';
import { quoteNotificationService } from '../../services/quoteNotificationService';
import { useAuth } from '../../contexts/AuthContext';
import type { Product, Supplier, Quotation, QuotationProduct, QuotationProductPrice } from '../../types';
import styles from './QuotationForm.module.css';

// Helper to mimic local ID generation for new items
const generateTempId = () => `temp_${Math.random().toString(36).substr(2, 9)}`;

// --- Combobox Component ---
interface ProductComboboxProps {
    products: Product[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

const ProductCombobox: React.FC<ProductComboboxProps> = ({ products, value, onChange, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    // Initial value label
    useEffect(() => {
        if (value) {
            const selected = products.find(p => p.id === value);
            if (selected) setSearchTerm(selected.name);
        } else {
            setSearchTerm('');
        }
    }, [value, products]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Reset search term to selected value if nothing changed
                if (value) {
                    const selected = products.find(p => p.id === value);
                    if (selected && searchTerm !== selected.name) {
                        setSearchTerm(selected.name);
                    }
                } else if (!value && searchTerm !== '') {
                    setSearchTerm('');
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [wrapperRef, value, products, searchTerm]);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (productId: string) => {
        onChange(productId);
        setIsOpen(false);
    };

    return (
        <div className={styles.combobox} ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    className={styles.comboboxInput}
                    placeholder="Buscar produto..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                        if (e.target.value === '') onChange(''); // Clear
                    }}
                    onFocus={() => setIsOpen(true)}
                    disabled={disabled}
                />
                <div className={styles.comboboxIcon}>
                    <ArrowDown size={14} />
                </div>
            </div>

            {isOpen && !disabled && (
                <ul className={styles.comboboxList}>
                    {filteredProducts.length > 0 ? (
                        filteredProducts.map(product => {
                            const isSelected = product.id === value;
                            return (
                                <li
                                    key={product.id}
                                    className={`${styles.comboboxOption} ${isSelected ? styles.comboboxOptionSelected : ''}`}
                                    onMouseDown={() => handleSelect(product.id)} // MouseDown fires before Blur
                                >
                                    <span>{product.name}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                        Est: {product.current_stock} {product.unit}
                                    </span>
                                </li>
                            );
                        })
                    ) : (
                        <li className={styles.comboboxEmpty}>Nenhum produto encontrado</li>
                    )}
                </ul>
            )}
        </div>
    );
};

export const QuotationForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, profile: userProfile } = useAuth();

    // Data State
    const [quotation, setQuotation] = useState<Quotation | null>(null);
    const [items, setItems] = useState<Partial<QuotationProduct & { tempId?: string }>[]>([]);

    // Catalogs
    const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
    const [availableSuppliers, setAvailableSuppliers] = useState<Supplier[]>([]);

    // UI State
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(!id); // Default edit if new
    // const [formErrors, setFormErrors] = useState<string[]>([]);

    // Logic: Permissions
    const isAdmin = userProfile?.role === 'administrative' || userProfile?.role === 'admin';
    const isManager = userProfile?.role === 'manager' || userProfile?.role === 'admin'; // Admin can do both for testing usually

    // Negociation State (Manager specific)
    const [negotiationUpdates, setNegotiationUpdates] = useState<Record<string, { target_price?: number; reason?: string; needs_negotiation: boolean }>>({});

    useEffect(() => {
        loadCatalogs();
        if (id) {
            loadQuotation(id);
        }
    }, [id]);

    const loadCatalogs = async () => {
        try {
            // PRODUCTS: DB uses 'quantity', Type uses 'current_stock'. Map it.
            const { data: prods, error: prodError } = await supabase
                .from('products')
                .select('*')
                .gt('quantity', -1); // Active products

            if (prodError) console.error('Error fetching products:', prodError);

            if (prods) {
                const mappedProducts = prods.map(p => ({
                    ...p,
                    current_stock: p.quantity // Map DB 'quantity' to Type 'current_stock'
                })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
                setAvailableProducts(mappedProducts as Product[]);
            }

            // SUPPLIERS
            const { data: supps, error: suppError } = await supabase
                .from('suppliers')
                .select('*')
                .order('name');

            if (suppError) console.error('Error fetching suppliers:', suppError);
            if (supps) setAvailableSuppliers(supps as any[]);

        } catch (err) {
            console.error('Error loading catalogs:', err);
        }
    };

    const loadQuotation = async (quoteId: string) => {
        try {
            setLoading(true);
            const data = await quotationService.getQuotationById(quoteId);
            setQuotation(data);

            // Map items to local state
            if (data.products) {
                setItems(data.products.map(p => ({
                    ...p,
                    tempId: p.id // use real ID as tempId key
                })));
            }

            // If status is open and user is creator, allow edit? 
            // The req says: "If status is open, it allows distinct buttons..."
            // We set isEditing to false initially for existing quotes unless explicitly clicked.
            setIsEditing(false);

        } catch (error) {
            console.error('Error loading quotation:', error);
            navigate('/purchases/quotations');
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---

    const handleAddItem = () => {
        setItems([...items, {
            tempId: generateTempId(),
            product_id: '',
            quantity: 1,
            prices: []
        }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const updatePrice = (itemIndex: number, priceIndex: number, field: string, value: any) => {
        const newItems = [...items];
        const prices = newItems[itemIndex].prices ? [...newItems[itemIndex].prices!] : [];
        if (!prices[priceIndex]) return;

        prices[priceIndex] = { ...prices[priceIndex], [field]: value };
        newItems[itemIndex].prices = prices;
        setItems(newItems);
    };

    const addPriceRow = (itemIndex: number) => {
        const newItems = [...items];
        const prices = newItems[itemIndex].prices ? [...newItems[itemIndex].prices!] : [];
        if (prices.length >= 3) return; // Limit 3

        prices.push({
            id: generateTempId(), // temporary
            quotation_product_id: newItems[itemIndex].tempId || '',
            supplier_id: '',
            unit_price: 0,
            is_negotiation_requested: false
        } as any);

        newItems[itemIndex].prices = prices;
        setItems(newItems);
    };

    const removePriceRow = (itemIndex: number, priceIndex: number) => {
        const newItems = [...items];
        const prices = newItems[itemIndex].prices ? [...newItems[itemIndex].prices!] : [];
        prices.splice(priceIndex, 1);
        newItems[itemIndex].prices = prices;
        setItems(newItems);
    };

    // --- Save Logic ---

    const handleSaveDraft = async () => {
        if (!user) return;
        try {
            setLoading(true);

            const payloadItems = items.map(item => ({
                product_id: item.product_id!,
                quantity: item.quantity || 0,
                observation: item.observation || '',
                prices: item.prices?.map(p => ({
                    supplier_id: p.supplier_id,
                    unit_price: Number(p.unit_price)
                })) || []
            }));

            if (id) {
                // Update
                await quotationService.updateQuotationDraft(id, user.id, payloadItems as any);
                await loadQuotation(id); // Reload to get fresh IDs
            } else {
                // Create
                const newQt = await quotationService.createQuotation(payloadItems as any, user.id);
                navigate(`/purchases/quotations/${newQt.id}`);
            }

            setIsEditing(false); // Return to view mode

        } catch (error) {
            console.error('Save error:', error);
            alert('Erro ao salvar cotação.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendForAnalysis = async () => {
        if (!user) return;
        // Validate
        if (items.some(i => !i.product_id || (i.prices && i.prices.some(p => !p.supplier_id || p.unit_price <= 0)))) {
            alert('Preencha todos os campos obrigatórios (Produto, Fornecedor e Preço > 0).');
            return;
        }

        try {
            setLoading(true);
            // First save changes logic (reuse draft logic roughly or assume saved?)
            // Requirement says "Send submits to next stage". 
            // If it's new, we create then send? Or just create with status open? 
            // Implementation plan: create as 'open', notifications trigger separately?
            // Actually, `createQuotation` defaults to `open`.
            // The requirement says: "Admin creates -> Send -> Goes to Manager".
            // If already created (draft id exists), we execute logic.

            if (id) {
                // Ensure saved first?
                await handleSaveDraft();

                // If it was draft, now we open it.
                await quotationService.updateStatus(id, user.id, 'open');

                if (quotation) {
                    // Notify Managers
                    // Fetch current user name for notification
                    const authorName = userProfile?.full_name || 'Usuário';

                    await quoteNotificationService.notifyNewQuote({
                        quoteId: quotation.id,
                        authorName: authorName
                    });
                    await quotationService.logAction(quotation.id, user.id, 'Enviou para análise');
                }
            } else {
                // Create (Draft) and then Open
                const payloadItems = items.map(item => ({
                    product_id: item.product_id!,
                    quantity: item.quantity || 0,
                    observation: item.observation || '',
                    prices: item.prices?.map(p => ({
                        supplier_id: p.supplier_id,
                        unit_price: Number(p.unit_price)
                    })) || []
                }));
                // Create (Draft)
                const newQt = await quotationService.createQuotation(payloadItems, user.id);

                // Update to Open
                await quotationService.updateStatus(newQt.id, user.id, 'open');

                // Notify
                const authorName = userProfile?.full_name || 'Usuário';
                await quoteNotificationService.notifyNewQuote({
                    quoteId: newQt.id,
                    authorName: authorName
                });
                await quotationService.logAction(newQt.id, user.id, 'Enviou para análise');

                navigate(`/purchases/quotations/${newQt.id}`);
            }

            alert('Cotação enviada para análise!');
            setIsEditing(false);
        } catch (error) {
            console.error('Send error:', error);
            alert('Erro ao enviar.');
        } finally {
            setLoading(false);
        }
    };

    // --- Manager Logic ---

    const handleManagerNegotiate = async () => {
        if (!id || !user || !quotation) return;

        const updates = Object.entries(negotiationUpdates)
            .filter(([_, data]) => data.needs_negotiation)
            .map(([priceId, data]) => ({
                price_id: priceId,
                target_price: Number(data.target_price) || 0,
                reason: data.reason
            }));

        if (updates.length === 0) {
            alert('Selecione ao menos um item para negociar e informe o preço alvo/motivo.');
            return;
        }

        try {
            setLoading(true);
            await quotationService.updateNegotiationPrices(id, user.id, updates);
            await quotationService.updateStatus(id, user.id, 'negotiation', 'Gestor solicitou negociação');
            await quoteNotificationService.notifyQuoteStatusChange(id, quotation.display_id, 'negotiation', quotation.created_by);

            alert('Devolvido para negociação!');
            loadQuotation(id);
        } catch (e) {
            console.error(e);
            alert('Erro ao processar negociação');
        } finally {
            setLoading(false);
        }
    };

    const handleManagerApprove = async () => {
        if (!id || !user || !quotation) return;
        if (confirm('Tem certeza que deseja APROVAR esta cotação?')) {
            try {
                setLoading(true);
                await quotationService.updateStatus(id, user.id, 'approved');
                await quoteNotificationService.notifyQuoteStatusChange(id, quotation.display_id, 'approved', quotation.created_by);
                navigate('/purchases/quotations');
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleManagerReject = async () => {
        if (!id || !user || !quotation) return;
        if (confirm('Tem certeza que deseja RECUSAR esta cotação?')) {
            try {
                setLoading(true);
                await quotationService.updateStatus(id, user.id, 'rejected');
                await quoteNotificationService.notifyQuoteStatusChange(id, quotation.display_id, 'rejected', quotation.created_by);
                navigate('/purchases/quotations');
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
    };

    // --- Render Helpers ---

    const getLowestPrice = (prices: QuotationProductPrice[]) => {
        if (!prices || prices.length === 0) return Infinity;
        return Math.min(...prices.map(p => Number(p.unit_price)));
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/purchases/quotations')} className={styles.backButton}>
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className={styles.headerTitle}>
                            {id ? `Cotação #${quotation?.display_id ? String(quotation.display_id).padStart(6, '0') : '...'}` : 'Nova Cotação'}
                            {quotation?.status ? (
                                <span className={`
                                    ${styles.statusBadge}
                                    ${quotation.status === 'open' ? styles.statusOpen : ''}
                                    ${quotation.status === 'negotiation' ? styles.statusNegotiation : ''}
                                    ${quotation.status === 'approved' ? styles.statusApproved : ''}
                                    ${quotation.status === 'rejected' ? styles.statusRejected : ''}
                                `}>
                                    {{
                                        'open': 'Em Aberto',
                                        'draft': 'Rascunho',
                                        'negotiation': 'Negociação',
                                        'approved': 'Aprovado',
                                        'rejected': 'Recusado'
                                    }[quotation.status] || quotation.status}
                                </span>
                            ) : null}
                        </h1>
                        <p className={styles.headerSubtitle}>
                            {quotation ? `Criado por: ${quotation.created_by_user?.full_name} em ${new Date(quotation.created_at).toLocaleDateString()}` : 'Preencha os dados abaixo'}
                        </p>
                    </div>
                </div>

                {/* Edit Button */}
                {!isEditing && id && quotation && (quotation.status === 'open' || quotation.status === 'negotiation' || (quotation.status as string) === 'draft') && (isAdmin || quotation.created_by === user?.id) && (
                    <button onClick={() => setIsEditing(true)} className={styles.editButton}>
                        <Edit size={18} /> Editar
                    </button>
                )}
            </div>

            {/* Form Content */}
            <div className={styles.card}>

                {/* Products List */}
                <div className="space-y-8">
                    {items.map((item, index) => (
                        <div key={item.tempId || index} className={styles.productItem}>
                            {/* Product Header Row */}
                            <div className={styles.productRow}>
                                <div className={styles.colProduct}>
                                    <label className={styles.label}>Produto</label>
                                    {isEditing ? (
                                        <ProductCombobox
                                            products={availableProducts}
                                            value={item.product_id || ''}
                                            onChange={(val) => updateItem(index, 'product_id', val)}
                                        />
                                    ) : (
                                        <div className={styles.readOnlyText}>{item.product?.name || 'Produto não encontrado'}</div>
                                    )}
                                </div>
                                <div className={styles.colQty}>
                                    <label className={styles.label}>Qtd</label>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                            className={styles.input}
                                        />
                                    ) : (
                                        <div>{item.quantity} {item.product?.unit}</div>
                                    )}
                                </div>
                                <div className={styles.colObs}>
                                    {isEditing && (
                                        <button onClick={() => handleRemoveItem(index)} className={styles.removeButton}>
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                    <label className={styles.label}>Observação</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={item.observation || ''}
                                            onChange={(e) => updateItem(index, 'observation', e.target.value)}
                                            className={styles.input}
                                            placeholder="Obs sobre o item..."
                                        />
                                    ) : (
                                        <div className="text-gray-600 text-sm italic">{item.observation || '-'}</div>
                                    )}
                                </div>
                            </div>

                            {/* Suppliers/Prices Grid */}
                            <div className={styles.pricesSection}>
                                <h4 className={styles.pricesTitle}>Fornecedores & Preços</h4>
                                <div className={styles.pricesGrid}>
                                    {item.prices?.map((price, pIndex) => {
                                        const isBestPrice = !isEditing && price.unit_price === getLowestPrice(item.prices as any);
                                        const cardClass = `${styles.priceCard} ${isBestPrice ? styles.bestPrice : ''} ${price.is_negotiation_requested ? styles.negotiation : ''}`;

                                        return (
                                            <div key={price.id || pIndex} className={cardClass}>
                                                {/* Supplier Select */}
                                                {isEditing ? (
                                                    <div className="mb-2">
                                                        <select
                                                            value={price.supplier_id}
                                                            onChange={(e) => updatePrice(index, pIndex, 'supplier_id', e.target.value)}
                                                            className={styles.select}
                                                            style={{ fontSize: '0.875rem' }}
                                                        >
                                                            <option value="">Selecione Fornecedor</option>
                                                            {availableSuppliers.map(s => (
                                                                <option key={s.id} value={s.id}>{s.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className={styles.supplierName}>{price.supplier?.name || 'Fornecedor'}</div>
                                                )}

                                                {/* Price Input */}
                                                <div className={styles.priceRow}>
                                                    <span className={styles.currency}>R$</span>
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            value={price.unit_price}
                                                            onChange={(e) => updatePrice(index, pIndex, 'unit_price', Number(e.target.value))}
                                                            className={styles.input}
                                                            style={{ fontFamily: 'monospace' }}
                                                        />
                                                    ) : (
                                                        <span className={`${styles.priceValue} ${isBestPrice ? styles.bestPriceValue : ''}`}>
                                                            {price.unit_price}
                                                        </span>
                                                    )}

                                                    {/* Delete Price Button (Edit only) */}
                                                    {isEditing && (
                                                        <button onClick={() => removePriceRow(index, pIndex)} className={styles.priceDeleteBtn}>
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Manager Analysis View - Toggle Negotiation */}
                                                {!isEditing && isManager && quotation?.status === 'open' && (
                                                    <div className={styles.negotiationSection}>
                                                        <label className={styles.checkboxLabel}>
                                                            <input
                                                                type="checkbox"
                                                                onChange={(e) => {
                                                                    const checked = e.target.checked;
                                                                    setNegotiationUpdates(prev => ({
                                                                        ...prev,
                                                                        [price.id]: {
                                                                            ...prev[price.id],
                                                                            needs_negotiation: checked
                                                                        }
                                                                    }));
                                                                }}
                                                                checked={!!negotiationUpdates[price.id]?.needs_negotiation}
                                                            />
                                                            Solicitar Negociação
                                                        </label>

                                                        {negotiationUpdates[price.id]?.needs_negotiation && (
                                                            <div className={styles.negotiationInputs}>
                                                                <input
                                                                    type="number"
                                                                    placeholder="Preço Alvo"
                                                                    className={styles.input}
                                                                    style={{ fontSize: '0.8rem' }}
                                                                    value={negotiationUpdates[price.id]?.target_price || ''}
                                                                    onChange={(e) => setNegotiationUpdates(prev => ({
                                                                        ...prev,
                                                                        [price.id]: { ...prev[price.id], target_price: Number(e.target.value) }
                                                                    }))}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Motivo..."
                                                                    className={styles.input}
                                                                    style={{ fontSize: '0.8rem' }}
                                                                    value={negotiationUpdates[price.id]?.reason || ''}
                                                                    onChange={(e) => setNegotiationUpdates(prev => ({
                                                                        ...prev,
                                                                        [price.id]: { ...prev[price.id], reason: e.target.value }
                                                                    }))}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Negotiation Info Display (Admin/View) */}
                                                {price.is_negotiation_requested && !isEditing && (
                                                    <div className={styles.negotiationBadge}>
                                                        <strong>Negociação Solicitada!</strong>
                                                        {price.target_price && <div>Alvo: R$ {price.target_price}</div>}
                                                        {price.negotiation_reason && <div>Obs: {price.negotiation_reason}</div>}
                                                    </div>
                                                )}

                                            </div>
                                        );
                                    })}

                                    {/* Add Price Button */}
                                    {isEditing && (item.prices?.length || 0) < 3 && (
                                        <button onClick={() => addPriceRow(index)} className={styles.addPriceButton}>
                                            <Plus size={24} />
                                            <span style={{ fontSize: '0.8rem' }}>Add Fornecedor</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {isEditing && (
                    <button onClick={handleAddItem} className={styles.addProductButton}>
                        <Plus size={20} />
                        Adicionar Produto à Cotação
                    </button>
                )}
            </div>

            {/* Footer Actions */}
            <div className={styles.footer}>
                <div className={styles.footerContent}>
                    {/* Common */}
                    <button onClick={() => navigate('/purchases/quotations')} className={styles.btnCancel}>
                        Cancelar
                    </button>

                    {/* Admin / Editing Actions */}
                    {isEditing ? (
                        <>
                            <button onClick={handleSaveDraft} disabled={loading} className={styles.btnSave}>
                                <Save size={18} />
                                Salvar Rascunho
                            </button>
                            <button onClick={handleSendForAnalysis} disabled={loading} className={styles.btnSend}>
                                <Send size={18} />
                                Enviar
                            </button>
                        </>
                    ) : (
                        // Manager / Analysis Actions
                        isManager && quotation?.status === 'open' && (
                            <>
                                <button onClick={handleManagerReject} className={styles.btnReject}>
                                    <X size={18} />
                                    Recusar
                                </button>
                                <button onClick={handleManagerNegotiate} className={styles.btnNegotiate}>
                                    <RefreshCw size={18} />
                                    Negociar
                                </button>
                                <button onClick={handleManagerApprove} className={styles.btnApprove}>
                                    <Check size={18} />
                                    Aprovar
                                </button>
                            </>
                        )
                    )}
                </div>
            </div>

            {/* Spacer for fixed footer */}
            <div style={{ height: '96px' }}></div>
        </div>
    );
};
