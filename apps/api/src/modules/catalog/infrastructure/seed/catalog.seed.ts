import { MaturityRating, TitleKind, slugify } from '@nova/shared';

import type { TitleProps } from '../../domain/title.entity';

/**
 * Editorial seed catalog.
 *
 * Every title, synopsis and credit is original writing created for NOVA; no
 * third-party catalog data, artwork or trademark is used anywhere in the
 * project. The same dataset feeds the in-memory repository and the Prisma
 * seeding script, so both runtimes show identical content.
 */
interface SeedTitle {
  name: string;
  kind: TitleKind;
  tagline: string;
  synopsis: string;
  releaseYear: number;
  maturityRating: MaturityRating;
  /** Runtime in minutes for movies. */
  runtimeMinutes?: number;
  genres: string[];
  moods: string[];
  cast: string[];
  directors: string[];
  writers: string[];
  isOriginal: boolean;
  popularity: number;
  trendingScore: number;
  /** Days ago the title was published; drives the "Újdonság" badge. */
  publishedDaysAgo: number;
  /** Season sizes for series, e.g. `[8, 6]` = two seasons. */
  seasons?: number[];
}

const SEED_TITLES: SeedTitle[] = [
  {
    name: 'Északi Fény',
    kind: TitleKind.SERIES,
    tagline: 'A sarkkörön túl minden titok megfagy.',
    synopsis:
      'Egy sarkvidéki kutatóállomáson eltűnik a váltás fele. A hátramaradt geológus rájön, hogy a jég alatt olyasmi mozog, amiről a szolgálati napló szándékosan hallgat.',
    releaseYear: 2026,
    maturityRating: MaturityRating.SIXTEEN_PLUS,
    genres: ['Misztikus', 'Thriller', 'Dráma'],
    moods: ['Feszült', 'Sötét tónusú'],
    cast: ['Vas Réka', 'Halász Dénes', 'Ingrid Sørensen'],
    directors: ['Bakos Júlia'],
    writers: ['Bakos Júlia', 'Tordai Márk'],
    isOriginal: true,
    popularity: 96,
    trendingScore: 940,
    publishedDaysAgo: 9,
    seasons: [8, 6],
  },
  {
    name: 'Üvegváros',
    kind: TitleKind.SERIES,
    tagline: 'Minden ablak mögött egy alku.',
    synopsis:
      'Egy fiatal ügyvéd a város legnagyobb ingatlanbirodalmának jogi osztályán kap állást, és három hét alatt megérti, hogy a szerződések mellékmondataiban emberi sorsok vannak elrejtve.',
    releaseYear: 2025,
    maturityRating: MaturityRating.SIXTEEN_PLUS,
    genres: ['Dráma', 'Bűnügyi'],
    moods: ['Elgondolkodtató', 'Feszült'],
    cast: ['Somlai Petra', 'Király Ábel', 'Nagy Tivadar'],
    directors: ['Erdős Gábor'],
    writers: ['Erdős Gábor'],
    isOriginal: true,
    popularity: 91,
    trendingScore: 810,
    publishedDaysAgo: 30,
    seasons: [10],
  },
  {
    name: 'Hetedik Hullám',
    kind: TitleKind.MOVIE,
    tagline: 'A tenger mindent visszakér.',
    synopsis:
      'Egy kimerült mentőbúvár utolsó szolgálatára indul, amikor egy viharban zátonyra futott komphoz riasztják. A víz alatt nemcsak túlélőket talál.',
    releaseYear: 2026,
    maturityRating: MaturityRating.TWELVE_PLUS,
    runtimeMinutes: 118,
    genres: ['Akció', 'Dráma', 'Thriller'],
    moods: ['Látványos', 'Feszült'],
    cast: ['Barta Levente', 'Mira Kovač', 'Fehér Zsófia'],
    directors: ['Szalai Tamás'],
    writers: ['Szalai Tamás', 'Gerő Anna'],
    isOriginal: true,
    popularity: 94,
    trendingScore: 880,
    publishedDaysAgo: 4,
  },
  {
    name: 'Papírrepülők',
    kind: TitleKind.MOVIE,
    tagline: 'Néha a legkisebb üzenet repül a legmesszebb.',
    synopsis:
      'Két testvér egy elhagyott nyomdában talált levelesládán keresztül próbálja helyrehozni azt, amit a felnőttek évtizedek alatt elrontottak.',
    releaseYear: 2025,
    maturityRating: MaturityRating.ALL,
    runtimeMinutes: 96,
    genres: ['Családi', 'Dráma'],
    moods: ['Szívmelengető', 'Nosztalgikus'],
    cast: ['Pintér Boglárka', 'Csorba Milán'],
    directors: ['Rétvári Kata'],
    writers: ['Rétvári Kata'],
    isOriginal: false,
    popularity: 78,
    trendingScore: 340,
    publishedDaysAgo: 120,
  },
  {
    name: 'Kvantumkert',
    kind: TitleKind.SERIES,
    tagline: 'Minden döntésed külön ágon él tovább.',
    synopsis:
      'Egy fizikusnő olyan kísérletet indít, amely a döntéseit párhuzamos ágakra bontja. Ahogy az ágak elkezdenek visszaszivárogni, a saját életét sem tudja többé egyetlen történetként elmesélni.',
    releaseYear: 2026,
    maturityRating: MaturityRating.TWELVE_PLUS,
    genres: ['Sci-Fi', 'Dráma', 'Misztikus'],
    moods: ['Elgondolkodtató', 'Epikus'],
    cast: ['Dobos Emese', 'Aron Weiss', 'Lakatos Bende'],
    directors: ['Vígh Norbert'],
    writers: ['Vígh Norbert', 'Dobos Emese'],
    isOriginal: true,
    popularity: 93,
    trendingScore: 905,
    publishedDaysAgo: 16,
    seasons: [6, 6],
  },
  {
    name: 'Aranyfutam',
    kind: TitleKind.SERIES,
    tagline: 'A pálya nem felejt.',
    synopsis:
      'Egy vidéki atlétikai klub edzője zsinórban harmadszor próbál bajnokot nevelni — miközben a szövetség pénzügyei körül egyre több a megválaszolatlan kérdés.',
    releaseYear: 2024,
    maturityRating: MaturityRating.TWELVE_PLUS,
    genres: ['Dráma', 'Ismeretterjesztő'],
    moods: ['Szívmelengető', 'Elgondolkodtató'],
    cast: ['Kelemen Ottó', 'Bihari Sára'],
    directors: ['Faragó Máté'],
    writers: ['Faragó Máté'],
    isOriginal: false,
    popularity: 71,
    trendingScore: 210,
    publishedDaysAgo: 260,
    seasons: [8],
  },
  {
    name: 'Vasvirág',
    kind: TitleKind.MOVIE,
    tagline: 'Ahol a gyár leállt, ott kezdődik a történet.',
    synopsis:
      'Egy bezárt kohó utolsó műszakvezetője a felszámolás hetében kap egy ajánlatot, amely a városa jövőjét és a saját múltját is átírja.',
    releaseYear: 2025,
    maturityRating: MaturityRating.SIXTEEN_PLUS,
    runtimeMinutes: 132,
    genres: ['Dráma', 'Történelmi'],
    moods: ['Sötét tónusú', 'Elgondolkodtató'],
    cast: ['Ungvári Dezső', 'Márkus Ilona'],
    directors: ['Hetényi Pál'],
    writers: ['Hetényi Pál', 'Ungvári Dezső'],
    isOriginal: true,
    popularity: 84,
    trendingScore: 420,
    publishedDaysAgo: 70,
  },
  {
    name: 'Éjféli Konyha',
    kind: TitleKind.SERIES,
    tagline: 'A legjobb receptek éjjel születnek.',
    synopsis:
      'Egy nonstop kifőzde éjszakai műszakja köré szerveződő komédia, ahol a vendégek problémái mindig pont a rendelés kiadása előtt kulminálnak.',
    releaseYear: 2026,
    maturityRating: MaturityRating.TWELVE_PLUS,
    genres: ['Vígjáték'],
    moods: ['Könnyed', 'Szívmelengető'],
    cast: ['Tóth-Baranyi Nóra', 'Gulyás Ferenc', 'Deák Zalán'],
    directors: ['Kármán Bea'],
    writers: ['Kármán Bea', 'Deák Zalán'],
    isOriginal: true,
    popularity: 88,
    trendingScore: 760,
    publishedDaysAgo: 22,
    seasons: [12, 10],
  },
  {
    name: 'A Kartográfus',
    kind: TitleKind.MOVIE,
    tagline: 'Egy térkép, amit senki nem rendelt meg.',
    synopsis:
      'Egy térképész olyan országhatárt talál egy 19. századi felmérésben, amely soha nem létezett — és a nyomozás elvezet egy máig működő szolgálathoz.',
    releaseYear: 2024,
    maturityRating: MaturityRating.SIXTEEN_PLUS,
    runtimeMinutes: 124,
    genres: ['Thriller', 'Misztikus', 'Történelmi'],
    moods: ['Feszült', 'Elgondolkodtató'],
    cast: ['Balogh Rezső', 'Elin Marchetti'],
    directors: ['Sipos Regina'],
    writers: ['Sipos Regina'],
    isOriginal: false,
    popularity: 80,
    trendingScore: 300,
    publishedDaysAgo: 180,
  },
  {
    name: 'Csillagkovácsok',
    kind: TitleKind.SERIES,
    tagline: 'Új eget építeni nem egy ember munkája.',
    synopsis:
      'Egy generációs űrhajó mérnökcsapata negyven évvel az érkezés előtt szembesül azzal, hogy a célbolygó már nem az, amire a küldetést tervezték.',
    releaseYear: 2025,
    maturityRating: MaturityRating.TWELVE_PLUS,
    genres: ['Sci-Fi', 'Kaland', 'Dráma'],
    moods: ['Epikus', 'Látványos'],
    cast: ['Vámos Kincső', 'Oyelaran Tunde', 'Bereczki Ádám'],
    directors: ['Molnár-Szabó Dániel'],
    writers: ['Molnár-Szabó Dániel', 'Vámos Kincső'],
    isOriginal: true,
    popularity: 92,
    trendingScore: 720,
    publishedDaysAgo: 50,
    seasons: [10, 8, 8],
  },
  {
    name: 'Hangfogó',
    kind: TitleKind.MOVIE,
    tagline: 'Amit nem hallasz, az is bizonyíték.',
    synopsis:
      'Egy hangmérnök egy koncertfelvétel háttérzajában rögzített beszélgetést talál, amely egy lezárt ügy egészen más verzióját meséli el.',
    releaseYear: 2026,
    maturityRating: MaturityRating.SIXTEEN_PLUS,
    runtimeMinutes: 108,
    genres: ['Bűnügyi', 'Thriller'],
    moods: ['Feszült', 'Sötét tónusú'],
    cast: ['Szigeti Márton', 'Rácz Villő'],
    directors: ['Antal Krisztián'],
    writers: ['Antal Krisztián'],
    isOriginal: true,
    popularity: 87,
    trendingScore: 650,
    publishedDaysAgo: 12,
  },
  {
    name: 'Rókaerdő',
    kind: TitleKind.SERIES,
    tagline: 'Az erdő mindenkit befogad. Egy ideig.',
    synopsis:
      'Animációs családi sorozat egy elvarázsolt erdő lakóiról, akiknek minden évszakban új szabályokat kell kitalálniuk az együttéléshez.',
    releaseYear: 2025,
    maturityRating: MaturityRating.ALL,
    genres: ['Animáció', 'Családi', 'Kaland'],
    moods: ['Szívmelengető', 'Könnyed'],
    cast: ['Szentesi Léna', 'Vajda Kornél'],
    directors: ['Pásztor Emma'],
    writers: ['Pásztor Emma', 'Szentesi Léna'],
    isOriginal: true,
    popularity: 85,
    trendingScore: 540,
    publishedDaysAgo: 40,
    seasons: [13, 13],
  },
  {
    name: 'Holdfénypálya',
    kind: TitleKind.MOVIE,
    tagline: 'Egy éjszaka, kétszáz kilométer, egy esély.',
    synopsis:
      'Két idegen ugyanazon az éjszakai vonaton próbál eljutni egy határon túli kórházba — és a hosszú út alatt kiderül, hogy ugyanazért.',
    releaseYear: 2024,
    maturityRating: MaturityRating.TWELVE_PLUS,
    runtimeMinutes: 101,
    genres: ['Romantikus', 'Dráma'],
    moods: ['Szívmelengető', 'Nosztalgikus'],
    cast: ['Ferenczi Dorka', 'Novák Ábel'],
    directors: ['Illés Márton'],
    writers: ['Illés Márton'],
    isOriginal: false,
    popularity: 74,
    trendingScore: 190,
    publishedDaysAgo: 300,
  },
  {
    name: 'Nyomvonal',
    kind: TitleKind.SERIES,
    tagline: 'Minden eltűnés hagy egy vonalat.',
    synopsis:
      'Egy hegyi mentőcsapat és egy nyomozó közös ügyeit követő sorozat, ahol a terep gyakran több információt ad, mint a tanúk.',
    releaseYear: 2026,
    maturityRating: MaturityRating.SIXTEEN_PLUS,
    genres: ['Bűnügyi', 'Dráma', 'Thriller'],
    moods: ['Feszült', 'Sötét tónusú'],
    cast: ['Csáki Villő', 'Marton Bertalan'],
    directors: ['Zsigmond Réka'],
    writers: ['Zsigmond Réka'],
    isOriginal: true,
    popularity: 90,
    trendingScore: 830,
    publishedDaysAgo: 6,
    seasons: [8],
  },
  {
    name: 'Mélyáram',
    kind: TitleKind.SERIES,
    tagline: 'Az óceán kilencven százaléka még ismeretlen.',
    synopsis:
      'Ismeretterjesztő sorozat a mélytengeri kutatás történetéről és arról, hogyan írja át minden új merülés a tankönyveket.',
    releaseYear: 2025,
    maturityRating: MaturityRating.ALL,
    genres: ['Dokumentumfilm', 'Ismeretterjesztő'],
    moods: ['Látványos', 'Elgondolkodtató'],
    cast: ['Dr. Halmi Eszter'],
    directors: ['Bogdán Ivett'],
    writers: ['Bogdán Ivett'],
    isOriginal: true,
    popularity: 82,
    trendingScore: 380,
    publishedDaysAgo: 90,
    seasons: [6],
  },
  {
    name: 'Utolsó Villamos',
    kind: TitleKind.MOVIE,
    tagline: 'Egy város búcsúzik a saját ritmusától.',
    synopsis:
      'A megszűnő éjszakai villamosjárat utolsó fordulóján hét utas története fut össze egyetlen menetrend körül.',
    releaseYear: 2026,
    maturityRating: MaturityRating.TWELVE_PLUS,
    runtimeMinutes: 112,
    genres: ['Dráma'],
    moods: ['Nosztalgikus', 'Elgondolkodtató'],
    cast: ['Örkényi Judit', 'Sáska Bertold', 'Kelemen Ottó'],
    directors: ['Bakos Júlia'],
    writers: ['Bakos Júlia'],
    isOriginal: true,
    popularity: 86,
    trendingScore: 610,
    publishedDaysAgo: 18,
  },
  {
    name: 'Zajszint',
    kind: TitleKind.SERIES,
    tagline: 'A stúdió falain kívül is szól a zene.',
    synopsis:
      'Egy független lemezkiadó felemelkedése és majdnem-összeomlása három album és sok rossz döntés tükrében.',
    releaseYear: 2024,
    maturityRating: MaturityRating.SIXTEEN_PLUS,
    genres: ['Dráma', 'Vígjáték'],
    moods: ['Könnyed', 'Nosztalgikus'],
    cast: ['Hajdu Bulcsú', 'Sereg Panni'],
    directors: ['Torma Levente'],
    writers: ['Torma Levente'],
    isOriginal: false,
    popularity: 69,
    trendingScore: 150,
    publishedDaysAgo: 400,
    seasons: [8, 8],
  },
  {
    name: 'Sötét Alkony',
    kind: TitleKind.MOVIE,
    tagline: 'A ház csak akkor él, ha valaki fél benne.',
    synopsis:
      'Egy örökölt vidéki ház felújítása közben a család egyre több olyan szobát talál, amely nem szerepel a tervrajzon.',
    releaseYear: 2025,
    maturityRating: MaturityRating.EIGHTEEN_PLUS,
    runtimeMinutes: 99,
    genres: ['Horror', 'Misztikus'],
    moods: ['Sötét tónusú', 'Feszült'],
    cast: ['Vincze Alíz', 'Bogár Tamás'],
    directors: ['Rideg Csenge'],
    writers: ['Rideg Csenge'],
    isOriginal: true,
    popularity: 83,
    trendingScore: 470,
    publishedDaysAgo: 55,
  },
  {
    name: 'Zöld Óra',
    kind: TitleKind.SERIES,
    tagline: 'Egy kert, ami visszabeszél.',
    synopsis:
      'Könnyed sorozat egy közösségi kertről, ahol a veteményes körüli viták mindig a szomszédság nagyobb kérdéseiről szólnak.',
    releaseYear: 2026,
    maturityRating: MaturityRating.SEVEN_PLUS,
    genres: ['Vígjáték', 'Családi'],
    moods: ['Könnyed', 'Szívmelengető'],
    cast: ['Solymosi Kata', 'Béres Andor'],
    directors: ['Kármán Bea'],
    writers: ['Kármán Bea'],
    isOriginal: false,
    popularity: 76,
    trendingScore: 280,
    publishedDaysAgo: 35,
    seasons: [10],
  },
  {
    name: 'Vörös Homok',
    kind: TitleKind.MOVIE,
    tagline: 'A sivatag alatt egy egész város alszik.',
    synopsis:
      'Régészek és egy magánbefektető versenyt fut az idővel egy sivatagi feltárásnál, ahol minden réteg egy újabb hazugságot temet be.',
    releaseYear: 2026,
    maturityRating: MaturityRating.TWELVE_PLUS,
    runtimeMinutes: 127,
    genres: ['Kaland', 'Akció', 'Történelmi'],
    moods: ['Epikus', 'Látványos'],
    cast: ['Radnai Villő', 'Yusuf Karam', 'Balogh Rezső'],
    directors: ['Szalai Tamás'],
    writers: ['Gerő Anna'],
    isOriginal: true,
    popularity: 89,
    trendingScore: 700,
    publishedDaysAgo: 26,
  },
  {
    name: 'Szélcsend',
    kind: TitleKind.SERIES,
    tagline: 'A vihar után jön a nehezebb rész.',
    synopsis:
      'Egy tengerparti kisváros újjáépítése egy pusztító vihar után, ahol a biztosítási ügyintézés lassabb, mint a gyász.',
    releaseYear: 2025,
    maturityRating: MaturityRating.TWELVE_PLUS,
    genres: ['Dráma', 'Családi'],
    moods: ['Szívmelengető', 'Elgondolkodtató'],
    cast: ['Kertész Villő', 'Palkó Sebestyén'],
    directors: ['Rétvári Kata'],
    writers: ['Rétvári Kata'],
    isOriginal: false,
    popularity: 72,
    trendingScore: 230,
    publishedDaysAgo: 150,
    seasons: [8],
  },
  {
    name: 'Fekete Doboz',
    kind: TitleKind.MOVIE,
    tagline: 'A felvétel mindig túléli a gépet.',
    synopsis:
      'Egy légibaleset-vizsgáló utolsó ügyén dolgozik, amikor a rögzítő adatai ellentmondanak minden hivatalos jegyzőkönyvnek.',
    releaseYear: 2026,
    maturityRating: MaturityRating.SIXTEEN_PLUS,
    runtimeMinutes: 115,
    genres: ['Thriller', 'Dráma'],
    moods: ['Feszült', 'Elgondolkodtató'],
    cast: ['Farkas Zsombor', 'Ligeti Dorina'],
    directors: ['Antal Krisztián'],
    writers: ['Antal Krisztián', 'Ligeti Dorina'],
    isOriginal: true,
    popularity: 91,
    trendingScore: 790,
    publishedDaysAgo: 2,
  },
  {
    name: 'Hóhatár',
    kind: TitleKind.SERIES,
    tagline: 'Fent más törvények érvényesek.',
    synopsis:
      'Egy magashegyi menedékház télen ottrekedt vendégei között lassan kiderül, hogy közülük valaki nem véletlenül érkezett.',
    releaseYear: 2024,
    maturityRating: MaturityRating.SIXTEEN_PLUS,
    genres: ['Misztikus', 'Thriller'],
    moods: ['Feszült', 'Sötét tónusú'],
    cast: ['Décsi Roland', 'Bihari Sára'],
    directors: ['Zsigmond Réka'],
    writers: ['Zsigmond Réka'],
    isOriginal: false,
    popularity: 79,
    trendingScore: 260,
    publishedDaysAgo: 220,
    seasons: [6],
  },
  {
    name: 'Napkitörés',
    kind: TitleKind.MOVIE,
    tagline: 'Nyolc perc múlva ideér.',
    synopsis:
      'Egy napfizikus és egy hálózatüzemeltető próbálja megelőzni a kontinens áramellátásának összeomlását, miközben senki sem hiszi el nekik, hogy mennyi idejük van.',
    releaseYear: 2025,
    maturityRating: MaturityRating.TWELVE_PLUS,
    runtimeMinutes: 121,
    genres: ['Sci-Fi', 'Thriller', 'Akció'],
    moods: ['Feszült', 'Látványos'],
    cast: ['Dobos Emese', 'Kővári Ernő'],
    directors: ['Vígh Norbert'],
    writers: ['Vígh Norbert'],
    isOriginal: true,
    popularity: 88,
    trendingScore: 580,
    publishedDaysAgo: 65,
  },
];

