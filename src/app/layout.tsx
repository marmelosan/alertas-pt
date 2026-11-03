import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { GoogleTagManager } from "@next/third-parties/google";
import "./globals.css";
import { GtmNoscript } from "@/components/ConsentDefaults";
import { ConsentBanner } from "@/components/ConsentBanner";
import { RegistarServiceWorker } from "@/components/RegistarServiceWorker";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foiabaixo.vercel.app";

const TITULO_SITE = "Foi Abaixo — falhas de água e luz em Portugal";
const DESCRICAO_SITE =
  "Foi abaixo aí também? Mapa colaborativo de falhas de água e eletricidade em Portugal, com dados oficiais da E-Redes e reportes da comunidade.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITULO_SITE,
  description: DESCRICAO_SITE,
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Foi Abaixo",
  },
  openGraph: {
    title: TITULO_SITE,
    description: DESCRICAO_SITE,
    url: SITE_URL,
    siteName: "Foi Abaixo",
    locale: "pt_PT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO_SITE,
    description: DESCRICAO_SITE,
  },
};

export const viewport: Viewport = {
  themeColor: "#1c1917",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-PT"
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        {GTM_ID && (
          // Consent Mode v2: tudo negado por omissão, ANTES do GTM carregar.
          // beforeInteractive garante que isto corre antes de qualquer script
          // afterInteractive (incluindo o <GoogleTagManager> no body).
          <Script id="consent-defaults" strategy="beforeInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              // Se quem volta já tinha aceitado antes (guardado no
              // localStorage pelo ConsentBanner), o valor por omissão já
              // nasce "granted" — sem isto, a primeira visualização de
              // página de um visitante recorrente ia sempre com
              // analytics_storage negado até o React montar e corrigir,
              // perdendo esse primeiro evento. Anúncios continuam sempre
              // negados — nunca os usamos.
              var jaAceitouAntes = false;
              try { jaAceitouAntes = localStorage.getItem('alertas-pt:cookie-consent') === 'granted'; } catch (e) {}
              gtag('consent', 'default', {
                ad_storage: 'denied',
                analytics_storage: jaAceitouAntes ? 'granted' : 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied'
              });
            `}
          </Script>
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <GtmNoscript />
        {GTM_ID && <GoogleTagManager gtmId={GTM_ID} />}
        <RegistarServiceWorker />
        <SiteNav />
        {children}
        <SiteFooter />
        <ConsentBanner />
      </body>
    </html>
  );
}
