"use client";

import { SessionProvider } from "next-auth/react";
import { App as AntApp } from "antd";
import { ThemeProvider } from "~/contexts/ThemeContext";
import { TRPCProvider } from "~/trpc/react";
import "~/styles/globals.css";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <AntApp>
          <TRPCProvider>{children}</TRPCProvider>
        </AntApp>
      </ThemeProvider>
    </SessionProvider>
  );
}
