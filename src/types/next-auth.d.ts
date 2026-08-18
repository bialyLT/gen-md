import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      plan: "FREE" | "PRO";
      role: "USER" | "ADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    plan?: "FREE" | "PRO";
    role?: "USER" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    plan?: "FREE" | "PRO";
    role?: "USER" | "ADMIN";
  }
}