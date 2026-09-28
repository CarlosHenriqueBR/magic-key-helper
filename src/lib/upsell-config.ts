/** Configurações dos upsells */
export type UpsellId = "up1" | "icms" | "up2" | "up3";

export type UpsellConfig = {
  id: UpsellId;
  amount: number;
  productName: string;
  /** Para onde o usuário vai após o pagamento confirmado */
  nextUrl: string;
};

export const UPSELLS: Record<UpsellId, UpsellConfig> = {
  up1: {
    id: "up1",
    amount: 29.9,
    productName: "Taxa de Processamento Digital",
    nextUrl: "/icms",
  },
  icms: {
    id: "icms",
    amount: 19.9,
    productName: "Taxa de ICMS/ISS",
    nextUrl: "/up2",
  },
  up2: {
    id: "up2",
    amount: 67.89,
    productName: "Liberação de Cartão com Limite de R$ 5.000",
    nextUrl: "/up3",
  },
  up3: {
    id: "up3",
    amount: 13.9,
    productName: "Aumento de Score para 890 pontos",
    nextUrl: "/obrigado",
  },
};

/** Compatibilidade */
export const UPSELL_AMOUNT = UPSELLS.up1.amount;
export const UPSELL_PRODUCT_NAME = UPSELLS.up1.productName;
export const NEXT_UPSELL_URL = UPSELLS.up1.nextUrl;
