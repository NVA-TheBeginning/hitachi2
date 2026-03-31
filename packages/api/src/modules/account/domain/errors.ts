export class AccountNotFoundError extends Error {
  constructor() {
    super("Le compte utilisateur est introuvable.");
    this.name = "AccountNotFoundError";
  }
}

export class CarNotFoundError extends Error {
  constructor(carId: string) {
    super(`La voiture ${carId} est introuvable.`);
    this.name = "CarNotFoundError";
  }
}

export class DuplicateLicensePlateError extends Error {
  constructor(licensePlate: string) {
    super(`L'immatriculation ${licensePlate} est deja utilisee.`);
    this.name = "DuplicateLicensePlateError";
  }
}

export class CarDeletionForbiddenError extends Error {
  constructor(carId: string) {
    super(
      `La voiture ${carId} ne peut pas etre supprimee car elle est liee a des reservations.`,
    );
    this.name = "CarDeletionForbiddenError";
  }
}
