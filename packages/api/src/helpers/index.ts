export function toReservationDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export function getCurrentReservationDateString(now = new Date()) {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getReservationDayRange(date: Date) {
  const start = new Date(date);
  const end = new Date(date);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

export function formatDateLong(date: string | Date, locale = "fr-FR") {
  return new Date(date).toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function normalizeDate(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10);
}
