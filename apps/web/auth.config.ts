import type { NextAuthConfig } from "next-auth";

/** Edge-safe part of the Auth.js config (used by middleware; no DB / bcrypt imports here). */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      if (path === "/app/practice") return true; // guests may take the test (D-001: guest trial)
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
