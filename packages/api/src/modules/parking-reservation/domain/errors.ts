export class SeedDataMissingError extends Error {
  readonly code = "PRECONDITION_FAILED";

  constructor() {
    super("Les donnees de reservation sont absentes. Lance bun db:seed manuellement avant de reserver.");
    this.name = "SeedDataMissingError";
  }
}

export class NoCarLinkedToUserError extends Error {
  readonly code = "PRECONDITION_FAILED";

  constructor() {
    super("Aucune voiture n'est liee a votre compte. Ajoutez-en une dans Mon compte avant de reserver.");
    this.name = "NoCarLinkedToUserError";
  }
}

export class ReservationCarNotFoundError extends Error {
  readonly code = "NOT_FOUND";

  constructor(carId: string) {
    super(`La voiture ${carId} est introuvable ou n'est pas liee a votre compte.`);
    this.name = "ReservationCarNotFoundError";
  }
}

export class NoParkingSpotAvailableError extends Error {
  readonly code = "CONFLICT";

  constructor(date: string) {
    super(`Aucune place libre n'est disponible pour le ${date}.`);
    this.name = "NoParkingSpotAvailableError";
  }
}

export class ReservationNotFoundError extends Error {
  readonly code = "NOT_FOUND";

  constructor(reservationId: string) {
    super(`La reservation ${reservationId} est introuvable.`);
    this.name = "ReservationNotFoundError";
  }
}

export class ReservationForbiddenError extends Error {
  readonly code = "FORBIDDEN";

  constructor(reservationId: string) {
    super(`Vous n'etes pas autorise a acceder a la reservation ${reservationId}.`);
    this.name = "ReservationForbiddenError";
  }
}

export class ReservationAlreadyCheckedInError extends Error {
  readonly code = "CONFLICT";

  constructor(reservationId: string) {
    super(`La reservation ${reservationId} n'est plus en statut RESERVED.`);
    this.name = "ReservationAlreadyCheckedInError";
  }
}

export class ReservationDeletionForbiddenError extends Error {
  readonly code = "CONFLICT";

  constructor(reservationId: string) {
    super(`La reservation ${reservationId} ne peut pas etre supprimee.`);
    this.name = "ReservationDeletionForbiddenError";
  }
}

export class ReservationLimitExceededError extends Error {
  readonly code = "FORBIDDEN";

  constructor(currentCount: number, maxAllowed: number) {
    super(`Vous avez deja reserve ${currentCount} jour(s). Maximum autorise: ${maxAllowed} jour(s).`);
    this.name = "ReservationLimitExceededError";
  }
}

export class ParkingSpotNotFoundError extends Error {
  readonly code = "NOT_FOUND";

  constructor(spotId: string) {
    super(`La place de parking ${spotId} est introuvable.`);
    this.name = "ParkingSpotNotFoundError";
  }
}

export class NoReservationForSpotTodayError extends Error {
  readonly code = "NOT_FOUND";

  constructor(spotId: string) {
    super(`Aucune reservation active pour la place ${spotId} aujourd'hui.`);
    this.name = "NoReservationForSpotTodayError";
  }
}
