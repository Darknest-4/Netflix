# NOVA frontend újratervezés — „Kiadvány” irány

Ez a dokumentum azt tervezi meg, hogyan lesz a NOVA felülete **strukturálisan is
egyedi**, ne csak más színű Netflix. A backend, az API-szerződések és az útvonalak
változatlanok maradnak — a redesign kizárólag az `apps/web` réteget érinti.

---

## 1. Miért nem elég átszínezni

A jelenlegi felület öt olyan mintát használ, amelyről a felhasználó azonnal
felismeri az iparági mintát:

| Jelenlegi minta | Miért generikus |
| --- | --- |
| Fix felső nav, átlátszóból tömörre váltó | minden streaming szolgáltató ezt használja |
| Teljes szélességű hero billboard szinopszissal | a „billboard” a Netflix védjegye |
| Végtelen egyforma vízszintes sorok | a „végtelen görgetés” maga a döntésképtelenség |
| Hover-re kinyíló, szomszédokat eltoló kártya | a Netflix legjellegzetesebb interakciója |
| Piros akcentus sötét alapon | vizuálisan a Netflix-paletta |

Ha csak a piros helyett kéket használunk, a felület továbbra is „Netflix-klón”
marad. Ezért a redesign **más terméktézisből** indul.

## 2. Terméktézis: kevesebb görgetés, több döntés

> A NOVA nem katalógust mutat, hanem **műsort ajánl**. A cél nem az, hogy minél
> tovább görgess, hanem hogy 30 másodpercen belül elindíts valamit.

Ebből három konkrét termékdöntés következik:

1. **„Ma este”** — a kezdőlap tetején nem billboard van, hanem egyetlen,
   szerkesztői hangvételű ajánlat, két gombbal: `Indítás` és `Ma nem`. A „Ma nem”
   tanul: az adott címet és annak műfaji profilját 30 napra hátrasorolja.
2. **Idő-alapú szűrés** — „Van 45 percem” chip. A katalógus szűrhető a
   rendelkezésre álló időre (film hossza, epizódhossz), ami egyetlen versenytársnál
   sincs első szinten.
3. **Hangulat-belépő** — a böngészés nem műfajjal, hanem hangulattal kezdődik
   (`Feszült`, `Könnyed`, `Elgondolkodtató`), a műfaj csak másodlagos szűrő.

Mérhető célok: *idő az első lejátszásig* < 30 mp, kezdőlapi görgetés < 3
képernyő, „Ma este” elfogadási arány > 25%.

## 3. Vizuális nyelv: szerkesztői magazin

A generált borítók miatt a tipográfia a fő vizuális eszközünk — ezt nem hátránynak
kezeljük, hanem stílussá emeljük: a NOVA úgy néz ki, mint egy **kortárs
kulturális magazin**, nem mint egy videótéka.

### 3.1 Szín

Elhagyjuk a piros akcentust és a hideg feketét. Meleg tintafekete alap + papír
törtfehér + egyetlen erős jelzőszín.

| Token | Sötét téma | Világos téma | Használat |
| --- | --- | --- | --- |
| `--ink-base` | `#100E0C` | `#F4F1EA` | oldal háttér |
| `--ink-raised` | `#1A1714` | `#FFFFFF` | kártya, panel |
| `--ink-line` | `rgb(244 241 234 / .12)` | `rgb(20 18 16 / .14)` | vonalak |
| `--text-primary` | `#F4F1EA` | `#141210` | cím, törzs |
| `--text-secondary` | `#B0A79A` | `#5A5248` | meta |
| `--signal` | `#C8F250` (savas lime) | `#5B7A00` | CTA, aktív állapot |
| `--signal-warm` | `#FF8A3D` (parázs) | `#C2410C` | haladás, „élő” |

Egy jelzőszín, nagy felületen soha — csak gombon, aktív navigációs elemen,
haladásjelzőn. A borítók duotone színpárokból építkeznek, a felület maga
majdnem monokróm. Kontraszt: minden szövegpár ≥ 4.5:1 (AA), a `--signal` sötét
alapon feketével párosítva.

### 3.2 Tipográfia

Két betűtípus, önhosztolva (`public/fonts`, `font-display: swap`, variable):

