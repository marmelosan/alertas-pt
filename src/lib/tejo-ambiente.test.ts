import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { extrairAvisosTejoAmbiente, horaTejoAmbienteParaTimestamptz } from "./tejo-ambiente";

// Fixture gerada a partir de HTML real colado pelo utilizador em
// 2026-11-08 (ver conversa) — não é uma aproximação do que a página
// "deve" ter, é o markup verdadeiro que a Tejo Ambiente devolveu, incluindo
// a tabela "suja" exportada do Word que aparece nos avisos de avaria.
const html = readFileSync(join(__dirname, "__fixtures__/tejo-ambiente-exemplo.html"), "utf-8");

describe("extrairAvisosTejoAmbiente", () => {
  const avisos = extrairAvisosTejoAmbiente(html);

  it("encontra os 11 avisos (5 não programadas + 6 programadas)", () => {
    expect(avisos).toHaveLength(11);
  });

  it("todos têm corte de abastecimento = Sim, como no exemplo real", () => {
    expect(avisos.every((a) => a.corteDeAbastecimento)).toBe(true);
  });

  it("extrai corretamente o primeiro aviso (tabela 'suja' do Word, não programada)", () => {
    const a = avisos[0];
    expect(a.municipio).toBe("Ferreira do Zêzere");
    expect(a.localidades).toBe("Matos");
    expect(a.descricao).toBe("Avaria da rede de abastecimento");
    expect(a.programada).toBe(false);
    expect(a.horaInicio).toBe("08.11.2026 – 14:15h");
    expect(a.horaFim).toBe("08.11.2026 – 16:00h");
    expect(a.ot).toBe("OT_96294");
  });

  it("normaliza 'OT_ 95202' (com espaço) para 'OT_95202'", () => {
    const sardoal = avisos.find((a) => a.localidades === "São Simão");
    expect(sardoal?.ot).toBe("OT_95202");
  });

  it("marca como programada=true as entradas da secção PROGRAMADAS", () => {
    const programadas = avisos.filter((a) => a.programada);
    expect(programadas).toHaveLength(6);
    expect(programadas.every((a) => a.municipio === "Sardoal" || a.municipio === "Ferreira do Zêzere")).toBe(true);
  });

  it("lê localidades com múltiplos lugares separados por vírgula", () => {
    const codes = avisos.find((a) => a.ot === "OT_95198");
    expect(codes?.localidades).toBe("Codes, Portela da Selada e Brescovo");
  });

  it("decodifica entidades HTML nos títulos (ex.: Z&ecirc;zere -> Zêzere)", () => {
    const ramal = avisos.find((a) => a.ot === "OT_96218");
    expect(ramal?.titulo).toContain("Zêzere");
  });

  it("todos os OT ficam sem espaços a mais", () => {
    for (const a of avisos) {
      expect(a.ot).not.toMatch(/\s/);
    }
  });
});

describe("horaTejoAmbienteParaTimestamptz", () => {
  it("converte 'DD.MM.YYYY – HH:MMh' para UTC (novembro é WET, UTC+0 em Portugal)", () => {
    expect(horaTejoAmbienteParaTimestamptz("08.11.2026 – 14:15h")).toBe("2026-11-08T14:15:00.000Z");
  });

  it("devolve null para valor em falta", () => {
    expect(horaTejoAmbienteParaTimestamptz(null)).toBeNull();
    expect(horaTejoAmbienteParaTimestamptz("")).toBeNull();
  });

  it("devolve null para formato não reconhecido em vez de rebentar", () => {
    expect(horaTejoAmbienteParaTimestamptz("qualquer coisa")).toBeNull();
  });
});
