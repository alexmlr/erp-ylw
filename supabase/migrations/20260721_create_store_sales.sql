-- Create store_sales table for Loja Yellow general sales
CREATE TABLE IF NOT EXISTS public.store_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_date DATE NOT NULL,
    unit_id UUID REFERENCES public.units(id),
    payment_method TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.store_sales ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view store_sales"
    ON public.store_sales FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert store_sales"
    ON public.store_sales FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update store_sales"
    ON public.store_sales FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can delete store_sales"
    ON public.store_sales FOR DELETE
    TO authenticated
    USING (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_store_sales_sale_date ON public.store_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_store_sales_unit_id ON public.store_sales(unit_id);
