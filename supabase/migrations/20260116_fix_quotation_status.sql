-- Migration to fix Quotation Status Constraint and Add Delete Policy

-- 1. Drop the old constraint that restricted status to only ('open', 'negotiation', 'approved', 'rejected')
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_status_check;

-- 2. Add the new constraint including 'draft'
ALTER TABLE public.quotations ADD CONSTRAINT quotations_status_check 
    CHECK (status IN ('draft', 'open', 'negotiation', 'approved', 'rejected'));

-- 3. Enable Delete Policy for Quotations (Row Level Security)
-- Allow authenticated users to delete quotations (Application logic restricts this further to Admin/Manager)
CREATE POLICY "Enable delete for authenticated users" ON public.quotations
    FOR DELETE USING (auth.role() = 'authenticated');
