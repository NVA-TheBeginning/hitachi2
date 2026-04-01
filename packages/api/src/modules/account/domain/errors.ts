export class AccountNotFoundError extends Error {
  constructor(userId: string) {
    super(`Le compte ${userId} est introuvable.`);
    this.name = "AccountNotFoundError";
  }
}

export class CarNotFoundError extends Error {
  constructor(carId: string) {
    super(`La voiture ${carId} est introuvable.`);
    this.name = "CarNotFoundError";
  }
}

export class CarLicensePlateAlreadyUsedError extends Error {
  constructor(licensePlate: string) {
    super(`La plaque ${licensePlate} est deja utilisee.`);
    this.name = "CarLicensePlateAlreadyUsedError";
  }
}

export class CarDeletionForbiddenError extends Error {
  constructor(carId: string) {
    super(`La voiture ${carId} ne peut pas etre supprimee car elle est liee a des reservations.`);
    this.name = "CarDeletionForbiddenError";
  }
}
