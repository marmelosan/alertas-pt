import { describe, expect, it } from "vitest";
import { ehConcelhoValido } from "./concelhos-validos";

describe("ehConcelhoValido", () => {
  it("aceita concelhos reais", () => {
    expect(ehConcelhoValido("Lisboa")).toBe(true);
    expect(ehConcelhoValido("Vila Nova de Gaia")).toBe(true);
    expect(ehConcelhoValido("Sardoal")).toBe(true);
  });

  it("aceita pequenas variações de acentuação/maiúsculas", () => {
    expect(ehConcelhoValido("lisboa")).toBe(true);
    expect(ehConcelhoValido("LISBOA")).toBe(true);
    expect(ehConcelhoValido("vila nova de gaia")).toBe(true);
  });

  it("rejeita os concelhos fantasma que já apareceram em produção", () => {
    expect(ehConcelhoValido("Desconhecido")).toBe(false);
    expect(ehConcelhoValido("Oceano Atlântico")).toBe(false);
  });

  it("rejeita strings vazias ou disparatadas", () => {
    expect(ehConcelhoValido("")).toBe(false);
    expect(ehConcelhoValido("xyz123")).toBe(false);
  });
});
