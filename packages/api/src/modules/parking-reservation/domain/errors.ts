export class SeedDataMissingError extends Error {
  constructor() {
    super(
      "Les donnees de reservation sont absentes. Lance bun db:seed manuellement avant de reserver.",
    );
    this.name = "SeedDataMissingError";
  }
}

export class NoParkingSpotAvailableError extends Error {
  constructor(date: string) {
    super(`Aucune place libre n'est disponible pour le ${date}.`);
    this.name = "NoParkingSpotAvailableError";
  }
}

export class ReservationNotFoundError extends Error {
  constructor(reservationId: string) {
    super(`La reservation ${reservationId} est introuvable.`);
    this.name = "ReservationNotFoundError";
  }
}

export class ReservationForbiddenError extends Error {
  constructor(reservationId: string) {
    super(
      `Vous n'etes pas autorise a acceder a la reservation ${reservationId}.`,
    );
    this.name = "ReservationForbiddenError";
  }
}

export class ReservationAlreadyCheckedInError extends Error {
  constructor(reservationId: string) {
    super(`La reservation ${reservationId} n'est plus en statut RESERVED.`);
    this.name = "ReservationAlreadyCheckedInError";
  }
}