- **Display: magas kontrasztú szerif** (pl. Fraunces vagy Instrument Serif) —
  címek, „Ma este” blokk, borítók feliratai. Ez adja a magazin-karaktert, és ez
  a legerősebb eltérés a mai all-sans streaming felületektől.
- **Szöveg: kompakt groteszk** (pl. Inter Tight) — meta, UI, űrlapok.

Skála (fluid, `clamp`): `72/56/40/28/20/16/14/12`. Címeknél `line-height: 0.95`,
`letter-spacing: -0.02em`, törzsnél `1.6`. A címek **nem** nagybetűsek — a
nagybetűs, széles betűközös cím szintén iparági klisé.

### 3.3 Borítógenerálás v2

A mostani „gradiens + wordmark” helyett **poszter-kompozíció**, továbbra is
determinisztikusan az entitás azonosítójából:

1. duotone alap (két színstop a paletta-párokból),
2. raszter/halftone textúra (SVG `feTurbulence` + pontháló) — szitanyomat hatás,
3. **öt tipográfiai sablon** (bal-alsó blokk, középre zárt, oldalt forgatott,
   szélső sávos, kétsoros osztott), a hash választ közülük,
4. finom keret és egy vékony vonal a cím fölött,
5. opcionális „mood-jel”: 3–4 absztrakt geometriai elem a hangulathoz kötve.

Így minden cím borítója **tervezett plakátnak** néz ki, nem színátmenetes
téglalapnak — miközben egyetlen külső képet sem használunk.

### 3.4 Mozgás

