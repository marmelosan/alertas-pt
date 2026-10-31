import type { MetadataRoute } from "next";
import { listarConcelhosComAlertas } from "@/lib/alertas-server";
import { paraSlug } from "@/lib/slug";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foiabaixo.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "always", priority: 1 },
    { url: `${SITE_URL}/cortes`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/faq`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/guias`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/guias/falta-de-luz`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/guias/falta-de-agua`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/guias/kit-de-emergencia`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/privacidade`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/termos`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Só entram no sitemap concelhos que já tiveram alertas reais — evita
  // centenas de páginas "vazias" indexadas sem conteúdo (thin content).
  // Um concelho novo continua acessível diretamente, só não aparece aqui
  // até ter o primeiro alerta (dynamicParams trata disso na página).
  try {
    const concelhos = await listarConcelhosComAlertas();
    const paginas: MetadataRoute.Sitemap = concelhos.map((c) => ({
      url: `${SITE_URL}/cortes/${paraSlug(c)}`,
      changeFrequency: "hourly",
      priority: 0.8,
    }));
    return [...base, ...paginas];
  } catch (erro) {
    console.error("[sitemap] não consegui listar concelhos, devolvo só a home:", erro);
    return base;
  }
}
