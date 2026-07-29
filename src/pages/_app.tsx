import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { type AppType } from "next/app";
import { ConfigProvider, App as AntApp } from "antd";
import { Geist } from "next/font/google";

import { api } from "~/utils/api";

import "~/styles/globals.css";

const geist = Geist({
  subsets: ["latin"],
});

const theme = {
  token: {
    colorPrimary: "#1677ff",
    borderRadius: 8,
  },
};

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <SessionProvider session={session}>
      <ConfigProvider theme={theme}>
        <AntApp>
          <div className={geist.className}>
            <Component {...pageProps} />
          </div>
        </AntApp>
      </ConfigProvider>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
