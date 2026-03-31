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
