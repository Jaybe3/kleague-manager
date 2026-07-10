import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isCommissioner: boolean;
    } & DefaultSession["user"];
    /** True when a commissioner is impersonating another user ("View As"). */
    impersonating?: boolean;
    /** The real (commissioner) identity behind an impersonated session. */
    realUser?: {
      id: string;
      name: string | null;
    };
  }

  interface User extends DefaultUser {
    isCommissioner: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    isCommissioner: boolean;
    /**
     * The real user this session belongs to. Set once at login and never
     * settable by the client. `id` is the *effective* user (equals
     * realUserId unless a commissioner is impersonating someone).
     */
    realUserId: string;
    realName: string | null;
  }
}
