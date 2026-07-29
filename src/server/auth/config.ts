import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { db } from "~/server/db";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
  interface User {
    role?: string;
  }
}

const providers: NextAuthConfig["providers"] = [];

// Google OAuth — only when credentials are provided
if (process.env.AUTH_GOOGLE_ID) {
  providers.push(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    })
  );
}

// Dev mode — auto-login as admin, no Google required
if (process.env.DEV_MODE === "true") {
  providers.push(
    Credentials({
      name: "Dev Mode",
      credentials: {},
      async authorize() {
        let user = await db.user.findUnique({
          where: { email: "dev@fleflis.dev" },
        });
        if (!user) {
          user = await db.user.create({
            data: {
              email: "dev@fleflis.dev",
              name: "Dev Admin",
              role: "ADMIN",
            },
          });
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    })
  );
}

export const authConfig = {
  providers,
  adapter: PrismaAdapter(db),
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub as string,
        role: (token.role as string) ?? "VIEWER",
      },
    }),
    signIn: async ({ user }) => {
      if (!user.email) return false;
      // Dev mode always allows the dev user
      if (process.env.DEV_MODE === "true" && user.email === "dev@fleflis.dev") {
        return true;
      }
      const adminEmails = (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      if (adminEmails.length === 0) return true;
      return adminEmails.includes(user.email.toLowerCase());
    },
  },
} satisfies NextAuthConfig;
