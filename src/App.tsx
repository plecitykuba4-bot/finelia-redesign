import { Component, Fragment, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, List, Phone, Plus, X, EnvelopeSimple } from "@phosphor-icons/react";
import { CONTACT, FAQ, HERO, MOMENTS, NAV, PRICES, SERVICES, STEPS, WHO, type Who } from "./content";
import { CATS, daysBetween, fmtDate, fmtWeekday, inDays, upcoming, type Cat } from "./terminy";
import { gsap, ScrollTrigger, reducedMotion, revealOnView, scrollToHash, startSmoothScroll } from "./lib/motion";
import { scene, slots, trackPointer, type Slot } from "./scene/state";

const Scene = lazy(() => import("./scene/Scene"));

/* Když 3D selže (chunk, WebGL), stránka běží dál bez něj. */
class Safe extends Component<{ children: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  render() {
    return this.state.err ? null : this.props.children;
  }
}

function webglOk() {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

const go = (href: string, after?: () => void) => (e: React.MouseEvent) => {
  e.preventDefault();
  after?.();
  scrollToHash(href);
};

/* Prázdný prvek, do jehož obdélníku kreslí 3D. */
function Stage({ slot, className, children }: { slot: Slot; className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={className}
      ref={(el) => void (slot.ref.current = el)}
      onPointerEnter={() => (slot.hover = true)}
      onPointerLeave={() => (slot.hover = false)}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

/* Světlo pod kurzorem na kartách. */
const glow = (e: React.PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--gx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--gy", `${e.clientY - r.top}px`);
};

function Logo() {
  return (
    <span className="logo">
      <img src="/img/shield.png" alt="" width={233} height={287} />
      <img src="/img/wordmark.png" alt="Finelia" width={363} height={91} />
    </span>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const st = ScrollTrigger.create({ start: 20, end: "max", onToggle: (s) => setSolid(s.isActive) });
    return () => st.kill();
  }, []);
  return (
    <header className={`nav${solid ? " solid" : ""}${open ? " open" : ""}`}>
      <div className="nav-in">
        <a href="#top" className="nav-logo glass" onClick={go("#top")} aria-label="Finelia, úvod">
          <Logo />
        </a>
        <nav className="nav-links glass" aria-label="Hlavní">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={go(n.href)}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="nav-end">
          <a className="nav-phone glass" href={CONTACT.phoneHref}>
            <Phone size={16} weight="bold" /> {CONTACT.phone}
          </a>
          <a href="#kontakt" className="btn btn-teal btn-sm nav-cta" onClick={go("#kontakt")}>
            Konzultace
          </a>
          <button className="nav-burger glass" aria-label={open ? "Zavřít menu" : "Otevřít menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={22} /> : <List size={22} />}
          </button>
        </div>
      </div>
      <div className="nav-sheet glass" hidden={!open}>
        {NAV.map((n) => (
          <a key={n.href} href={n.href} onClick={go(n.href, () => setOpen(false))}>
            {n.label}
          </a>
        ))}
        <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
      </div>
    </header>
  );
}

function Hero() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current!;
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom top",
      onUpdate: (s) => (scene.heroOut = s.progress),
    });
    // 3D se začne připravovat až po úvodu, aby nic těžkého neběželo souběžně s animací textu
    const introDone = () => {
      performance.mark("intro-end");
      dispatchEvent(new Event("intro-done"));
    };
    if (reducedMotion()) {
      introDone();
      return () => st.kill();
    }
    const tl = gsap.timeline({ paused: true });
    tl.fromTo(".nav-in > *", { y: -14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out", stagger: 0.06 }, 0)
      .fromTo(el.querySelectorAll(".h1 .w > span"), { yPercent: 110, autoAlpha: 1 }, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.08 }, 0.1)
      .fromTo(el.querySelectorAll(".hero-copy [data-in]"), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out", stagger: 0.09 }, 0.5)
      .fromTo(el.querySelector(".hero-side"), { y: 28, scale: 0.98, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 1.2, ease: "power3.out" }, 0.35);
    tl.eventCallback("onComplete", introDone);
    // start s načteným písmem, ať nadpis během animace neposkočí (nejdéle 700 ms)
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 700))]).then(() => {
      if (tl.isActive() || tl.progress() > 0) return;
      performance.mark("intro-start");
      tl.play();
    });
    return () => {
      st.kill();
      tl.kill();
    };
  }, []);
  const words = HERO.title.split(" ");
  return (
    <section className="hero" id="top" ref={root}>
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <h1 className="h1">
            {words.map((w, i) => (
              <Fragment key={i}>
                <span className="w">
                  <span className={i === words.length - 1 ? "accent" : undefined}>{w}</span>
                </span>{" "}
              </Fragment>
            ))}
          </h1>
          <p className="lead" data-in>
            {HERO.lead}
          </p>
          <ul className="hero-words" data-in>
            {HERO.words.map((w) => (
              <li key={w}>
                <Check size={14} weight="bold" /> {w}
              </li>
            ))}
          </ul>
          <div className="hero-cta" data-in>
            <a href="#kontakt" className="btn btn-teal" onClick={go("#kontakt")}>
              {HERO.cta} <ArrowRight size={18} weight="bold" />
            </a>
            <a href="#cenik" className="btn btn-ghost" onClick={go("#cenik")}>
              Ceník služeb
            </a>
          </div>
        </div>
        <div className="hero-side" data-in>
          <Stage slot={slots.hero} className="stage stage-hero">
            <img className="fallback" src="/img/shield.png" alt="" />
          </Stage>
          <dl className="hero-facts">
            <div>
              <dt>48 h</dt>
              <dd>odpověď na dotaz</dd>
            </div>
            <div>
              <dt>od 1 000 Kč</dt>
              <dd>daňové přiznání</dd>
            </div>
            <div>
              <dt>online</dt>
              <dd>úvodní schůzka</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

function Moments() {
  return (
    <section className="sec moments" id="momenty">
      <div className="wrap">
        <div className="mo-head rv">
          <div>
            <h2 className="h2">Jsme u klíčových momentů Vašeho podnikání.</h2>
          </div>
          <p className="lead">
            Pomůžeme Vám efektivně nastavit daňovou, účetní a mzdovou agendu. Ať s podnikáním začínáte, rostete nebo měníte strukturu podnikání, postaráme se o řešení,
            která dávají smysl.
          </p>
        </div>
        <div className="mo-cards">
          {MOMENTS.map((m, i) => (
            <article
              key={m.tag}
              className="mo-card rv"
              style={{ transitionDelay: `${i * 90}ms` }}
              onPointerEnter={() => (slots.moments[i].hover = true)}
              onPointerLeave={() => (slots.moments[i].hover = false)}
            >
              <Stage slot={slots.moments[i]} className="stage stage-moment" />
              <h3 className="h4">{m.tag}</h3>
              <ul className="ticks ticks-sm">
                {m.points.map((p) => (
                  <li key={p}>
                    <Check size={14} weight="bold" />
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Services() {
  return (
    <section className="sec services" id="sluzby">
      <div className="wrap">
        <div className="sec-head rv">
          <h2 className="h2">Co zahrnují naše služby</h2>
          <p className="lead">
            Zajišťujeme kompletní daňový a účetní servis, od konzultací až po podání přiznání. Hlídáme termíny, kontrolujeme souvislosti a upozorňujeme na možná rizika
            a úspory.
          </p>
        </div>
        <div className="svc-grid">
          {SERVICES.map((s, i) => (
            <article
              key={s.title}
              className="svc rv"
              style={{ transitionDelay: `${i * 70}ms` }}
              onPointerEnter={() => (slots.icons[i].hover = true)}
              onPointerLeave={() => (slots.icons[i].hover = false)}
              onPointerMove={glow}
            >
              <Stage slot={slots.icons[i]} className="stage stage-icon" />
              <h3 className="h4">{s.title}</h3>
              <p className="svc-sub">{s.sub}</p>
              <ul className="svc-list">
                {s.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Process() {
  const root = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top 60%",
      end: "bottom 70%",
      onUpdate: (s) => {
        const v = Math.min(3, Math.max(0, s.progress * 3.5 - 0.25));
        scene.steps = v;
        setStep(Math.min(3, Math.round(v)));
      },
    });
    return () => st.kill();
  }, []);
  return (
    <section className="sec process" id="spoluprace">
      <div className="wrap">
        <div className="sec-head rv">
          <h2 className="h2">Jak spolupráce probíhá?</h2>
          <p className="lead">Čtyři kroky od první schůzky po potvrzení z úřadu. Doklady od Vás převezmeme a vrátíme je v pořádku.</p>
        </div>
        <div className="pr-grid" ref={root}>
          <div className="pr-steps">
            {STEPS.map((s, i) => (
              <div key={s.title} className={`pr-step${i === step ? " on" : ""}${i < step ? " done" : ""}`}>
                <span className="pr-n">{i < step && <Check size={14} weight="bold" />}</span>
                <div>
                  <h3 className="h3">{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="pr-sticky">
            <Stage slot={slots.papers} className="stage stage-papers" />
            <div className="pr-meter" aria-hidden="true">
              {STEPS.map((s, i) => (
                <span key={s.title} className={i <= step ? "on" : ""} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing({ onPick }: { onPick: (subject: string) => void }) {
  const [who, setWho] = useState<Who | "all">("all");
  const list = PRICES.filter((p) => who === "all" || p.who.includes(who));
  return (
    <section className="sec pricing" id="cenik">
      <div className="wrap">
        <div className="sec-head sec-head-row rv">
          <div>
            <h2 className="h2">Nejčastěji využívané služby</h2>
          </div>
          <div className="chips" role="group" aria-label="Pro koho">
            {WHO.map((w) => (
              <button key={w.id} className={`chip${who === w.id ? " on" : ""}`} aria-pressed={who === w.id} onClick={() => setWho(w.id)}>
                {w.label}
              </button>
            ))}
          </div>
        </div>
        <div className="price-grid">
          {list.map((p) => (
            <article key={p.title} className="price" onPointerMove={glow}>
              <h3 className="h4">{p.title}</h3>
              <ul className="ticks ticks-sm">
                {p.items.map((x) => (
                  <li key={x}>
                    <Check size={14} weight="bold" />
                    {x}
                  </li>
                ))}
              </ul>
              <div className="price-foot">
                <p className="price-v">
                  <span>od</span> {p.price} Kč
                  {p.unit && <small>{p.unit}</small>}
                </p>
                <button className="btn btn-line btn-sm" onClick={() => onPick(p.title)}>
                  Mám zájem <ArrowUpRight size={16} weight="bold" />
                </button>
              </div>
            </article>
          ))}
        </div>
        <p className="note rv">Ceny jsou uvedené jako „od“. Konečnou cenu znáte předem, jasně a bez skrytých poplatků.</p>
      </div>
    </section>
  );
}

function Deadlines() {
  const today = useMemo(() => new Date(), []);
  const all = useMemo(() => upcoming(today, 120), [today]);
  const [cat, setCat] = useState<Cat | "all">("all");
  const [hot, setHot] = useState(-1);
  const list = all.filter((d) => cat === "all" || d.cat === cat);
  const next = list[0];
  const n = next ? daysBetween(today, next.date) : 0;
  const label = (c: Cat) => CATS.find((x) => x.id === c)!.label;
  return (
    <section className="sec deadlines" id="terminy">
      <div className="wrap">
        <div className="sec-head sec-head-row rv">
          <div>
            <h2 className="h2">Hlídáme termíny za Vás.</h2>
          </div>
          <div className="chips" role="group" aria-label="Typ termínu">
            {CATS.map((c) => (
              <button key={c.id} className={`chip${cat === c.id ? " on" : ""}`} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="dl-grid rv">
          {next && (
            <div className="dl-next">
              <p className="dl-big">
                {n}
                <span>{n === 1 ? "den" : n > 1 && n < 5 ? "dny" : "dní"}</span>
              </p>
              <p className="dl-date">
                Nejbližší termín: {fmtDate(next.date)}, {fmtWeekday(next.date)}
              </p>
              <p className="dl-title">{next.title}</p>
              <span className="tag">{label(next.cat)}</span>
            </div>
          )}
          <div className="dl-side">
            <div className="dl-line" aria-hidden="true">
              {list.map((d, i) => (
                <i key={i} className={`${d.cat}${i === hot ? " hot" : ""}`} style={{ left: `${(daysBetween(today, d.date) / 120) * 100}%` }} />
              ))}
              <span className="dl-l0">dnes</span>
              <span className="dl-l1">+120 dní</span>
            </div>
            <ol className="dl-list">
              {list.slice(0, 7).map((d, i) => (
                <li key={i} onPointerEnter={() => setHot(i)} onPointerLeave={() => setHot(-1)}>
                  <span className="dl-d">{fmtDate(d.date)}</span>
                  <span className="dl-t">{d.title}</span>
                  <span className={`tag tag-${d.cat}`}>{label(d.cat)}</span>
                  <span className="dl-in">{inDays(daysBetween(today, d.date))}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <p className="note rv">Orientační přehled běžných termínů. Ty, které se týkají právě Vás, pohlídáme a připomeneme.</p>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="sec faq" id="faq">
      <div className="wrap faq-grid">
        <div className="rv">
          <h2 className="h2">Na co se nás klienti ptají</h2>
        </div>
        <div className="faq-list rv">
          {FAQ.map((f, i) => (
            <div key={f.q} className={`faq-i${open === i ? " on" : ""}`}>
              <button aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                {f.q}
                <Plus size={20} />
              </button>
              <div className="faq-a">
                <div>
                  <p>{f.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact({ subject, setSubject }: { subject: string; setSubject: (s: string) => void }) {
  const [sent, setSent] = useState(false);
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const body = `${d.get("msg")}\n\n${d.get("name")} ${d.get("surname")}\n${d.get("email")}`;
    // bez backendu zatím přes e-mailového klienta
    location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(String(d.get("subject") || "Dotaz z webu"))}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };
  return (
    <section className="sec contact" id="kontakt">
      <div className="wrap ct-grid">
        <div className="ct-copy rv">
          <h2 className="h2">Rádi s Vámi probereme Vaši situaci nezávazně.</h2>
          <p className="lead">Ozvěte se nám telefonicky, e-mailem nebo přes formulář. Odpovídáme zpravidla do 48 hodin.</p>
          <div className="ct-links">
            <a href={CONTACT.phoneHref}>
              <Phone size={22} />
              <span>
                {CONTACT.phone}
              </span>
            </a>
            <a href={`mailto:${CONTACT.email}`}>
              <EnvelopeSimple size={22} />
              <span>
                {CONTACT.email}
              </span>
            </a>
          </div>
        </div>
        <form className="ct-form rv" onSubmit={submit}>
          <div className="f-row">
            <label>
              <span>Jméno</span>
              <input name="name" autoComplete="given-name" required />
            </label>
            <label>
              <span>Příjmení</span>
              <input name="surname" autoComplete="family-name" required />
            </label>
          </div>
          <label>
            <span>E-mail</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            <span>Předmět</span>
            <input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label>
            <span>Váš dotaz</span>
            <textarea name="msg" rows={4} required />
          </label>
          <label className="f-check">
            <input type="checkbox" required />
            <span>Souhlasím se zpracováním osobních údajů</span>
          </label>
          <button className="btn btn-teal" type="submit">
            {sent ? "Otevíráme e-mail…" : "Odeslat poptávku"} <ArrowRight size={18} weight="bold" />
          </button>
        </form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot-grid">
        <div>
          <Logo />
          <p>Daně, účetnictví, mzdy a poradenství pro podnikatele a firmy.</p>
        </div>
        <nav aria-label="Patička">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={go(n.href)}>
              {n.label}
            </a>
          ))}
          <a href="#kontakt" onClick={go("#kontakt")}>
            Kontakt
          </a>
        </nav>
        <div className="foot-c">
          <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        </div>
      </div>
      <div className="wrap foot-b">
        <span>© {new Date().getFullYear()} Finelia</span>
        <a href="#top" onClick={go("#top")}>
          Nahoru
        </a>
      </div>
    </footer>
  );
}

export default function App() {
  const [gl] = useState(webglOk);
  // 3D (načtení modulu, sestavení scén, kompilace) až po doběhnutí úvodu, nejpozději za 3 s
  const [mount3d, setMount3d] = useState(false);
  useEffect(() => {
    const on = () => setMount3d(true);
    addEventListener("intro-done", on);
    const t = setTimeout(on, 3000);
    return () => {
      removeEventListener("intro-done", on);
      clearTimeout(t);
    };
  }, []);
  const [subject, setSubject] = useState("");
  useEffect(() => {
    scene.reduced = reducedMotion();
    startSmoothScroll();
    const off = trackPointer();
    const offRv = revealOnView();
    const t = setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => {
      off();
      offRv();
      clearTimeout(t);
    };
  }, []);
  const pick = (s: string) => {
    setSubject(s);
    scrollToHash("#kontakt");
  };
  return (
    <div className={gl ? "has-gl" : "no-gl"}>
      <Nav />
      <main>
        <Hero />
        <Moments />
        <Services />
        <Process />
        <Pricing onPick={pick} />
        <Deadlines />
        <Faq />
        <Contact subject={subject} setSubject={setSubject} />
      </main>
      <Footer />
      {gl && mount3d && (
        <Safe>
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Safe>
      )}
    </div>
  );
}
