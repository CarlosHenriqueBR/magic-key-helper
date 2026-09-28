import { createServerFn } from "@tanstack/react-start";

import type { Customer, Tracking } from "./payment.server";
import type { UpsellId } from "./upsell-config";

type PixInput = {
  upsell: UpsellId;
  customer: Customer;
  tracking: Tracking;
  sourceUrl: string;
};

export const createPixPayment = createServerFn({ method: "POST" })
  .inputValidator((data: PixInput) => data)
  .handler(async ({ data }) => {
    const { nitroCreatePix, utmifyNotify, getClientIp, signContext } = await import("./payment.server");
    const { UPSELLS } = await import("./upsell-config");

    const cfg = UPSELLS[data.upsell] ?? UPSELLS.up1;
    const orderId = `${cfg.id}_${Date.now()}`;
    const createdAt = new Date().toISOString().slice(0, 19).replace("T", " ");
    const ip = await getClientIp();

    const origin = new URL(data.sourceUrl).origin;

    // O gateway limita o tamanho da postback_url, então o contexto vai compacto
    // (sem os dados do cliente, que o webhook busca na própria transação).
    const buildPostback = (withTracking: boolean) => {
      const token = signContext({
        u: cfg.id,
        c: createdAt,
        i: ip,
        ...(withTracking ? { k: data.tracking } : {}),
      });
      return `${origin}/api/public/nitro-webhook?ctx=${encodeURIComponent(token)}`;
    };
    let postbackUrl = buildPostback(true);
    if (postbackUrl.length > 240) postbackUrl = buildPostback(false);

    const pix = await nitroCreatePix({
      amount: cfg.amount,
      description: cfg.productName,
      customer: data.customer,
      orderId,
      sourceUrl: data.sourceUrl,
      tracking: data.tracking,
      postbackUrl,
    });

    // Pedido gerado (Pix aguardando pagamento) -> UTMify
    await utmifyNotify({
      orderId: pix.id,
      status: "waiting_payment",
      amount: cfg.amount,
      productId: cfg.id,
      productName: cfg.productName,
      customer: data.customer,
      tracking: data.tracking,
      createdAt,
      ip,
    });

    return { transactionId: pix.id, pixCode: pix.pixCode, createdAt };
  });

type StatusInput = {
  upsell: UpsellId;
  transactionId: string;
  createdAt: string;
  customer: Customer;
  tracking: Tracking;
};

export const checkPixPayment = createServerFn({ method: "POST" })
  .inputValidator((data: StatusInput) => data)
  .handler(async ({ data }) => {
    const { nitroGetStatus, utmifyNotify, getClientIp } = await import("./payment.server");
    const { UPSELLS } = await import("./upsell-config");

    const cfg = UPSELLS[data.upsell] ?? UPSELLS.up1;
    const raw = await nitroGetStatus(data.transactionId);
    const status = raw.toLowerCase();

    if (status === "pago" || status === "paid" || status === "approved") {
      // Notificação de PAGO para a UTMify
      await utmifyNotify({
        orderId: data.transactionId,
        status: "paid",
        amount: cfg.amount,
        productId: cfg.id,
        productName: cfg.productName,
        customer: data.customer,
        tracking: data.tracking,
        createdAt: data.createdAt,
        ip: await getClientIp(),
      });
      return { state: "paid" as const, raw };
    }

    if (["expirado", "expired", "cancelado", "canceled", "cancelled", "refused"].includes(status)) {
      return { state: "expired" as const, raw };
    }

    return { state: "pending" as const, raw };
  });
