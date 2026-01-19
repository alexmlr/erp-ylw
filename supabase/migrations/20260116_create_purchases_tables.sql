-- Create Quotations table
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    display_id SERIAL,
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'negotiation', 'approved', 'rejected')) DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Quotation Products table (Items requested in the quotation)
CREATE TABLE IF NOT EXISTS public.quotation_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) NOT NULL, -- Assuming products table exists
    quantity INTEGER NOT NULL,
    observation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Quotation Product Prices table (Prices per supplier for each product)
CREATE TABLE IF NOT EXISTS public.quotation_product_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quotation_product_id UUID REFERENCES public.quotation_products(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) NOT NULL, -- Assuming suppliers table exists
    unit_price DECIMAL(10, 2) NOT NULL,
    is_negotiation_requested BOOLEAN DEFAULT FALSE,
    target_price DECIMAL(10, 2),
    negotiation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Quotation Logs table
CREATE TABLE IF NOT EXISTS public.quotation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    action_description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_logs ENABLE ROW LEVEL SECURITY;

-- Policies for quotations
-- Allow Read for users with 'purchases_access' permission OR role 'manager' OR 'admin'
-- Since checking array permissions in SQL can be complex depending on structure, 
-- we will assume a simple check or broad access for authenticated users for now, 
-- refining based on exact profile structure if needed. 
-- For now, allow authenticated users to view.
CREATE POLICY "Enable read access for authenticated users" ON public.quotations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow Insert for authenticated users (Logic validation happens in app)
CREATE POLICY "Enable insert for authenticated users" ON public.quotations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow Update for authenticated users
CREATE POLICY "Enable update for authenticated users" ON public.quotations
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Repeat simple policies for child tables for now
CREATE POLICY "Enable all access for authenticated users" ON public.quotation_products
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.quotation_product_prices
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.quotation_logs
    FOR ALL USING (auth.role() = 'authenticated');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quotations_updated_at
    BEFORE UPDATE ON public.quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
