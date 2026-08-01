# NOVA — enterprise streaming platform

Teljesen eredeti, saját fejlesztésű streaming platform: Next.js frontend, NestJS
backend, PostgreSQL, Redis, S3-kompatibilis tároló, HLS/DASH lejátszás,
Docker/Kubernetes deployment és CI/CD pipeline.

> Minden kód, dizájn, tartalom és grafikai elem saját fejlesztés. A borítók és
> avatárok futásidőben, CSS-gradiensekből és SVG-ből generálódnak, így a projekt
> egyetlen harmadik féltől származó képet vagy márkaelemet sem használ.

---

## Gyors indítás (adatbázis nélkül, 2 perc)

```bash
npm install
npm run build --workspace @nova/shared
npm run dev
```

- Web: <http://localhost:3000>
- API: <http://localhost:4000/api/v1>
- OpenAPI dokumentáció: <http://localhost:4000/api/v1/docs>

`DATABASE_URL` és `REDIS_URL` nélkül az API automatikusan memória-adaptereket
használ, feltöltve a teljes demókatalógussal — nem kell semmit telepíteni.

### Demó belépők

| Szerep | E-mail | Jelszó |
| --- | --- | --- |
| Néző | `demo@nova.example` | `NovaDemo2026!` |
| Admin | `admin@nova.example` | `NovaAdmin2026!` |

## Teljes stack indítása (Postgres + Redis + MinIO)

```bash
cp .env.example .env
docker compose up -d          # postgres, redis, minio, api, web
npm run db:migrate            # séma alkalmazása
npm run db:seed               # demó adatok betöltése
```

---

## Architektúra

```
nova/
├── apps/
│   ├── api/                 NestJS — Clean Architecture + DDD
│   │   └── src/
│   │       ├── common/      domain / application / infrastructure / presentation
│   │       ├── config/      típusos konfiguráció (egyetlen env-olvasási pont)
│   │       └── modules/     bounded contextek
│   │           ├── identity/        fiók, JWT, 2FA, OAuth
│   │           ├── profiles/        több profil, gyermekprofil, korhatár
│   │           ├── catalog/         film/sorozat aggregátum, keresés, CMS
│   │           ├── playback/        manifest, feliratok, folytasd a nézést
│   │           ├── watchlist/       saját lista
│   │           ├── recommendations/ ajánló motor + böngésző oldal
│   │           ├── billing/         Stripe checkout, előfizetés, számlák
│   │           ├── notifications/   e-mail, Web Push, WebSocket
│   │           └── analytics/       admin KPI-k, felhasználókezelés
│   └── web/                 Next.js App Router + Tailwind CSS
│       └── src/
│           ├── app/         route-ok (landing, auth, browse, watch, admin…)
│           ├── components/  brand / catalog / player / admin / ui / layout
│           ├── lib/         API kliens, session tárolás
│           └── providers/   session, téma, toast
├── packages/shared/         keretrendszer-független DTO-k, enumok, segédek
└── infra/
    ├── docker/              Dockerfile.api, Dockerfile.web
    └── k8s/                 namespace, deployment, HPA, ingress, job
```

### Rétegek és függőségi irány

Minden bounded context négy rétegre bomlik, és a függőségek kizárólag befelé
mutatnak:

```
presentation  →  application  →  domain
       ↘            ↓
        infrastructure (portok implementációi)
```

- **domain** — entitások, invariánsok, repository interfészek. Nem ismer
  NestJS-t, Prismát, HTTP-t.
- **application** — use case-ek, mapperek, kimenő portok (cache, mailer, fizetés).
- **infrastructure** — Prisma és in-memory repository adapterek, Redis, SMTP,
  S3, Stripe, Web Push.
- **presentation** — controllerek, DTO-k, guardok, WebSocket gateway.

Emiatt cserélhető minden külső rendszer: a `PERSISTENCE_DRIVER=memory` és a
Prisma adapter ugyanazt az interfészt elégíti ki, és a domain egyetlen sora sem
változik.

### SOLID a gyakorlatban

