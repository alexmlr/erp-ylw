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
