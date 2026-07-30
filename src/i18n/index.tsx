"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import en from "./en.json";
import ptBr from "./pt-BR.json";

// ── Types ────────────────────────────────────────────────────
export type Lang = "en" | "pt-BR";

export type TranslationDict = Record<string, string>;

const translations: Record<Lang, TranslationDict> = { en, "pt-BR": ptBr };

// ── Pure function (easy to test) ──────────────────────────────
export function translate(key: string, dict: TranslationDict): string {
  return dict[key] ?? key;
}

// ── Context ───────────────────────────────────────────────────
interface I18nContextValue {
  lang: Lang;
  t: (key: string) => string;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  t: (key: string) => key,
  setLang: () => {},
});

export function useTranslation() {
  return useContext(I18nContext);
}

// ── Helpers ───────────────────────────────────────────────────
function getInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("recipe-book-lang") as Lang | null;
  if (stored === "pt-BR" || stored === "en") return stored;
  if (navigator.language.startsWith("pt")) return "pt-BR";
  return "en";
}

// ── Provider ──────────────────────────────────────────────────
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);
  const dict = translations[lang];

  useEffect(() => {
    localStorage.setItem("recipe-book-lang", lang);
    document.documentElement.lang = lang === "pt-BR" ? "pt" : "en";
  }, [lang]);

  const setLang = useCallback(
    (newLang: Lang) => setLangState(newLang),
    [],
  );

  const t = useCallback(
    (key: string): string => translate(key, dict),
    [dict],
  );

  return (
    <I18nContext.Provider value={{ lang, t, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}
