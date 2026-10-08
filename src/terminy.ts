/* NOVÉ: orientační kalendář daňových termínů pro OSVČ a firmy v ČR.
   Termín, který padne na víkend nebo svátek, se posouvá na nejbližší pracovní den. */

export type Cat = "mzdy" | "dph" | "dane";
export const CATS: { id: Cat | "all"; label: string }[] = [
  { id: "all", label: "Vše" },
  { id: "dane", label: "Daně" },
  { id: "dph", label: "DPH" },
  { id: "mzdy", label: "Mzdy" },
];

export type Deadline = { date: Date; title: string; cat: Cat };

const MONTHLY: { day: number; title: string; cat: Cat }[] = [
  { day: 20, title: "Odvod pojistného a zálohy na daň ze mzdy", cat: "mzdy" },
  { day: 20, title: "Platba paušální daně", cat: "dane" },
  { day: 25, title: "Přiznání k DPH a kontrolní hlášení", cat: "dph" },
];

const YEARLY: { m: number; d: number; title: string; cat: Cat }[] = [
  { m: 1, d: 10, title: "Oznámení o vstupu do paušálního režimu", cat: "dane" },
  { m: 1, d: 31, title: "Přiznání k dani z nemovitých věcí", cat: "dane" },
  { m: 2, d: 15, title: "Prohlášení poplatníka a žádost o roční zúčtování", cat: "mzdy" },
  { m: 3, d: 15, title: "Čtvrtletní záloha na daň z příjmů", cat: "dane" },
  { m: 4, d: 1, title: "Daňové přiznání v listinné podobě", cat: "dane" },
  { m: 5, d: 1, title: "Daňové přiznání podané elektronicky", cat: "dane" },
  { m: 5, d: 31, title: "Splatnost daně z nemovitých věcí", cat: "dane" },
  { m: 6, d: 15, title: "Záloha na daň z příjmů", cat: "dane" },
  { m: 7, d: 1, title: "Daňové přiznání zpracované daňovým poradcem", cat: "dane" },
  { m: 9, d: 15, title: "Čtvrtletní záloha na daň z příjmů", cat: "dane" },
  { m: 12, d: 15, title: "Záloha na daň z příjmů", cat: "dane" },
];

function easter(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}

const key = (d: Date) => `${d.getMonth() + 1}-${d.getDate()}`;
const FIXED = new Set(["1-1", "5-1", "5-8", "7-5", "7-6", "9-28", "10-28", "11-17", "12-24", "12-25", "12-26"]);

function isWorkday(d: Date) {
  const wd = d.getDay();
  if (wd === 0 || wd === 6 || FIXED.has(key(d))) return false;
  const e = easter(d.getFullYear());
  const friday = new Date(e.getFullYear(), e.getMonth(), e.getDate() - 2);
  const monday = new Date(e.getFullYear(), e.getMonth(), e.getDate() + 1);
  return key(d) !== key(friday) && key(d) !== key(monday);
}

function shift(d: Date) {
  const x = new Date(d);
  while (!isWorkday(x)) x.setDate(x.getDate() + 1);
  return x;
}

export function upcoming(from: Date, days = 120): Deadline[] {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  const out: Deadline[] = [];
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    for (let m = 0; m < 12; m++) {
      for (const t of MONTHLY) out.push({ date: shift(new Date(y, m, t.day)), title: t.title, cat: t.cat });
    }
    for (const t of YEARLY) out.push({ date: shift(new Date(y, t.m - 1, t.d)), title: t.title, cat: t.cat });
  }
  return out.filter((d) => d.date >= start && d.date <= end).sort((a, b) => +a.date - +b.date);
}

export const daysBetween = (a: Date, b: Date) =>
  Math.round((+new Date(b.getFullYear(), b.getMonth(), b.getDate()) - +new Date(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5);

const MONTHS = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];
const WD = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
export const fmtDate = (d: Date) => `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
export const fmtWeekday = (d: Date) => WD[d.getDay()];
export const inDays = (n: number) => (n === 0 ? "dnes" : n === 1 ? "zítra" : n < 5 ? `za ${n} dny` : `za ${n} dní`);
