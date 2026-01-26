export interface Unit {
    id: string;
    name: string;
    address: string | null;
    active: boolean;
    created_at: string;
}

export interface Profile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: 'admin' | 'manager' | 'administrative' | 'commercial' | 'user' | string;
    email?: string;
    permissions?: string[];
    unit_id?: string | null;
    unit?: Unit;
    created_at: string;
}

export interface User {
    id: string;
    email?: string;
    profile?: Profile;
}


export interface Requisition {
    id: string;
    requester_id: string; // Matches DB column
    user_id?: string; // Optional alias if needed, or remove? Keeping for compatibility if used elsewhere.
    display_id: number;
    status: 'PENDENTE' | 'APROVADO' | 'RECUSADO' | 'ENTREGUE' | 'EM_SEPARACAO';
    items: Record<string, unknown>[];
    unit_id?: string | null;
    unit?: Unit;
    created_at: string;
    profile?: { full_name: string | null }; // Added for joins
}

export interface Supplier {
    id: string;
    name: string;
    cnpj?: string | null;
    address_street?: string | null;
    address_number?: string | null;
    address_complement?: string | null;
    address_neighborhood?: string | null;
    address_city?: string | null;
    address_state?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    seller_name?: string | null;
    seller_phone?: string | null;
    seller_whatsapp?: string | null;
    payment_methods?: string[] | null;
    shipping_type?: 'Cobrado' | 'Gratuito' | 'Não possui' | null;
    observations?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface Category {
    id: string;
    name: string;
    created_at: string;
}

export interface Product {
    id: string;
    name: string;
    description?: string | null;
    unit: string;
    min_quantity?: number;
    quantity: number;
    category?: string; // Keep for backward compatibility/display if needed, but redundant with join
    category_id?: string | null;
    category_data?: Category; // For joined data
    image_url?: string | null;
    created_at: string;
}

export type QuotationStatus = 'open' | 'negotiation' | 'approved' | 'rejected';

export interface Quotation {
    id: string;
    display_id: number;
    created_by: string;
    created_by_user?: Profile;
    status: QuotationStatus;
    created_at: string;
    updated_at: string;
    products?: QuotationProduct[];
}

export interface QuotationProduct {
    id: string;
    quotation_id: string;
    product_id: string;
    product?: Product;
    quantity: number;
    observation?: string | null;
    prices?: QuotationProductPrice[];
}

export interface QuotationProductPrice {
    id: string;
    quotation_product_id: string;
    supplier_id: string;
    supplier?: Supplier;
    unit_price: number;
    is_negotiation_requested: boolean;
    target_price?: number | null;
    negotiation_reason?: string | null;
}

export interface QuotationLog {
    id: string;
    quotation_id: string;
    user_id: string;
    user?: Profile;
    action_description: string;
    created_at: string;
}
