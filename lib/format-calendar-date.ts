const calendarDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
});

export function formatCalendarDate(value: string) {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Date.UTC(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      ))
    : new Date(value);
  return calendarDateFormatter.format(date);
}
