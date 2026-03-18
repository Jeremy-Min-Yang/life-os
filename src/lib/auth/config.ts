// ============================================================
// NextAuth Configuration
//
// Strategy: Google OAuth only (single-user MVP).
// The ALLOWED_EMAIL env var acts as the user gate — only one
// specific Google account can sign in. For SaaS: replace with
// database-backed user model.
//
// Session strategy: JWT (stateless, Vercel-compatible).
// ============================================================

import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    // Single-user gate: block any other Google account
    async signIn({ user }) {
      const allowedEmail = process.env.ALLOWED_EMAIL;
      if (allowedEmail && user.email !== allowedEmail) {
        return false; // Redirect to error page
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as typeof session.user & { id: string }).id = token.id as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  // Debug in development
  debug: process.env.NODE_ENV === "development",
};
