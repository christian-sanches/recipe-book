import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { I18nProvider, useTranslation } from "~/i18n";

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

// For hook tests we need jsdom (setup in jest.config.ts)
describe("useTranslation hook", () => {
  beforeEach(() => {
    localStorage.clear();
    // Default to English
    Object.defineProperty(navigator, "language", {
      value: "en-US",
      configurable: true,
    });
  });

  it("defaults to English", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    expect(result.current.lang).toBe("en");
  });

  it("t() returns English translations by default", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    expect(result.current.t("Hello")).toBe("Hello");
    expect(result.current.t("Recipe book")).toBe("Recipe Book");
  });

  it("t() falls back to key for missing translations", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    expect(result.current.t("NonExistent")).toBe("NonExistent");
  });

  it("setLang switches to Portuguese", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    act(() => {
      result.current.setLang("pt-BR");
    });

    expect(result.current.lang).toBe("pt-BR");
    expect(result.current.t("Hello")).toBe("Olá");
    expect(result.current.t("Recipe book")).toBe("Livro de Receitas");
  });

  it("setLang switches back to English", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    act(() => {
      result.current.setLang("pt-BR");
    });
    expect(result.current.lang).toBe("pt-BR");

    act(() => {
      result.current.setLang("en");
    });
    expect(result.current.lang).toBe("en");
    expect(result.current.t("Hello")).toBe("Hello");
  });

  it("persists language preference to localStorage", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    act(() => {
      result.current.setLang("pt-BR");
    });

    expect(localStorage.getItem("recipe-book-lang")).toBe("pt-BR");
  });
});
