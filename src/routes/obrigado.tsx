import { createFileRoute } from "@tanstack/react-router";

import govLogoSrc from "@/assets/iconegov.png";
const govLogo = { url: govLogoSrc };
import footerLogoSrc from "@/assets/iconefooter.png";
const footerLogo = { url: footerLogoSrc };

export const Route = createFileRoute("/obrigado")({
  head: () => ({
    meta: [
      { title: "Desenrola Brasil — Solicitação concluída com sucesso" },
      {
        name: "description",
        content:
          "Sua solicitação foi concluída. Acompanhe a liberação do acordo, do cartão e da atualização do Score.",
      },
      { property: "og:title", content: "Solicitação concluída — Desenrola Brasil" },
      {
        property: "og:description",
        content: "Pagamentos confirmados. Seu acordo, cartão e Score estão em processamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Obrigado,
});

function Obrigado() {
  return (
    <div className="flex min-h-screen flex-col bg-gov-bg font-sans">
      <header className="flex items-center bg-card px-6 py-3 shadow-sm">
        <img src={govLogo.url} alt="Gov.br" className="h-8 w-auto" />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[560px] rounded-xl bg-card p-8 text-center shadow-lg">
          <p className="mb-3 text-4xl">✅</p>
          <h1 className="mb-3 text-lg font-bold text-foreground">Solicitação concluída com sucesso!</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Todos os pagamentos foram confirmados. Seu acordo com <b>99% de desconto</b>, a liberação do{" "}
            <b>cartão de R$ 5.000</b> e o <b>aumento de Score para 890 pontos</b> estão em processamento e serão
            atualizados em até 24 horas.
          </p>
          <div className="mt-6 rounded-r-md border-l-4 border-gov-blue bg-gov-light-blue p-4 text-left">
            <p className="text-sm leading-relaxed text-foreground">
              Você receberá as confirmações no e-mail cadastrado. Não é necessário realizar nenhum outro pagamento.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t-4 border-gov-yellow bg-gov-dark px-4 py-6 text-center text-gov-on-blue">
        <img src={footerLogo.url} alt="Gov.br" className="mx-auto mb-3 h-6 opacity-90" />
        <p className="text-[11px] opacity-70">Sistema de Renegociação — Todos os direitos reservados</p>
      </footer>
    </div>
  );
}
