import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import { getDb } from "./lib/server/db";
import { rateLimit } from "./lib/server/ratelimit";
import { getSessionVersion, getUserIdByEmail, upsertGoogleUser, verifyCredentials } from "./lib/server/users";
import { loginSchema } from "./lib/server/validation";

export const googleEnabled = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
        // 10 attempts / 15 min per email+IP, and 50 / 15 min per IP
        if (!rateLimit(`login:${ip}:${parsed.data.email}`, 10, 15 * 60_000).ok || !rateLimit(`login-ip:${ip}`, 50, 15 * 60_000).ok) return null;
        return verifyCredentials(getDb(), parsed.data.email, parsed.data.password);
      },
    }),
    ...(googleEnabled ? [Google] : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        if (!profile?.email || profile.email_verified !== true) return false; // only verified Google emails
        await upsertGoogleUser(getDb(), { sub: String(account.providerAccountId), email: profile.email, name: profile.name ?? "" });
      }
      return true;
    },
    async jwt({ token, user, account }) {
      const uid = token.uid as string | undefined;
      if (account?.provider === "google" && token.email) {
        const id = await getUserIdByEmail(getDb(), token.email);
        token.uid = id;
        token.sv = id ? (await getSessionVersion(getDb(), id)) ?? undefined : undefined;
      } else if (user?.id) {
        token.uid = user.id;
        token.sv = user.sv;
      } else if (uid) {
        // Every later read: the account must still exist and the session version must match. A password reset bumps the
        // version (and deleting the account removes the row), which signs out every older session everywhere.
        const current = await getSessionVersion(getDb(), uid);
        if (current === null || current !== token.sv) { token.uid = undefined; token.sv = undefined; }
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
});
