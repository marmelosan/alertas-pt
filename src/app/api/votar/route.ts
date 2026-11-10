import { criarRotaRpc } from "@/lib/criar-rota-rpc";

export const POST = criarRotaRpc("votar_alerta", "voto", 10, 10);
