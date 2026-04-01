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
        session.user.firstName = dbUser.firstName;
        session.user.lastName = dbUser.lastName;
      }

      return session;
    },
    signIn: async ({ user, account, profile }) => {
      if (account?.provider === "google" && profile) {
        const googleProfile = profile as { given_name?: string; family_name?: string };

        const existingUser = await db.user.findUnique({
          where: { id: user.id },
        });

        if (!existingUser) {
          await db.user.create({
            data: {
              id: user.id,
              firstName: googleProfile.given_name ?? "Unknown",
              lastName: googleProfile.family_name ?? "User",
              email: user.email,
              image: user.image,
            },
          });
        }
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
