import { UserRole } from "@hitachi2/db";

/**
 * Hour (UTC) at or after which unchecked reservations for today are released as no-shows.
 * A user who booked but never checked in by this time loses their spot.
 */
export const NO_SHOW_RELEASE_HOUR = 11;

/**
 * Maximum number of active reservations allowed per role.
 * Managers get a higher quota to accommodate team scheduling needs.
 */
export const MAX_RESERVATIONS_BY_ROLE: Record<UserRole, number> = {
  [UserRole.MANAGER]: 30,
  [UserRole.EMPLOYEE]: 5,
  [UserRole.SECRETARY]: 5,
};
