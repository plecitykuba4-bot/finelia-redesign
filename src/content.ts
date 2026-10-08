/* Obsah převzatý z finelia.cz (úvod, /services, /contact). Nové texty jsou označené NOVÉ. */

export const CONTACT = {
  phone: "775 492 566",
  phoneHref: "tel:+420775492566",
  email: "info@finelia.cz",
};

export const NAV = [
  { href: "#momenty", label: "Pro koho" },
  { href: "#sluzby", label: "Služby" },
  { href: "#spoluprace", label: "Spolupráce" },
  { href: "#cenik", label: "Ceník" },
  { href: "#terminy", label: "Termíny" },
];

export const HERO = {
  title: "Chráníme Vaše podnikání.",
  lead: "Postaráme se o Vaše daně, účetnictví, mzdy i další administrativu tak, abyste se mohli naplno věnovat růstu svého podnikání.",
  words: ["Jasně", "Přehledně", "Spolehlivě"],
  cta: "Rezervujte si online schůzku",
};

export const SERVICES = [
  {
    title: "Daňové přiznání",
    sub: "DPFO, DPPO, DZNEM",
    items: ["Fyzické i právnické osoby", "Daň z nemovitých věcí", "Registrace k DPH"],
  },
  {
    title: "Účetnictví",
    sub: "Kompletní vedení účetnictví",
    items: ["Účetnictví i daňová evidence", "Evidence majetku", "Účetní závěrka"],
  },
  {
    title: "Mzdy a personalistika",
    sub: "Výplaty, benefity, odvody",
    items: ["Výpočet mezd", "Přihlášení zaměstnanců k institucím", "Optimalizace mzdové agendy"],
  },
  {
    title: "Poradenství",
    sub: "Optimalizace a plánování",
    items: ["Daňové plánování", "Finanční analýza", "Daňové kontroly"],
  },
];

export const MOMENTS = [
  {
    tag: "Začátek Vašeho podnikání",
    title: "Nastavíme základy, aby Vás chyby nestály peníze.",
    text: "Pomůžeme Vám nastavit administrativní základy tak, abyste se vyhnuli chybám, které mohou být v budoucnu zbytečně drahé.",
    points: [
      "Vhodný způsob zdanění: paušální daň, paušální výdaje, nebo skutečné náklady",
      "Registrace na finančním úřadě, OSSZ a zdravotní pojišťovně",
      "Základní daňová predikce pro první roky podnikání",
    ],
  },
  {
    tag: "Založení Vaší společnosti",
    title: "Firma, ve které je jasno od prvního dne.",
    text: "Pomůžeme se založením společnosti a nastavením vztahů mezi společníky a firmou.",
    points: ["Založení společnosti", "Vztahy mezi společníky a firmou", "Nastavení účetnictví od začátku"],
  },
  {
    tag: "Rozvoj společnosti",
    title: "Rostete. My hlídáme daně, cash flow i úřady.",
    text: "Pomůžeme Vám optimalizovat daně a procesy.",
    points: [
      "Daňové plánování při rozšiřování činnosti",
      "Nastavení cash flow",
      "Příprava na daňové kontroly a komunikace s finančním úřadem",
    ],
  },
];

export const STEPS = [
  { title: "Úvodní konzultace", text: "Společně projdeme Vaši situaci a potřeby." },
  { title: "Předání dokumentů", text: "Domluvíme rozsah služeb a způsob předávání dokladů." },
  { title: "Zpracování a kontrola", text: "Zpracujeme účetnictví a připravíme potřebné podklady." },
  { title: "Podání a potvrzení", text: "Zajistíme podání na úřady a informujeme Vás o výsledku." },
];

/* Ceník z /services. Přiřazení ke skupinám klientů je NOVÉ (návrh, schválit s klientem). */
export type Who = "fo" | "po" | "start";
export const WHO: { id: Who | "all"; label: string }[] = [
  { id: "all", label: "Vše" },
  { id: "fo", label: "Fyzické osoby" },
  { id: "po", label: "Právnické osoby" },
  { id: "start", label: "Začínající podnikatelé" },
];

