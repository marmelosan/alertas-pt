import { describe, expect, it } from "vitest";
import { ehConcelhoValido, estaDentroDoConcelho } from "./concelhos-validos";

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

describe("estaDentroDoConcelho", () => {
  it("aceita um ponto real dentro de Braga", () => {
    expect(estaDentroDoConcelho("Braga", 41.5503, -8.4201)).toBe(true);
  });

  it("rejeita o caso real que apareceu em produção: 'Braga' com coordenadas perto de Lugo, Espanha", () => {
    expect(estaDentroDoConcelho("Braga", 43.0, -7.55)).toBe(false);
  });

  it("devolve null para um concelho que nem sequer é válido", () => {
    expect(estaDentroDoConcelho("Desconhecido", 41.5503, -8.4201)).toBeNull();
  });

  it("tem margem suficiente para não rejeitar à toa perto de uma fronteira entre concelhos", () => {
    // Braga/Vila Verde, bem perto da fronteira entre os dois concelhos
    expect(estaDentroDoConcelho("Braga", 41.62, -8.3)).toBe(true);
  });
});
