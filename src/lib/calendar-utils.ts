import type { Publication, PublicationStatus } from "./publications.functions";

export const STATUS_LABELS: Record<PublicationStatus, string> = {
  draft: "Драфт",
  scheduled: "Отложена",
  published: "Опубликована",
};

export const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Days of the visible month grid, starting on Monday. */
export function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** Понедельник (1) и пятница (5) — нерекомендуемые дни. */
export function isDiscouraged(date: Date): boolean {
  const day = date.getDay();
  return day === 1 || day === 5;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function normalizeAudience(value: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

/** ID публикаций, у которых в тот же день совпадает целевая аудитория. */
export function audienceConflicts(items: Publication[]): Set<string> {
  const conflicts = new Set<string>();
  const byDay = new Map<string, Publication[]>();
  for (const item of items) {
    const list = byDay.get(item.publish_date) ?? [];
    list.push(item);
    byDay.set(item.publish_date, list);
  }
  for (const list of byDay.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = normalizeAudience(list[i].audience);
        const b = normalizeAudience(list[j].audience);
        if (a === b) {
          conflicts.add(list[i].id);
          conflicts.add(list[j].id);
        }
      }
    }
  }
  return conflicts;
}

export async function exportToExcel(items: Publication[]) {
  const XLSX = await import("xlsx");
  const rows = items
    .slice()
    .sort((a, b) => a.publish_date.localeCompare(b.publish_date))
    .map((p) => ({
      Дата: p.publish_date,
      Название: p.title,
      "Краткое описание": p.description ?? "",
      Заказчик: p.customer,
      "Целевая аудитория": p.audience ?? "",
      Статус: STATUS_LABELS[p.status],
      Важная: p.important ? "да" : "",
    }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 12 },
    { wch: 36 },
    { wch: 46 },
    { wch: 22 },
    { wch: 26 },
    { wch: 14 },
    { wch: 10 },
  ];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Публикации");
  XLSX.writeFile(book, `kalendar-publikaciy-${toISODate(new Date())}.xlsx`);
}
