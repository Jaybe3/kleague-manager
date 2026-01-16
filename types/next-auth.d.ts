import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isCommissioner: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    isCommissioner: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    isCommissioner: boolean;
  }
}
