import "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null };
  }
  interface User {
    /** account session version at sign-in (see users.session_version) */
    sv?: number;
  }
}
declare module "next-auth/jwt" {
  interface JWT { uid?: string; sv?: number }
}
