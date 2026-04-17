import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { db } from "~/server/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      firstName: string;
      lastName: string;
    } & DefaultSession["user"];
  }

  // Extend the built-in User so profile() can pass firstName/lastName
  // through to the adapter's createUser call.
  interface User {
    firstName?: string | null;
    lastName?: string | null;
  }
}

export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
      // profile() runs before the adapter creates the user, so these fields
      // are included in the very first DB insert.
      profile(profile: {
        sub: string;
        name?: string;
        email?: string;
        picture?: string;
        given_name?: string;
        family_name?: string;
      }) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          firstName: profile.given_name ?? null,
          lastName: profile.family_name ?? null,
        };
      },
    }),
  ],
  adapter: PrismaAdapter(db),
  callbacks: {
    session: async ({ session, user }) => {
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
      });

      if (dbUser) {
        session.user.id = dbUser.id;
        session.user.firstName = dbUser.firstName ?? "";
        session.user.lastName = dbUser.lastName ?? "";
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
