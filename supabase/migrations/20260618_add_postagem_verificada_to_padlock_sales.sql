-- Add postagem_verificada column to padlock_sales
ALTER TABLE padlock_sales ADD COLUMN postagem_verificada BOOLEAN DEFAULT FALSE;
