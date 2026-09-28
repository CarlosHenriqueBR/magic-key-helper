import { createFileRoute } from "@tanstack/react-router";

import { UpsellPage } from "@/components/UpsellPage";
import { UPSELLS } from "@/lib/upsell-config";

export const Route = createFileRoute("/up3")({
  head: () => ({
    meta: [
      { title: "Desenrola Brasil — Aumente seu Score para 890 pontos" },
      {
        name: "description",
        content:
          "Solicite o aumento imediato do seu Score para 890 pontos e amplie suas chances de crédito. Pague via Pix.",
      },
      { property: "og:title", content: "Aumente seu Score para 890 pontos" },
      {
        property: "og:description",
        content: "Atualização cadastral que eleva seu Score para 890 pontos após a confirmação do Pix.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Up3,
});

function Up3() {
  return (
    <UpsellPage
      config={UPSELLS.up3}
      copy={{
        headline: (
          <>
            <b>ÚLTIMA ETAPA</b> — Solicite o aumento do seu <b>Score para 890 pontos</b>
          </>
        ),
        startLabel: "Consultar meu Score",
        steps: [
          "Consultando seu Score nos bureaus de crédito...",
          "Recalculando pontuação após a quitação...",
          "Score ainda baixo: atualização cadastral pendente!",
          "Aumento para 890 pontos disponível!",
        ],
        offer: (
          <>
            Seu Score está desatualizado nos bureaus de crédito. Com a <b>atualização cadastral prioritária</b>, sua
            pontuação é elevada para <b>890 pontos</b> em até 24 horas.
          </>
        ),
        payLabel: "Aumentar meu Score para 890",
        footerNote:
          "Score alto significa mais crédito aprovado, limites maiores e melhores taxas nas instituições parceiras.",
      }}
    />
  );
}