- Alap easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`, időtartam 160–420 ms.
- Signature: **maszkos „függöny” felfedés** — a spread-ek görgetéskor alulról
  felfelé húzódó maszkkal jelennek meg (`clip-path`), egyszer, nem ismétlődve.
- Kártya hover: 120 ms emelés (`translateY(-4px)`) + borító 1.03 parallax **a
  kártyán belül** — a kártya mérete nem változik, a szomszédok nem ugranak.
- `prefers-reduced-motion` esetén minden felfedés azonnali.

## 4. Elrendezés: rail + spread-ek

### 4.1 Váz

```
┌────┬──────────────────────────────────────────────┐
│    │  ⌘K  parancssáv        idő-chip   profil     │  ← lebegő fejléc (nem fix sáv)
│ r  ├──────────────────────────────────────────────┤
│ a  │                                              │
│ i  │   S P R E A D   (max 1440px, 64px margó)     │
│ l  │                                              │
└────┴──────────────────────────────────────────────┘
```

- **Bal rail** (76 px, hoverre 240 px): ikon + felirat, alul profilváltó.
  Mobilon alsó sávvá alakul. A fix felső menü eltűnik → azonnal más a ritmus.
- **Nincs teljes szélességű tartalom.** A kezdőlap tördelt, marginált — mint egy
  magazinoldal. Ez önmagában megkülönböztet minden „edge-to-edge” streaming UI-tól.

### 4.2 A kezdőlap spread-jei (sorok helyett)

| # | Spread | Leírás |
| --- | --- | --- |
| 1 | **Ma este** | 60/40 aszimmetrikus split: nagy poszter + szerkesztői felütés (1 mondat, nem szinopszis) + `Indítás` / `Ma nem` + „miért ajánljuk” magyarázat |
| 2 | **Folytasd** | vízszintes polc, 16:9 kockák, **hátralévő idő** („még 23 perc”), nem százalék |
| 3 | **A hét válogatása** | bento rács: 1 nagy + 2 közepes + 3 kicsi, vegyes arányokkal |
| 4 | **Top 10** | szerkesztői **számozott lista** (nem karusszel): nagy kontúros sorszám, cím, egysoros indoklás |
| 5 | **Hangulat** | chipek; kattintásra a spread helyben kinyílik egy 6 elemes ráccsá |
| 6 | **Gyűjtemények** | tematikus kártyák legyezőbe rendezett borítókkal |

Legfeljebb hat spread, utána „Teljes katalógus” link — nincs végtelen sor.

### 4.3 Kártya és részletek

- A kártya alatt **mindig látszik** a cím és a meta (év · hossz · egyezés). Nem
  kell hoverelni az információért — ez akadálymentességi nyereség is.
- Hoverre csak emelés + lejátszás gomb jelenik meg a borítón.
- A részletek **jobb oldali panelben (side sheet)** nyílnak, nem középre ugró
  modálban: a kontextus (a rács) látható marad, a panel URL-lel megosztható.

### 4.4 Adatlap

Kétoszlopos szerkesztői elrendezés: bal oldalon ragadós borító + akciók, jobb
oldalon a tartalom — a szinopszis **kiemelt idézetként** indul, alatta „specifikáció”
táblázat (stáb, nyelvek, feliratok), majd az epizódlista haladásjelzőkkel.

### 4.5 Lejátszó

- A vezérlők a képernyő széleihez tapadnak, középen semmi nem takar.
- Egyetlen alsó sáv, **hátralévő idővel** (`-42:10`), fejezetjelekkel a csúszkán.
- A felirat/hangsáv menü alulról felcsúszó lap, nem lebegő doboz.

## 5. Egyedi képességek (amit a versenytársak nem adnak)

1. **⌘K parancssáv** — keresés, ugrás, lejátszás, profilváltás, „van 40 percem”
   szűrő egyetlen billentyűvel. Power-user élmény, amilyen streaming appban nincs.
2. **Idő-alapú ajánlás** — a manifest ismeri a hosszt, a szűrő ezt használja.
3. **„Miért ajánljuk”** — az ajánló motor már ma szöveges indoklást ad
   (`RecommendationEngine.explanation`); ezt kiírjuk a felületre. Átlátható
   ajánlás = bizalom, és ez a mi motorunk egyedi képessége.
4. **„Ma nem”** — negatív visszajelzés egyetlen kattintással.

## 6. Megvalósítási terv

| Fázis | Tartalom | Érintett fájlok | Becslés |
| --- | --- | --- | --- |
| 0 | Design tokenek, betűtípusok önhosztolása, Artwork v2 | `app/globals.css`, `public/fonts/*`, `components/catalog/Artwork.tsx`, `packages/shared/src/utils/artwork.ts` | 1 nap |
| 1 | Váz: `AppRail`, `FloatingHeader`, `CommandPalette` | `components/layout/*` (SiteHeader kivezetése) | 1,5 nap |
| 2 | Spread-ek: `TonightFeature`, `ContinueShelf`, `BentoGrid`, `RankedList`, `MoodStrip`, `CollectionCard` | `components/catalog/*` (Billboard, CatalogRow, Top10Card kivezetése) | 3 nap |
| 3 | `DetailSheet` (side sheet) + adatlap újratördelése | `components/catalog/DetailSheet.tsx`, `app/title/[slug]/page.tsx` | 1,5 nap |
| 4 | Lejátszó chrome + fejezetjelek | `components/player/*` | 1 nap |
| 5 | Idő-szűrő, „Ma nem”, „miért ajánljuk” bekötése | `+ 2 API mező` (opcionális) | 1 nap |
| 6 | E2E és a11y frissítés, vizuális regresszió | `e2e/*`, `playwright.config.ts` | 1 nap |

**Összesen ~10 munkanap.** A backend érintettsége minimális: a „Ma nem” és a
„miért ajánljuk” két opcionális mező a meglévő végpontokon.

### Mit nem érintünk

`packages/shared` szerződéseket, a session/téma/toast providereket, az
útvonalstruktúrát, a PWA/SEO réteget és a teljes backendet.

### Kockázatok

- **Betűtípus-licenc**: csak SIL OFL licencű variable fontot hosztolunk.
- **Bento rács tartalomfüggő**: kevés elemnél degradálódnia kell egyszerű ráccsá.
- **Kevesebb sor = kisebb felfedezési felület**: mérjük a katalógus-lefedettséget;
  ha csökken, a „Gyűjtemények” spread kap nagyobb súlyt.

## 7. Elfogadási kritériumok

- Egyetlen Netflix-specifikus minta sem marad (billboard, hover-expand kártya,
  végtelen egyforma sorok, piros akcentus, felső nav).
- WCAG AA megmarad: fókuszgyűrű, kontraszt, billentyűzet, `prefers-reduced-motion`.
- LCP < 2,0 s, CLS < 0,05 (a kártya-meta mindig foglalt helyen van).
- A meglévő 48 e2e teszt szelektorai frissítve, a lefedettség nem csökken.

Vizuális makett: [`mockup/browse.html`](./mockup/browse.html).
