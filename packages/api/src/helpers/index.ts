export function toReservationDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export function getCurrentReservationDateString(now = new Date()) {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}
