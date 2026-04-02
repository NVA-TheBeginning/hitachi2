import { UserRole } from "@hitachi2/db";
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
      user: User & {
        role: UserRole;
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
          role: user.role ?? UserRole.EMPLOYEE,
        },
      },
      jobQueue: { send: async () => null },
    },
  };
}
