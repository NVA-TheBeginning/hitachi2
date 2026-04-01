import { UserRole } from "@hitachi2/db";

export function getMaxReservationsForRole(role: UserRole): number {
  switch (role) {
    case UserRole.MANAGER:
      return 30;
    default:
      return 5;
  }
}
