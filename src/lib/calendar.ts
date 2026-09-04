export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysInMonth(year: number, month: number): number {
  // month: 1-12
  if (month < 1 || month > 12) throw new Error(`Invalid month: ${month}`);
  return new Date(year, month, 0).getDate();
}

export function getMonthDates(year: number, month: number): string[] {
  const days = getDaysInMonth(year, month);
  const dates: string[] = [];
  for (let d = 1; d <= days; d++) {
    const mm = String(month).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    dates.push(`${year}-${mm}-${dd}`);
  }
  return dates;
}

export function toMessLocalDate(date: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date); // YYYY-MM-DD
}

export function parseYearMonth(ym: string): { year: number; month: number } {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) throw new Error(`Invalid year-month: ${ym}`);
  return { year: y, month: m };
}
