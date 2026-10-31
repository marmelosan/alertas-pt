import { describe, expect, it } from "vitest";
import { calcularEstado, estaAtivo, estaPorConfirmar, estaProgramado, estaProgramadoEmBreve, estaVisivelAgora } from "./estado-alerta";
import type { Alerta } from "@/types/alerta";

// contador_votos=2 por omissão nos testes que não são sobre confirmações —
// já passou o limiar de "por confirmar", para isolar o que cada teste
// quer mesmo verificar (janela das 24h, datas oficiais, etc.).
function alertaBase(overrides: Partial<Alerta> = {}): Alerta {
  return {
    id: "a1",
    tipo_servico: "luz",
    concelho: "Sintra",
    freguesia: null,
    latitude: 38.8,
    longitude: -9.3,
    descricao: null,
    contador_votos: 2,
    contador_denuncias: 0,
    status: "ativo",
    origem: "comunidade",
    external_id: null,
    client_id: null,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    data_inicio: null,
    data_fim: null,
    ...overrides,
  };
}

describe("calcularEstado — reportes da comunidade", () => {
  it("está ativo mesmo sem confirmações novas, dentro das 24h", () => {
    const agora = new Date("2026-01-02T12:00:00Z");
    const alerta = alertaBase({ criado_em: "2026-01-01T12:00:00Z" }); // exatamente 24h antes
    expect(calcularEstado(alerta, agora)).toBe("ativo");
  });

  it("está ativo a 23h59 da criação (limite inferior)", () => {
    const agora = new Date("2026-01-02T11:59:00Z");
    const alerta = alertaBase({ criado_em: "2026-01-01T12:00:00Z" });
    expect(estaAtivo(alerta, agora)).toBe(true);
  });

  it("deixa de estar ativo passado 1 minuto da janela de 24h", () => {
    const agora = new Date("2026-01-02T12:01:00Z");
    const alerta = alertaBase({ criado_em: "2026-01-01T12:00:00Z" });
    expect(estaAtivo(alerta, agora)).toBe(false);
    expect(calcularEstado(alerta, agora)).toBe("inativo");
  });

  it("status=resolvido é sempre inativo, mesmo dentro das 24h", () => {
    const agora = new Date("2026-01-01T13:00:00Z");
    const alerta = alertaBase({ criado_em: "2026-01-01T12:00:00Z", status: "resolvido" });
    expect(estaAtivo(alerta, agora)).toBe(false);
  });
});

describe("calcularEstado — confirmações independentes (Bloco 6)", () => {
  it("um único reporte (1 voto) fica 'por_confirmar', não 'ativo'", () => {
    const alerta = alertaBase({ contador_votos: 1 });
    expect(calcularEstado(alerta)).toBe("por_confirmar");
    expect(estaAtivo(alerta)).toBe(false);
    expect(estaPorConfirmar(alerta)).toBe(true);
  });

  it("com 2 votos (1 confirmação a mais) passa a 'ativo'", () => {
    const alerta = alertaBase({ contador_votos: 2 });
    expect(calcularEstado(alerta)).toBe("ativo");
  });

  it("'por_confirmar' continua visível no mapa (estaVisivelAgora), ao contrário de 'inativo'", () => {
    const porConfirmar = alertaBase({ contador_votos: 1 });
    const expirado = alertaBase({ contador_votos: 5, criado_em: new Date(Date.now() - 25 * 3600_000).toISOString() });
    expect(estaVisivelAgora(porConfirmar)).toBe(true);
    expect(estaVisivelAgora(expirado)).toBe(false);
  });

  it("expira ao fim de 24h mesmo sem nunca ter sido confirmado", () => {
    const agora = new Date("2026-01-02T12:01:00Z");
    const alerta = alertaBase({ contador_votos: 1, criado_em: "2026-01-01T12:00:00Z" });
    expect(calcularEstado(alerta, agora)).toBe("inativo");
  });
});

describe("calcularEstado — cortes oficiais (E-Redes)", () => {
  it("corte com início no futuro está 'programado', não ativo", () => {
    const agora = new Date("2026-01-01T00:00:00Z");
    const alerta = alertaBase({
      origem: "oficial",
      criado_em: "2026-01-01T00:00:00Z",
      data_inicio: "2026-01-05T07:00:00Z",
      data_fim: "2026-01-05T09:00:00Z",
    });
    expect(calcularEstado(alerta, agora)).toBe("programado");
    expect(estaAtivo(alerta, agora)).toBe(false);
    expect(estaProgramado(alerta, agora)).toBe(true);
  });

  it("corte dentro da janela [início, fim] está ativo", () => {
    const agora = new Date("2026-01-05T08:00:00Z");
    const alerta = alertaBase({
      origem: "oficial",
      data_inicio: "2026-01-05T07:00:00Z",
      data_fim: "2026-01-05T09:00:00Z",
    });
    expect(calcularEstado(alerta, agora)).toBe("ativo");
  });

  it("corte depois do fim previsto está inativo, mesmo com status='ativo' na BD", () => {
    const agora = new Date("2026-01-05T10:00:00Z");
    const alerta = alertaBase({
      origem: "oficial",
      status: "ativo",
      data_inicio: "2026-01-05T07:00:00Z",
      data_fim: "2026-01-05T09:00:00Z",
    });
    expect(calcularEstado(alerta, agora)).toBe("inativo");
  });

  it("oficial sem data_inicio (dados em falta) nunca é tratado como ativo", () => {
    const alerta = alertaBase({ origem: "oficial", data_inicio: null, data_fim: null });
    expect(estaAtivo(alerta)).toBe(false);
    expect(calcularEstado(alerta)).toBe("inativo");
  });

  it("estaProgramadoEmBreve só conta os próximos 7 dias por omissão", () => {
    const agora = new Date("2026-01-01T00:00:00Z");
    const dentroDoPrazo = alertaBase({
      origem: "oficial",
      data_inicio: "2026-01-06T00:00:00Z",
      data_fim: "2026-01-06T02:00:00Z",
    });
    const foraDoPrazo = alertaBase({
      origem: "oficial",
      data_inicio: "2026-01-20T00:00:00Z",
      data_fim: "2026-01-20T02:00:00Z",
    });
    expect(estaProgramadoEmBreve(dentroDoPrazo, agora)).toBe(true);
    expect(estaProgramadoEmBreve(foraDoPrazo, agora)).toBe(false);
  });
});