- **S** — egy use case egy üzleti művelet (`LoginUserUseCase`, `ToggleWatchlistUseCase`).
- **O** — új fizetési szolgáltató = új `PaymentGatewayPort` implementáció.
- **L** — a Prisma és a memória repository felcserélhető, a tesztek ezt bizonyítják.
- **I** — szűk portok (`CachePort`, `MailerPort`) egy-egy felelősséggel.
- **D** — a use case-ek interfészektől függenek, a kötést a modul végzi.

---

## Funkciók

**Nézői élmény** — modern landing oldal, regisztráció és bejelentkezés,
kétlépcsős azonosítás, több profil, gyermekprofil szülői korlátozással,
személyre szabott böngésző felület, Top 10, Folytasd a nézést, Újdonságok,
Saját lista, keresés, kategóriák és hangulatok, film/sorozat adatlap
epizódlistával, trailer lejátszás.

**Lejátszó** — HLS/DASH manifest, adaptív minőségváltás, feliratok (WebVTT),
hangsávválasztás, autoplay a következő epizódra, főcím átugrása, teljes
képernyő, billentyűparancsok (`szóköz`, `←/→`, `f`, `m`, `c`), folytatás a
mentett pozícióról.

**Üzemeltetés** — admin panel KPI-kkal és trendekkel, tartalomkezelő rendszer,
felhasználó- és előfizetés-kezelés, Stripe fizetés, e-mail és push értesítések,
WebSocket valós idejű események.

**Platform** — PWA (telepíthető, offline oldal, service worker), SEO
(metaadatok, JSON-LD, sitemap, robots), sötét/világos mód, WCAG AA szintű
akadálymentesség, reszponzív layout, lazy loading és code splitting.

---

## Parancsok

| Parancs | Leírás |
| --- | --- |
| `npm run dev` | API és web egyszerre, watch módban |
| `npm run build` | shared → api → web build |
| `npm test` | Jest unit tesztek (domain + application réteg) |
| `npm run test:e2e` | Playwright e2e tesztek (desktop + mobil) |
| `npm run typecheck` | típusellenőrzés minden workspace-en |
| `npm run db:migrate` | Prisma migrációk alkalmazása |
| `npm run db:seed` | demó adatok betöltése |
| `npm run docker:up` | teljes stack Dockerben |

### Tesztelés

```bash
npm test                      # 30 unit teszt: entitások, ajánló motor
npm run test:e2e              # 48 e2e teszt: auth, böngészés, lejátszó, admin
```

Az e2e futtatás előtt az API-nak futnia kell. A CI pipeline ezt automatikusan
elvégzi (`.github/workflows/ci.yml`).

---

## Konfiguráció

Minden környezeti változó a `.env.example` fájlban szerepel, dokumentálva. Az
opcionális integrációk hiányában az API automatikusan fejlesztői adapterre vált:

| Változó | Hiányában |
| --- | --- |
| `DATABASE_URL` | memória-repository a demókatalógussal |
| `REDIS_URL` | in-process cache |
| `STRIPE_SECRET_KEY` | szimulált fizetés (a csomagváltás azonnal érvényes) |
| `SMTP_HOST` | a levelek az alkalmazásnaplóba kerülnek |
| `WEB_PUSH_*` | a push üzenetek naplózódnak |
| `S3_*` | aláíratlan, publikus URL-ek |

### Videó tartalom

A demókatalógus a `DEMO_HLS_URL` alatti tesztfolyamot játssza le. Éles
környezetben a csomagolt HLS/DASH assetek kerülnek az objektumtárolóba, és a
`CDN_BASE_URL` a CDN-re mutat; a lejátszó ilyenkor a manifestben kapott
asset-kulcsot használja. Hálózat nélkül a lejátszó a vezérlőkkel együtt
megjelenik, és jelzi, hogy a folyam nem elérhető.

---

## Deployment

```bash
docker compose up -d --build            # lokális teljes stack
kubectl apply -f infra/k8s/nova.yaml    # klaszter (namespace, HPA, ingress)
```

A Kubernetes manifest tartalmazza a migrációs Jobot, a liveness/readiness
próbákat, a HorizontalPodAutoscalert (CPU 70%, 3–20 replika), a
PodDisruptionBudgetet és a TLS-terminált ingresst. A titkok helyőrzők — éles
környezetben külső secret store-ból érkeznek.

## Licenc

MIT.
