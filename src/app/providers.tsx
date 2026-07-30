"use client";

import { SessionProvider } from "next-auth/react";
import { App as AntApp } from "antd";
import { ThemeProvider } from "~/contexts/ThemeContext";
import { I18nProvider } from "~/i18n";
import { TRPCProvider } from "~/trpc/react";
import "~/styles/globals.css";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <ThemeProvider>
          <AntApp>
            <TRPCProvider>{children}</TRPCProvider>
          </AntApp>
        </ThemeProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
