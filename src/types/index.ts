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
    user_id: string;
    status: 'pending' | 'approved' | 'rejected' | 'delivered';
    items: any[]; // Define Item type if available or keep any
    unit_id?: string | null;
    unit?: Unit;
    created_at: string;
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

export interface Product {
    id: string;
    name: string;
    description?: string | null;
    unit: string;
    min_stock?: number;
    current_stock: number;
    category?: string;
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
