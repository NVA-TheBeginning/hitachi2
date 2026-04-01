import type { IAccountRepository } from "@api/types";
import { AccountNotFoundError } from "../domain/errors";

export async function getMyAccount(repository: IAccountRepository, input: { userId: string }) {
  const account = await repository.getMyAccount(input.userId);

  if (!account) {
    throw new AccountNotFoundError(input.userId);
  }

  return account;
}
