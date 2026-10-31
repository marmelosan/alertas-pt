import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
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
          <>
            {/* Consent Mode v2: tudo negado por omissão, antes do GTM carregar. */}
            <Script id="consent-defaults" strategy="beforeInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('consent', 'default', {
                  ad_storage: 'denied',
                  analytics_storage: 'denied',
                  ad_user_data: 'denied',
                  ad_personalization: 'denied'
                });
              `}
            </Script>
            <Script id="gtm-snippet" strategy="beforeInteractive">
              {`
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${GTM_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <GtmNoscript />
        <RegistarServiceWorker />
        <SiteNav />
        {children}
        <SiteFooter />
        <ConsentBanner />
      </body>
    </html>
  );
}
