import { prismaAdapter } from "@better-auth/prisma-adapter";
import prisma, { UserRole } from "@hitachi2/db";
import { corsOrigins, env } from "@hitachi2/env/server";
import { betterAuth } from "better-auth/minimal";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: corsOrigins,
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      secure: env.NODE_ENV === "production",
      httpOnly: true,
    },
    crossSubDomainCookies: {
      enabled: env.NODE_ENV === "production",
      domain: env.API_DOMAIN,
    },
    useSecureCookies: env.NODE_ENV === "production",
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: UserRole.EMPLOYEE,
        input: false,
      },
    },
  },
  plugins: [],
});
