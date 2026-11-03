This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Consent Mode v2 — como verificar

O site usa o Google Tag Manager (`@next/third-parties/google`) com Consent
Mode v2: tudo negado por omissão (`src/app/layout.tsx`, script
`consent-defaults`), até quem visita aceitar no banner de cookies
(`src/components/ConsentBanner.tsx`), que guarda a escolha em
`localStorage` sob a chave `alertas-pt:cookie-consent` e grava o novo
estado com `gtag('consent', 'update', ...)`.

Para confirmar que o consentimento está mesmo a ser atualizado (e não só
guardado no `dataLayer`), usa o parâmetro `gcs` nos pedidos `collect` que
o browser manda para a Google Analytics:

1. `F12` → separador **Network/Rede** → filtra por `collect`.
2. Antes de aceitar os cookies, abre um desses pedidos e confirma
   `gcs=G100` (`analytics_storage` negado).
3. Clica em "Aceitar", navega para outra página, e abre o pedido novo:
   deve mudar para `gcs=G101` (`analytics_storage` concedido, anúncios
   continuam negados — nunca os usamos).

Se o `gcs` não mudar depois de aceitar, o consentimento não está a
chegar ao GTM — o sintoma mais provável seria o `Tempo real` do GA4
continuar vazio mesmo com pedidos `collect` reais a devolver 204 (a
Google aceita o pedido de qualquer forma, com ou sem consentimento, só
não o conta como utilizador real sem ele).

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