/** Deterministic pseudo-random helper so seeded data never changes between runs. */
function pseudoRandom(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1_000_003;
  }
  return min + (hash % Math.max(1, max - min + 1));
}

/**
 * Expands a seed entry into a full `TitleProps` aggregate state.
 *
 * @param seed - Editorial seed entry.
 * @param index - Position in the seed list, used to derive stable identifiers.
 * @param now - Reference instant for the publication date.
 * @returns Aggregate state ready to be handed to `Title.rehydrate`.
 */
function expand(seed: SeedTitle, index: number, now: Date): TitleProps {
  const id = `t-${String(index + 1).padStart(3, '0')}-${slugify(seed.name)}`;
  const slug = slugify(seed.name);

  const seasons = (seed.seasons ?? []).map((episodeCount, seasonIndex) => ({
    id: `${id}-s${seasonIndex + 1}`,
    seasonNumber: seasonIndex + 1,
    name: `${seasonIndex + 1}. évad`,
    episodes: Array.from({ length: episodeCount }, (_unused, episodeIndex) => {
      const episodeId = `${id}-s${seasonIndex + 1}e${episodeIndex + 1}`;
      return {
        id: episodeId,
        seasonNumber: seasonIndex + 1,
        episodeNumber: episodeIndex + 1,
        name: `${episodeIndex + 1}. rész`,
        synopsis: `${seed.name} — ${seasonIndex + 1}. évad ${episodeIndex + 1}. epizód. ${seed.tagline}`,
        durationSeconds: pseudoRandom(episodeId, 38, 58) * 60,
        assetKey: `${slug}/s${seasonIndex + 1}/e${episodeIndex + 1}/master.m3u8`,
      };
    }),
  }));

  return {
    id,
    slug,
    name: seed.name,
    kind: seed.kind,
    tagline: seed.tagline,
    synopsis: seed.synopsis,
    releaseYear: seed.releaseYear,
    maturityRating: seed.maturityRating,
    durationSeconds: seed.runtimeMinutes ? seed.runtimeMinutes * 60 : null,
    genres: seed.genres,
    moods: seed.moods,
    cast: seed.cast,
    directors: seed.directors,
    writers: seed.writers,
    country: 'HU',
    languages: ['hu'],
    subtitleLanguages: ['hu', 'en', 'de'],
    audioLanguages: ['hu', 'en'],
    isOriginal: seed.isOriginal,
    isPublished: true,
    popularity: seed.popularity,
    trendingScore: seed.trendingScore,
    trailerAssetKey: `${slug}/trailer/master.m3u8`,
    assetKey: seed.kind === TitleKind.MOVIE ? `${slug}/feature/master.m3u8` : null,
    publishedAt: new Date(now.getTime() - seed.publishedDaysAgo * 86_400_000),
    seasons,
  };
}

/**
 * Builds the complete seed catalog.
 *
 * @param now - Reference instant; defaults to the current time.
 * @returns Aggregate states for every seeded title.
 */
export function buildSeedCatalog(now: Date = new Date()): TitleProps[] {
  return SEED_TITLES.map((seed, index) => expand(seed, index, now));
}
