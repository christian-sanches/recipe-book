"use client";

import { SessionProvider } from "next-auth/react";
import { ConfigProvider, App as AntApp } from "antd";
import { TRPCProvider } from "~/trpc/react";
import "~/styles/globals.css";

const theme = {
  token: {
    colorPrimary: "#1677ff",
    borderRadius: 8,
  },
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConfigProvider theme={theme}>
        <AntApp>
          <TRPCProvider>{children}</TRPCProvider>
        </AntApp>
      </ConfigProvider>
    </SessionProvider>
  );
}
