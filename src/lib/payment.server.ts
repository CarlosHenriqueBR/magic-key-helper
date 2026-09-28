// Server-only helpers: Nitro Pay + UTMify integrations.
import { createHmac } from "crypto";

export type Customer = {
  name: string;
  email: string;
  document: string;
  phone: string;
};

export type Tracking = {
  src: string | null;
  sck: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
};

function nitroAuth() {
  const pub = process.env["NITRO_PUBLIC_KEY"] ?? "";
  const priv = process.env["NITRO_PRIVATE_KEY"] ?? "";
  return "Basic " + Buffer.from(`${pub}:${priv}`).toString("base64");
}

function nitroBase() {
  return (process.env["NITRO_API_URL"] ?? "https://api.nitropagamento.app").replace(/\/$/, "");
}

/** Assina o contexto do pedido para trafegar com segurança na postbackUrl. */
export function signContext(payload: unknown): string {
  const json = JSON.stringify(payload);
  const data = Buffer.from(json, "utf8").toString("base64url");
  const sig = createHmac("sha256", process.env["NITRO_PRIVATE_KEY"] ?? "dev")
    .update(data)
    .digest("hex")
    .slice(0, 32);
  return `${data}.${sig}`;
}

export function verifyContext<T>(token: string): T | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = createHmac("sha256", process.env["NITRO_PRIVATE_KEY"] ?? "dev")
    .update(data)
    .digest("hex")
    .slice(0, 32);
  if (expected !== sig) return null;
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export async function nitroCreatePix(input: {
  amount: number;
  description: string;
  customer: Customer;
  orderId: string;
  sourceUrl: string;
  tracking?: Tracking;
  postbackUrl?: string;
}) {
  const res = await fetch(nitroBase(), {
    method: "POST",
    headers: { Authorization: nitroAuth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: input.amount,
      payment_method: "pix",
      description: input.description,
      items: [
        {
          title: input.description,
          unitPrice: Math.round(input.amount * 100),
          quantity: 1,
          tangible: false,
        },
      ],
      customer: input.customer,
      metadata: { order_id: input.orderId },
      ...(input.postbackUrl ? { postbackUrl: input.postbackUrl } : {}),
      ...(input.tracking
        ? {
            tracking: {
              src: input.tracking.src ?? undefined,
              sck: input.tracking.sck ?? undefined,
              utm_source: input.tracking.utm_source ?? undefined,
              utm_medium: input.tracking.utm_medium ?? undefined,
              utm_campaign: input.tracking.utm_campaign ?? undefined,
              utm_term: input.tracking.utm_term ?? undefined,
              utm_content: input.tracking.utm_content ?? undefined,
            },
          }
        : {}),
      source_url: input.sourceUrl,
      source_label: "Upsell Desenrola Brasil",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[nitro] create failed", res.status, text);
    throw new Error("Falha ao gerar o Pix");
  }

  const json = (await res.json()) as { success?: boolean; data?: { id: string; pix_code: string } };
  if (!json.success || !json.data?.id) throw new Error("Resposta inválida do provedor");
  return { id: String(json.data.id), pixCode: String(json.data.pix_code ?? "") };
}

export async function nitroGetTransaction(transactionId: string) {
  // Documentação: GET /transactions/{id}
  const res = await fetch(`${nitroBase()}/transactions/${encodeURIComponent(transactionId)}`, {
    method: "GET",
    headers: { Authorization: nitroAuth(), "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[nitro] status failed", res.status, text);
    throw new Error("Falha ao consultar o status");
  }
  const json = (await res.json()) as {
    success?: boolean;
    data?: { status?: string; customer?: Partial<Customer>; created_at?: string };
  };
  if (!json.success || !json.data) throw new Error("Resposta inválida do provedor");
  return {
    status: String(json.data.status ?? "pendente"),
    customer: json.data.customer ?? null,
    createdAt: json.data.created_at ?? null,
  };
}

export async function nitroGetStatus(transactionId: string) {
  return (await nitroGetTransaction(transactionId)).status;
}


function utmifyDate(d = new Date()) {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

/** Sends the order to UTMify (status waiting_payment or paid). */
export async function utmifyNotify(input: {
  orderId: string;
  status: "waiting_payment" | "paid";
  amount: number;
  productId?: string;
  productName: string;
  customer: Customer;
  tracking: Tracking;
  createdAt: string;
  ip?: string | null;
}) {
  const token = process.env["UTMIFY_API_TOKEN"];
  if (!token) {
    console.warn("[utmify] UTMIFY_API_TOKEN not configured, skipping");
    return { sent: false };
  }

  const cents = Math.round(input.amount * 100);
  const payload = {
    orderId: input.orderId,
    platform: "NitroPay",
    paymentMethod: "pix",
    status: input.status,
    createdAt: input.createdAt,
    approvedDate: input.status === "paid" ? utmifyDate() : null,
    refundedAt: null,
    customer: {
      name: input.customer.name,
      email: input.customer.email,
      phone: input.customer.phone,
      document: input.customer.document,
      country: "BR",
      ip: input.ip && input.ip.length > 0 ? input.ip : "0.0.0.0",
    },
    products: [
      {
        id: input.productId ?? "upsell-1",
        name: input.productName,
        planId: null,
        planName: null,
        quantity: 1,
        priceInCents: cents,
      },
    ],
    trackingParameters: {
      src: input.tracking.src,
      sck: input.tracking.sck,
      utm_source: input.tracking.utm_source,
      utm_medium: input.tracking.utm_medium,
      utm_campaign: input.tracking.utm_campaign,
      utm_content: input.tracking.utm_content,
      utm_term: input.tracking.utm_term,
    },
    commission: {
      totalPriceInCents: cents,
      gatewayFeeInCents: 0,
      userCommissionInCents: cents,
    },
    isTest: false,
  };

  const res = await fetch("https://api.utmify.com.br/api-credentials/orders", {
    method: "POST",
    headers: { "x-api-token": token, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[utmify] notify failed", input.status, res.status, text);
    return { sent: false };
  }
  console.log("[utmify] notify ok", input.status, input.orderId);
  return { sent: true };
}

/** Best-effort client IP from the incoming request headers. */
export async function getClientIp(): Promise<string | null> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const h = req.headers;
    const raw =
      h.get("cf-connecting-ip") ??
      h.get("x-real-ip") ??
      h.get("x-forwarded-for") ??
      null;
    if (!raw) return null;
    return raw.split(",")[0]?.trim() ?? null;
  } catch {
    return null;
  }
}
