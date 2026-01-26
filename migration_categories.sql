-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policies for categories
-- Everyone can read
CREATE POLICY "Enable read access for all users" ON categories
    FOR SELECT USING (true);

-- Only admin and manager can insert/update/delete
-- (Assuming profiles table exists and permissions logic, simplifying to authenticated check + role check if possible, 
-- or just relying on application logic if RLS is too complex for this context without auth.uid() trigger setup. 
-- For now, allowing authenticated users to read, and restricting write in App logic, but RLS is safer.)
-- Note: Current app has RLS relying on 'auth.uid()'.

CREATE POLICY "Enable insert for admin and manager" ON categories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager', 'administrative')
        )
    );

CREATE POLICY "Enable update for admin and manager" ON categories
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager', 'administrative')
        )
    );

CREATE POLICY "Enable delete for admin and manager" ON categories
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'manager', 'administrative')
        )
    );


-- Migration: Extract unique categories from products and insert them
INSERT INTO categories (name)
SELECT DISTINCT category
FROM products
WHERE category IS NOT NULL AND category != ''
AND NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.name = products.category
);

-- Add category_id to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);

-- Update products to set category_id based on category name
UPDATE products
SET category_id = categories.id
FROM categories
WHERE products.category = categories.name;

-- Add constraint to prevent deletion if used (handled by FK default, but explicitly usually RESTRICT)
-- Postgres FK default on delete is NO ACTION (like Restrict), which prevents deletion if rows exist. Good.

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
