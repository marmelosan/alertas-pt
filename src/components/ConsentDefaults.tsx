/**
 * O snippet do GTM e o Consent Mode v2 vivem diretamente em app/layout.tsx
 * (o Next só permite `next/script` com strategy="beforeInteractive" no
 * root layout, não num componente importado). Aqui fica só o <noscript>,
 * que não tem essa restrição.
 */
export function GtmNoscript() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  if (!gtmId) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="gtm"
      />
    </noscript>
  );
}