export const PRICES: { title: string; items: string[]; price: string; unit?: string; who: Who[] }[] = [
  {
    title: "Daňové přiznání fyzických osob",
    items: ["Zaměstnání", "Podnikání", "Úroky", "Podíly na zisku", "Prodej nemovitostí", "Prodej cenných papírů"],
    price: "1 000",
    who: ["fo", "start"],
  },
  {
    title: "Daňové přiznání právnických osob",
    items: ["Základní kontrola účetnictví", "Kontrola daňových odpisů", "Daňové opravné položky", "Transfer pricing"],
    price: "5 000",
    who: ["po"],
  },
  {
    title: "Daňové přiznání daně z nemovitosti",
    items: ["Nákupy nemovitostí", "Dědění nemovitostí", "Dary nemovitostí", "Prodej nemovitostí"],
    price: "750",
    who: ["fo", "po"],
  },
  {
    title: "Dobrovolná registrace k DPH",
    items: ["Podání žádosti", "Komunikace s finančním úřadem"],
    price: "1 500",
    who: ["fo", "po", "start"],
  },
  {
    title: "Zpracování účetnictví",
    items: ["Účtování a vystavování dokladů", "Evidence majetku", "Sestavení účetní závěrky", "Správa pohledávek a závazků"],
    price: "2 500",
    who: ["po"],
  },
  {
    title: "Zpracování daňové evidence",
    items: ["Vedení peněžního deníku a dalších evidencí", "Výpočet daňových odpisů", "Správa pohledávek a závazků"],
    price: "1 500",
    who: ["fo", "start"],
  },
  {
    title: "Zpracování mezd",
    items: ["Výpočet mezd", "Přihlášení zaměstnanců k institucím", "Návrh daňové optimalizace mzdové agendy"],
    price: "200",
    unit: "za zaměstnance",
    who: ["fo", "po"],
  },
  {
    title: "Vše ostatní",
    items: ["Finanční analýza", "Daňové kontroly", "Likvidace společnosti"],
    price: "1 500",
    who: ["fo", "po", "start"],
  },
];

export const VALUES = [
  { title: "Individuální přístup", text: "Ke každému klientovi přistupujeme individuálně a hledáme společná řešení podle konkrétní situace a potřeb." },
  { title: "Diskrétnost a důvěra", text: "Veškeré údaje a citlivá data zpracováváme diskrétně a v souladu s platnou legislativou." },
  { title: "Odpověď do 48 hodin", text: "Na všechny Vaše dotazy reagujeme zpravidla do 48 hodin v pracovních dnech." },
  { title: "Transparentní ceny", text: "Ceny nastavujeme jasně a férově. Všechny ceny jsou transparentní a bez skrytých poplatků." },
];

/* NOVÉ: odpovědi skládané z faktů na webu. */
export const FAQ = [
  {
    q: "Kolik stojí zpracování daňového přiznání?",
    a: "Přiznání fyzické osoby zpracujeme od 1 000 Kč, právnické osoby od 5 000 Kč a přiznání k dani z nemovitosti od 750 Kč. Přesnou cenu řekneme předem, bez skrytých poplatků.",
  },
  {
    q: "Musím za Vámi chodit osobně?",
    a: "Nemusíte. Úvodní schůzku zvládneme online a domluvíme se, jak nám budete předávat doklady.",
  },
  {
    q: "Pomůžete mi, když s podnikáním teprve začínám?",
    a: "Ano. Vybereme vhodný způsob zdanění, zařídíme registraci na finančním úřadě, OSSZ a zdravotní pojišťovně a sestavíme daňovou predikci pro první roky.",
  },
  {
    q: "Pomůžete i při daňové kontrole?",
    a: "Ano. Připravíme Vás na kontrolu, projdeme podklady a komunikaci s finančním úřadem vezmeme na sebe.",
  },
  {
    q: "Jak rychle odpovídáte?",
    a: "Na dotazy reagujeme zpravidla do 48 hodin v pracovních dnech.",
  },
];
