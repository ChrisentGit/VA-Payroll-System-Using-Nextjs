import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyLogin } from "@/lib/login";
import { clientIp } from "@/lib/throttle";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: (credentials, request) =>
        verifyLogin(credentials?.email, credentials?.password, clientIp(request.headers)),
    }),
  ],
  callbacks: {
    // Re-reads the user on every request, so a role change or deactivation
    // takes effect immediately instead of when the token expires.
    // Returning null ends the session.
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
        token.mustChangePassword = user.mustChangePassword;
        return token;
      }

      if (!token.sub) return null;

      const current = await prisma.user.findUnique({
        where: { id: token.sub },
        select: {
          role: true,
          isActive: true,
          name: true,
          email: true,
          sessionVersion: true,
          mustChangePassword: true,
        },
      });

      if (!current?.isActive || current.sessionVersion !== token.sessionVersion) return null;

      token.role = current.role;
      token.name = current.name;
      token.email = current.email;
      token.mustChangePassword = current.mustChangePassword;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
        session.user.mustChangePassword = token.mustChangePassword === true;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
