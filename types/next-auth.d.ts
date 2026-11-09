import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    sessionVersion?: number;
    mustChangePassword?: boolean;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role?: string;
      mustChangePassword?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    sessionVersion?: number;
    mustChangePassword?: boolean;
  }
}
