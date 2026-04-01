import { UserRole } from "@hitachi2/db";

export function toReservationDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export function getCurrentReservationDateString(now = new Date()) {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getReservationLimit(role: UserRole) {
  return role === UserRole.MANAGER ? 30 : 5;
}
