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
}

export type NovoAlerta = Pick<
  Alerta,
  "tipo_servico" | "concelho" | "latitude" | "longitude"
> &
  Partial<Pick<Alerta, "freguesia" | "descricao">>;
