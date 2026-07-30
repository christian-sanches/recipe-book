import { describe, it, expect } from "@jest/globals";
import { translate, type TranslationDict, type Lang } from "~/i18n";
import en from "~/i18n/en.json";
import ptBr from "~/i18n/pt-BR.json";

// ── translate() ───────────────────────────────────────────────
describe("translate()", () => {
  const dict: TranslationDict = { Hello: "Olá", "Recipe book": "Livro de Receitas" };

  it("returns translation for existing key", () => {
    expect(translate("Hello", dict)).toBe("Olá");
    expect(translate("Recipe book", dict)).toBe("Livro de Receitas");
  });

  it("falls back to the key when translation is missing", () => {
    expect(translate("NonExistentKey", dict)).toBe("NonExistentKey");
  });

  it("returns the key itself when dict is empty", () => {
    expect(translate("Hello", {})).toBe("Hello");
  });

  it("handles empty string key", () => {
    expect(translate("", dict)).toBe("");
  });

  it("preserves case sensitivity", () => {
    expect(translate("hello", dict)).toBe("hello"); // key is "Hello" not "hello"
  });
});

// ── English dictionary ────────────────────────────────────────
describe("en.json dictionary", () => {
  it("contains all expected keys", () => {
    expect(en["Hello"]).toBe("Hello");
    expect(en["Recipe book"]).toBe("Recipe Book");
    expect(en["New Recipe"]).toBe("New Recipe");
    expect(en["Sign in"]).toBe("Sign in");
    expect(en["Dark mode"]).toBe("Dark mode");
  });
});

// ── Portuguese dictionary ─────────────────────────────────────
describe("pt-BR.json dictionary", () => {
  it("contains Portuguese translations", () => {
    expect(ptBr["Hello"]).toBe("Olá");
    expect(ptBr["Recipe book"]).toBe("Livro de Receitas");
    expect(ptBr["New Recipe"]).toBe("Nova Receita");
    expect(ptBr["Sign in"]).toBe("Entrar");
    expect(ptBr["Dark mode"]).toBe("Modo escuro");
  });

  it("contains all keys present in English", () => {
    const enKeys = Object.keys(en);
    const ptKeys = Object.keys(ptBr);
    const missing = enKeys.filter((k) => !ptKeys.includes(k));
    expect(missing).toEqual([]);
  });
});
