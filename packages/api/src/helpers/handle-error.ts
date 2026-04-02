import { ORPCError } from "@orpc/server";

interface ErrorWithCode {
  readonly code: string;
  readonly message: string;
}

export function handleError(error: unknown): never {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    const { code, message } = error as ErrorWithCode;
    throw new ORPCError(code, { message });
  }

  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: error instanceof Error ? error.message : "Une erreur est survenue.",
  });
}
