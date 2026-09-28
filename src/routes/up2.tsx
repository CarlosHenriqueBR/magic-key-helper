import { createFileRoute } from "@tanstack/react-router";

import { UpsellPage } from "@/components/UpsellPage";
import { UPSELLS } from "@/lib/upsell-config";

export const Route = createFileRoute("/up2")({
  head: () => ({
    meta: [
      { title: "Desenrola Brasil — Cartão aprovado com R$ 5.000 de limite" },
      {
        name: "description",
        content:
          "Seu CPF foi pré-aprovado para um cartão com R$ 5.000 de limite. Pague a taxa de liberação via Pix e receba o cartão.",
      },
      { property: "og:title", content: "Cartão pré-aprovado com R$ 5.000 de limite" },
      {
        property: "og:description",
        content: "Libere agora seu cartão com R$ 5.000 de limite pagando a taxa de liberação via Pix.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Up2,
});

function Up2() {
  return (
    <UpsellPage
      config={UPSELLS.up2}
      copy={{
        headline: (
          <>
            <b>BENEFÍCIO LIBERADO</b> — Seu CPF foi <b>pré-aprovado</b> para um cartão com{" "}
            <b>R$ 5.000 de limite</b>
          </>
        ),
        startLabel: "Verificar meu cartão",
        steps: [
          "Consultando instituições financeiras parceiras...",
          "Calculando limite disponível para o seu CPF...",
          "Cartão pré-aprovado, porém bloqueado por falta de liberação!",
          "Cartão aprovado com R$ 5.000 de limite!",
        ],
        offer: (
          <>
            Seu cartão com <b>R$ 5.000 de limite</b> já está emitido, mas permanece bloqueado. Para concluir a{" "}
            <b>liberação do limite</b> e receber o cartão, é necessário pagar a taxa de liberação.
          </>
        ),
        payLabel: "Liberar meu cartão de R$ 5.000",
        footerNote:
          "Cartão sem anuidade no primeiro ano, aceito em todo o Brasil e com limite liberado imediatamente após a confirmação.",
      }}
    />
  );
}
