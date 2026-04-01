export const UserRole = {
  MANAGER: "MANAGER",
  EMPLOYEE: "EMPLOYEE",
  SECRETARY: "SECRETARY",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ReservationStatus = {
  RESERVED: "RESERVED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
  COMPLETED: "COMPLETED",
} as const;

export type ReservationStatus = (typeof ReservationStatus)[keyof typeof ReservationStatus];
