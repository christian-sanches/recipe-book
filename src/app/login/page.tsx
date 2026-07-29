import { env } from "~/env";
import LoginClient from "./login-client";

export default function LoginPage() {
  return <LoginClient devMode={env.DEV_MODE} />;
}
