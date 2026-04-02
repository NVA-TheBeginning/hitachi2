export class AccountNotFoundError extends Error {
  readonly code = "NOT_FOUND";

  constructor(userId: string) {
    super(`Le compte ${userId} est introuvable.`);
    this.name = "AccountNotFoundError";
  }
}

export class CarNotFoundError extends Error {
  readonly code = "NOT_FOUND";

  constructor(carId: string) {
    super(`La voiture ${carId} est introuvable.`);
    this.name = "CarNotFoundError";
  }
}

export class CarLicensePlateAlreadyUsedError extends Error {
  readonly code = "CONFLICT";

  constructor(licensePlate: string) {
    super(`La plaque ${licensePlate} est deja utilisee.`);
    this.name = "CarLicensePlateAlreadyUsedError";
  }
}

export class CarDeletionForbiddenError extends Error {
  readonly code = "CONFLICT";

  constructor(carId: string) {
    super(`La voiture ${carId} ne peut pas etre supprimee car elle est liee a des reservations.`);
    this.name = "CarDeletionForbiddenError";
  }
}
