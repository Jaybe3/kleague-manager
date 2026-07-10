import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          isCommissioner: user.isCommissioner,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign-in: anchor the real identity. `realUserId` is written
      // here and never again except via a verified impersonation update.
      if (user && user.id) {
        token.id = user.id;
        token.isCommissioner = user.isCommissioner ?? false;
        token.name = user.name ?? null;
        token.email = user.email ?? null;
        token.realUserId = user.id;
        token.realName = user.name ?? null;
        return token;
      }

      // Back-compat for tokens minted before impersonation existed.
      if (!token.realUserId) {
        token.realUserId = token.id;
        token.realName = (token.name as string | null) ?? null;
      }

      // Impersonation is driven from the client via `useSession().update()`.
      // The client is NEVER trusted: we re-verify from the DB that the REAL
      // user (token.realUserId) is a commissioner before swapping identity.
      if (trigger === "update" && session) {
        const action = (session as { action?: string }).action;

        if (action === "impersonate") {
          const targetUserId = (session as { targetUserId?: string }).targetUserId;
          const realUser = await db.user.findUnique({
            where: { id: token.realUserId },
          });
          if (realUser?.isCommissioner && targetUserId) {
            const target = await db.user.findUnique({
              where: { id: targetUserId },
            });
            // Cannot impersonate yourself; target must exist.
            if (target && target.id !== token.realUserId) {
              token.id = target.id;
              token.isCommissioner = target.isCommissioner;
              token.name = target.displayName;
              token.email = target.email;
            }
          }
        } else if (action === "stopImpersonating") {
          // Always allowed: returning to your own identity is never a
          // privilege escalation. Re-read to reflect current status.
          const realUser = await db.user.findUnique({
            where: { id: token.realUserId },
          });
          if (realUser) {
            token.id = realUser.id;
            token.isCommissioner = realUser.isCommissioner;
            token.name = realUser.displayName;
            token.email = realUser.email;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.isCommissioner = token.isCommissioner;
        session.user.name = (token.name as string | null) ?? null;
        session.user.email = (token.email as string | null) ?? session.user.email;
      }
      session.impersonating = token.realUserId != null && token.id !== token.realUserId;
      if (session.impersonating) {
        session.realUser = { id: token.realUserId, name: token.realName ?? null };
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
