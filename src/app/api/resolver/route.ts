import { criarRotaRpc } from "@/lib/criar-rota-rpc";

export const POST = criarRotaRpc("marcar_resolvido_alerta", "resolvido", 10, 10);
