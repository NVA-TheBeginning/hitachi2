import type { UserRole } from "@hitachi2/db";
import type { Session, User } from "better-auth/types";

export interface TestUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role?: UserRole;
}

export interface TestContext {
  context: {
    session: {
      session: Session;
      user: Omit<User, "createdAt" | "updatedAt"> & {
        createdAt: Date;
        updatedAt: Date;
        role: string | null;
      };
    };
    jobQueue: { send: (name: string, data: object) => Promise<string | null> };
  };
}

export function createContext(user: TestUser): TestContext {
  return {
    context: {
      session: {
        session: {
          id: `session-${user.id}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: user.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
          token: `token-${user.id}`,
          ipAddress: "127.0.0.1",
          userAgent: "bun-test",
        },
        user: {
          id: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.name,
          image: null,
          role: user.role ?? null,
        },
      },
      jobQueue: { send: async () => null },
    },
  };
}
