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
    created_at?: string;
    updated_at?: string;
}
