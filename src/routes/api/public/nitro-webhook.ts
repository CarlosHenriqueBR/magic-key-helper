import { createFileRoute } from "@tanstack/react-router";

import type { Customer, Tracking } from "@/lib/payment.server";
import { UPSELLS, type UpsellId } from "@/lib/upsell-config";

/** Contexto compacto (a postback_url do gateway tem limite de tamanho). */
type Ctx = {
  u: UpsellId;
  c: string;
  i: string | null;
  k?: Tracking;
};

const EMPTY_TRACKING: Tracking = {
  src: null,
  sck: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_term: null,
  utm_content: null,
};

export const Route = createFileRoute("/api/public/nitro-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyContext, utmifyNotify, nitroGetTransaction } = await import("@/lib/payment.server");

        const token = new URL(request.url).searchParams.get("ctx") ?? "";
        const ctx = verifyContext<Ctx>(token);
        if (!ctx) {
          console.error("[nitro-webhook] contexto inválido");
          return new Response("invalid context", { status: 401 });
        }

        let body: { event?: string; data?: { transaction_id?: string; status?: string } } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("invalid body", { status: 400 });
        }

        const status = String(body.data?.status ?? "").toLowerCase();
        const event = String(body.event ?? "");
        const isPaid = event === "transaction.paid" || ["paid", "pago", "approved"].includes(status);
        const transactionId = body.data?.transaction_id;

        if (!isPaid || !transactionId) {
          console.log("[nitro-webhook] ignorado", event, status);
          return new Response("ok");
        }

        const cfg = UPSELLS[ctx.u] ?? UPSELLS.up1;

        // Os dados do cliente vêm da própria transação no gateway.
        let gwCustomer: Partial<Customer> | null = null;
        try {
          gwCustomer = (await nitroGetTransaction(transactionId)).customer;
        } catch (e) {
          console.error("[nitro-webhook] falha ao buscar transação", e);
        }

        const customer: Customer = {
          name: gwCustomer?.name ?? "Cliente",
          email: gwCustomer?.email ?? "cliente@desenrolabrasil.com",
          document: gwCustomer?.document ?? "00000000000",
          phone: gwCustomer?.phone ?? "11999999999",
        };

        await utmifyNotify({
          orderId: transactionId,
          status: "paid",
          amount: cfg.amount,
          productId: cfg.id,
          productName: cfg.productName,
          customer,
          tracking: ctx.k ?? EMPTY_TRACKING,
          createdAt: ctx.c,
          ip: ctx.i,
        });

        return new Response("ok");
      },
    },
  },
});
