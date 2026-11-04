import { describe, expect, it } from "vitest";
import { formatarDuracao } from "./tempo";

describe("formatarDuracao", () => {
  it("mostra só minutos quando dura menos de 1h", () => {
    expect(formatarDuracao("2026-01-01T10:00:00Z", "2026-01-01T10:35:00Z")).toBe("35 min");
  });

  it("mostra só horas quando é um número exato", () => {
    expect(formatarDuracao("2026-01-01T10:00:00Z", "2026-01-01T12:00:00Z")).toBe("2h");
  });

  it("mostra horas e minutos quando mistura os dois", () => {
    expect(formatarDuracao("2026-01-01T10:00:00Z", "2026-01-01T12:10:00Z")).toBe("2h 10min");
  });

  it("nunca devolve negativo, mesmo com datas trocadas por engano", () => {
    expect(formatarDuracao("2026-01-01T12:00:00Z", "2026-01-01T10:00:00Z")).toBe("0 min");
  });
});
