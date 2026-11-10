import { criarRotaRpc } from "@/lib/criar-rota-rpc";

export const POST = criarRotaRpc("denunciar_alerta", "denuncia", 10, 10);
