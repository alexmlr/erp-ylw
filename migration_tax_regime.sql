-- Migration: Adicionar campo Regime Tributário na tabela suppliers
-- Data: 2026-10-28
-- Descrição: Adiciona a coluna tax_regime com restrição CHECK para os 4 regimes tributários válidos

ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS tax_regime TEXT 
CHECK (tax_regime IN ('Simples Puro', 'Simples Híbrido', 'Lucro Presumido', 'Lucro Real'));

-- Verificar se a coluna foi criada corretamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'suppliers' AND column_name = 'tax_regime';
