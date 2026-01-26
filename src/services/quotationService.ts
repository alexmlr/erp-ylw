import { supabase } from '../lib/supabase';
import type { Quotation, QuotationLog } from '../types';
import { quoteNotificationService } from './quoteNotificationService';

export const quotationService = {
    // --- Create ---

    async createQuotation(
        products: {
            product_id: string;
            quantity: number;
            observation?: string;
            prices: { supplier_id: string; unit_price: number }[];
        }[],
        userId: string
    ) {
        // 1. Create Quotation Header
        const { data: quotation, error: qtError } = await supabase
            .from('quotations')
            .insert({
                created_by: userId,
                status: 'draft',
            })
            .select()
            .single();

        if (qtError) throw qtError;
        if (!quotation) throw new Error('Failed to create quotation header');

        try {
            // 2. Insert Products and Prices
            for (const p of products) {
                const { data: qProduct, error: prodError } = await supabase
                    .from('quotation_products')
                    .insert({
                        quotation_id: quotation.id,
                        product_id: p.product_id,
                        quantity: p.quantity,
                        observation: p.observation,
                    })
                    .select()
                    .single();

                if (prodError) throw prodError;

                if (p.prices && p.prices.length > 0) {
                    const pricesToInsert = p.prices.map((price) => ({
                        quotation_product_id: qProduct.id,
                        supplier_id: price.supplier_id,
                        unit_price: price.unit_price,
                    }));

                    const { error: pricesError } = await supabase
                        .from('quotation_product_prices')
                        .insert(pricesToInsert);

                    if (pricesError) throw pricesError;
                }
            }

            // 3. Log creation
            await this.logAction(quotation.id, userId, 'Cotação criada');

            // 4. Notify (Check if author is Admin, then notify Managers)
            // Fetch author profile to get name
            const { data: authorProfile } = await supabase
                .from('profiles')
                .select('full_name, role')
                .eq('id', userId)
                .single();

            if (authorProfile) {
                // If author is administrative or something else, notify managers
                // The requirement is that Administrative users notify Managers.
                // We can just notify managers for all new quotes for now, or check role.
                // Based on user request: "created a quote with Administrative user... logged with Gestão... no notification"

                await quoteNotificationService.notifyNewQuote({
                    quoteId: quotation.id,
                    authorName: authorProfile.full_name || 'Usuário'
                });
            }

            return quotation;
        } catch (error) {
            // If possible, we should rollback here (delete quotation), but Supabase RPC is better for transactions.
            // For MVP, we catch and rethrow.
            console.error('Error creating full quotation:', error);
            throw error;
        }
    },

    // --- Read ---

    async getQuotations() {
        // Fetch quotes with creator info
        const { data, error } = await supabase
            .from('quotations')
            .select(`
        *,
        created_by_user:profiles!created_by(id, full_name, role)
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Quotation[];
    },

    async getQuotationById(id: string) {
        // Deep fetch: Quote -> Products -> ProductDetails, Prices -> Suppliers
        const { data, error } = await supabase
            .from('quotations')
            .select(`
        *,
        created_by_user:profiles!created_by(id, full_name, role),
        products:quotation_products(
          *,
          product:products(id, name, unit),
          prices:quotation_product_prices(
            *,
            supplier:suppliers(id, name)
          )
        )
      `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Quotation;
    },

    async getQuotationLogs(quotationId: string) {
        const { data, error } = await supabase
            .from('quotation_logs')
            .select(`
            *,
            user:profiles(id, full_name)
        `)
            .eq('quotation_id', quotationId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as QuotationLog[];
    },

    // --- Analytics ---

    async getApprovedQuotationsWithDetails() {
        const { data, error } = await supabase
            .from('quotations')
            .select(`
                *,
                products:quotation_products(
                    quantity,
                    prices:quotation_product_prices(supplier_id, unit_price),
                    product:products(
                        id, 
                        name, 
                        category_id,
                        category_data:categories(name)
                    )
                )
            `)
            .eq('status', 'approved');

        if (error) throw error;
        return data as Quotation[];
    },

    // --- Update ---

    // For Admin updating prices/quantities before sending
    async updateQuotationDraft(
        quotationId: string,
        userId: string,
        products: {
            id?: string; // If existing item
            product_id: string;
            quantity: number;
            observation?: string;
            prices: {
                id?: string; // If existing price
                supplier_id: string;
                unit_price: number
            }[]
        }[]
    ) {
        // Because syncing a complex nested structure manually is hard without specific "diffing",
        // a simpler strategy for "Draft" updates effectively re-creating items is often used,
        // OR we just assume the user edits existing ones.
        // Given the complexity, let's implement a robust "Upsert" logic ideally, 
        // or strictly separate "Add Item" from "Edit Item".
        // To keep it simple for this MVP and context:
        // We will assume the Form passes everything current.
        // We can delete all items and recreate them (nuclear option, safe for consistency, bad for ID persistence),
        // OR we implement specific 'update' calls.

        // Let's go with: Delete all items and recreate. 
        // It's the safest way to ensure the DB matches the Form state exactly for a "Save" operation 
        // where items might have been removed or added in UI.

        // 1. Delete all existing products (cascade deletes prices)
        const { error: delError } = await supabase
            .from('quotation_products')
            .delete()
            .eq('quotation_id', quotationId);

        if (delError) throw delError;

        // 2. Re-insert everything (Use Create logic)
        // Reuse the inner logic of createQuotation roughly
        for (const p of products) {
            const { data: qProduct, error: prodError } = await supabase
                .from('quotation_products')
                .insert({
                    quotation_id: quotationId,
                    product_id: p.product_id,
                    quantity: p.quantity,
                    observation: p.observation,
                })
                .select()
                .single();

            if (prodError) throw prodError;

            if (p.prices && p.prices.length > 0) {
                const pricesToInsert = p.prices.map((price) => ({
                    quotation_product_id: qProduct.id,
                    supplier_id: price.supplier_id,
                    unit_price: price.unit_price,
                }));

                const { error: pricesError } = await supabase
                    .from('quotation_product_prices')
                    .insert(pricesToInsert);

                if (pricesError) throw pricesError;
            }
        }

        await this.logAction(quotationId, userId, 'Cotação atualizada (Rascunho)');
    },

    async updateStatus(quotationId: string, userId: string, status: 'open' | 'negotiation' | 'approved' | 'rejected', reason?: string) {
        const { error } = await supabase
            .from('quotations')
            .update({ status })
            .eq('id', quotationId);

        if (error) throw error;

        let action = `Alterou status para ${status}`;
        if (reason) action += `. Obs: ${reason}`;

        await this.logAction(quotationId, userId, action);

        // Notifications should be triggered by the caller or here.
        // await quoteNotificationService.notifyQuoteStatusChange(...)
    },

    // For Manager setting target prices (Negotiation Request)
    async updateNegotiationPrices(
        quotationId: string,
        userId: string,
        prices: { price_id: string; target_price: number; reason?: string }[]
    ) {
        for (const p of prices) {
            const { error } = await supabase
                .from('quotation_product_prices')
                .update({
                    is_negotiation_requested: true,
                    target_price: p.target_price,
                    negotiation_reason: p.reason
                })
                .eq('id', p.price_id);

            if (error) throw error;
        }

        await this.logAction(quotationId, userId, 'Solicitou negociação em itens específicos');
    },

    // For Admin updating prices during Negotiation
    async resolveNegotiationPrices(
        quotationId: string,
        userId: string,
        prices: { price_id: string; new_unit_price: number }[]
    ) {
        for (const p of prices) {
            const { error } = await supabase
                .from('quotation_product_prices')
                .update({
                    unit_price: p.new_unit_price,
                    // We might keep is_negotiation_requested=true to show it DID happen, 
                    // or false to clear it. Usually better to keep history or have a status.
                    // Let's unflag it to show it's "addressed" or keep it?
                    // Requirements say: "Admin sees target price... modifies values... sends back".
                    // Let's keep the flags so we know which ones were under neg.
                })
                .eq('id', p.price_id);

            if (error) throw error;
        }

        await this.logAction(quotationId, userId, 'Atualizou preços em negociação');
    },

    async logAction(quotationId: string, userId: string, description: string) {
        await supabase.from('quotation_logs').insert({
            quotation_id: quotationId,
            user_id: userId,
            action_description: description
        });
    },

    async deleteQuotation(quotationId: string) {
        const { error } = await supabase
            .from('quotations')
            .delete()
            .eq('id', quotationId);

        if (error) throw error;
    }
};
