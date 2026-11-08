import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findFirst({
          where: {
            email: { equals: (credentials.email as string).trim(), mode: "insensitive" },
          },
        });

        if (!user || !user.isActive) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    // Re-reads the user on every request, so a role change or deactivation
    // takes effect immediately instead of when the token expires.
    // Returning null ends the session.
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        return token;
      }

      if (!token.sub) return null;

      const current = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { role: true, isActive: true, name: true, email: true },
      });

      if (!current?.isActive) return null;

      token.role = current.role;
      token.name = current.name;
      token.email = current.email;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
