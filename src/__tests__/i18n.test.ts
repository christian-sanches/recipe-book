import { describe, it, expect } from "@jest/globals";
import { translate, type TranslationDict, type Lang } from "~/i18n";
import en from "~/i18n/en.json";
import ptBr from "~/i18n/pt-BR.json";

// ── Test helpers ─────────────────────────────────────────────
function collectKeys(dict: TranslationDict): string[] {
  return Object.keys(dict).sort();
}

// ── Dictionary structure ────────────────────────────────────
describe("translation dictionaries", () => {
  const enKeys = collectKeys(en);
  const ptKeys = collectKeys(ptBr);

  it("should have the same keys in en and pt-BR", () => {
    expect(enKeys).toEqual(ptKeys);
  });

  it("should not have empty values in en", () => {
    const empty = Object.entries(en).filter(([, v]) => !v);
    expect(empty).toHaveLength(0);
  });

  it("should not have empty values in pt-BR", () => {
    const empty = Object.entries(ptBr).filter(([, v]) => !v);
    expect(empty).toHaveLength(0);
  });

  it("should have more than 50 translation keys", () => {
    expect(enKeys.length).toBeGreaterThan(50);
  });
});

// ── translate() function ────────────────────────────────────
describe("translate()", () => {
  it("should return the value for an existing key", () => {
    expect(translate("Hello", en)).toBe("Hello");
    expect(translate("Hello", ptBr)).toBe("Olá");
  });

  it("should return the key as fallback when key is missing", () => {
    const result = translate("NonExistentKey", en);
    expect(result).toBe("NonExistentKey");
  });

  it("should handle keys with punctuation", () => {
    expect(translate("Sign in", en)).toBe("Sign in");
    expect(translate("Sign in", ptBr)).toBe("Entrar");
  });

  it("should handle keys with special characters", () => {
    expect(translate("Recipe book", en)).toBe("Recipe Book");
    expect(translate("Recipe book", ptBr)).toBe("Livro de Receitas");
  });

  it("should handle numeric and special keys", () => {
    expect(translate("to taste", en)).toBe("to taste");
    expect(translate("to taste", ptBr)).toBe("a gosto");
  });

  it("should translate min unit suffix", () => {
    expect(translate(" min", en)).toBe(" min");
    expect(translate(" min", ptBr)).toBe(" min");
  });
});

// ── Every key has a translation in pt-BR ────────────────────
describe("pt-BR completeness", () => {
  it("should have translations for every key", () => {
    for (const key of Object.keys(en)) {
      const ptVal = (ptBr as TranslationDict)[key];
      expect(ptVal).toBeDefined();
      expect(ptVal).not.toBe("");
      // pt-BR should differ from English for text-like keys
      if (
        key.length > 3 &&
        !key.startsWith(" ") &&
        !key.endsWith(":") &&
        key !== " min"
      ) {
        // At least check it's not identical to the key
        if (ptVal !== key) continue;
        // If identical to the key AND identical to English, it might be
        // a borrowed term — only warn if English itself differs from the key
        const enVal = (en as TranslationDict)[key];
        if (enVal === key) continue;
        expect(ptVal).not.toBe(key);
      }
    }
  });
});
