import { env } from "~/env";
import LoginClient from "./login-client";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  return <LoginClient devMode={env.DEV_MODE} callbackUrl={callbackUrl ?? "/"} />;
}
