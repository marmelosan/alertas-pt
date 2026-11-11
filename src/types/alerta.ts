export type TipoServico = "agua" | "luz";
export type StatusAlerta = "ativo" | "resolvido";
export type OrigemAlerta = "comunidade" | "oficial";

export interface Alerta {
  id: string;
  tipo_servico: TipoServico;
  concelho: string;
  freguesia: string | null;
  latitude: number;
  longitude: number;
  descricao: string | null;
  contador_votos: number;
  contador_denuncias: number;
  status: StatusAlerta;
  origem: OrigemAlerta;
  external_id: string | null;
  client_id: string | null;
  criado_em: string;
  atualizado_em: string;
  /** Só para origem="oficial" — início/fim do corte programado (E-Redes). Nulo para comunidade. */
  data_inicio: string | null;
  data_fim: string | null;
  /** Bloco 14: votos em "Já voltou?" (só comunidade) e quando passou a resolvido de verdade. */
  contador_resolvido_votos: number;
  resolvido_em: string | null;
  /** Só para origem="oficial" — código postal (7 dígitos) de origem, quando a E-Redes o fornece. */
  codigo_postal: string | null;
}

export type NovoAlerta = Pick<
  Alerta,
  "tipo_servico" | "concelho" | "latitude" | "longitude"
> &
  Partial<Pick<Alerta, "freguesia" | "descricao">>;
