import {
  Info,
  Loader2,
  Menu,
  Pause,
  Play,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type RefObject,
} from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const API_ROOT = "/nguonc-api";
const IMDB_API_ROOT = "/imdb-api";
const IMDB_LOOKUP_ROOT = "/imdb-lookup-api";
const PAGE_TITLE = "FuuCine | Rạp phim tại nhà";
const DISCLAIMER_STORAGE_KEY = "fuucine_demo_disclaimer_acknowledged";

const PLACEHOLDER_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900">
  <rect width="600" height="900" fill="#121216"/>
  <rect x="30" y="30" width="540" height="840" rx="20" fill="#181820" stroke="#2A2A32"/>
  <text x="300" y="430" text-anchor="middle" fill="#A1A1AA" font-family="Be Vietnam Pro, Arial, sans-serif" font-size="34" font-weight="700">FuuCine</text>
  <text x="300" y="480" text-anchor="middle" fill="#52525B" font-family="Be Vietnam Pro, Arial, sans-serif" font-size="22">Poster unavailable</text>
</svg>
`)}`;

type FilmSummary = {
  id?: string | number;
  name?: string;
  slug?: string;
  original_name?: string;
  thumb_url?: string;
  poster_url?: string;
  description?: string;
  year?: string | number;
  time?: string;
  quality?: string;
  language?: string;
  current_episode?: string;
  episode_current?: string;
  total_episodes?: string | number;
  imdb_id?: string;
  imdbId?: string;
  imdb?: string;
};

type FilmCollection = FilmSummary[] | { data?: FilmSummary[] };

type ApiListResponse = {
  status?: boolean | string;
  message?: string;
  items?: FilmCollection;
  movies?: FilmCollection;
  data?: {
    items?: FilmCollection;
    movies?: FilmCollection;
  };
};

type Category = string | { name?: string; slug?: string };
type CategoryGroups = Record<
  string,
  { group?: { name?: string; slug?: string }; list?: Category[] }
>;

type EpisodeItem = {
  name?: string;
  slug?: string;
  filename?: string;
  embed?: string;
  m3u8?: string;
  link_embed?: string;
  link_m3u8?: string;
};

type EpisodeServer = {
  server_name?: string;
  name?: string;
  server_data?: EpisodeItem[];
  items?: EpisodeItem[];
};

type EpisodeWithServer = EpisodeItem & {
  serverName: string;
  episodeIndex: number;
  serverIndex: number;
};

type EpisodeGroup = {
  key: string;
  title: string;
  episodes: EpisodeWithServer[];
};

type FilmDetail = FilmSummary & {
  description?: string;
  content?: string;
  category?: Category[] | CategoryGroups;
  categories?: Category[] | CategoryGroups;
  casts?: string | string[];
  director?: string | string[];
  episodes?: EpisodeServer[];
};

type ApiDetailResponse = {
  movie?: FilmDetail;
  episodes?: EpisodeServer[];
  data?: {
    movie?: FilmDetail;
    episodes?: EpisodeServer[];
  };
};

type ImdbSearchTitle = {
  id?: string;
  titleId?: string;
  primaryTitle?: string;
  originalTitle?: string;
  title?: string;
  startYear?: number;
  year?: number;
};

type ImdbSearchResponse = {
  titles?: ImdbSearchTitle[];
  results?: ImdbSearchTitle[];
  data?: {
    titles?: ImdbSearchTitle[];
    results?: ImdbSearchTitle[];
  };
};

type ImdbTitleResponse = {
  id?: string;
  titleId?: string;
  rating?: {
    aggregateRating?: number;
    voteCount?: number;
  };
};

type ImdbLookupTitle = {
  "#TITLE"?: string;
  "#YEAR"?: number;
  "#IMDB_ID"?: string;
};

type ImdbLookupResponse = {
  ok?: boolean;
  description?: ImdbLookupTitle[];
};

type ImdbRating = {
  id: string;
  value: number;
  voteCount?: number;
};

type RowConfig = {
  id: string;
  title: string;
  endpoints: string[];
};

type BrowseFilters = {
  list: "phim-bo" | "phim-le";
  genre: string;
  year: string;
  country: string;
  imdbSort: "none" | "desc" | "asc";
};

const latestEndpoints = [
  "films/phim-moi-cap-nhat?page=1",
  "films/danh-sach/phim-le?page=1",
  "films/danh-sach/phim-bo?page=1",
];

const defaultBrowseFilters: BrowseFilters = {
  list: "phim-bo",
  genre: "all",
  year: "all",
  country: "all",
  imdbSort: "none",
};

const genreOptions = [
  { label: "Tất cả Thể loại", value: "all" },
  { label: "Hành Động", value: "hanh-dong" },
  { label: "Tình Cảm", value: "tinh-cam" },
  { label: "Hài Hước", value: "hai-huoc" },
  { label: "Cổ Trang", value: "co-trang" },
  { label: "Tâm Lý", value: "tam-ly" },
  { label: "Hình Sự", value: "hinh-su" },
  { label: "Kinh Dị", value: "kinh-di" },
  { label: "Viễn Tưởng", value: "vien-tuong" },
  { label: "Phiêu Lưu", value: "phieu-luu" },
  { label: "Hoạt Hình", value: "hoat-hinh" },
  { label: "Tài Liệu", value: "tai-lieu" },
];

const yearOptions = [
  { label: "Tất cả Năm", value: "all" },
  ...Array.from({ length: 12 }, (_, index) => {
    const year = String(2026 - index);
    return { label: year, value: year };
  }),
];

const countryOptions = [
  { label: "Tất cả Quốc gia", value: "all" },
  { label: "Âu Mỹ", value: "au-my" },
  { label: "Hàn Quốc", value: "han-quoc" },
  { label: "Trung Quốc", value: "trung-quoc" },
  { label: "Nhật Bản", value: "nhat-ban" },
  { label: "Thái Lan", value: "thai-lan" },
  { label: "Việt Nam", value: "viet-nam" },
  { label: "Hồng Kông", value: "hong-kong" },
  { label: "Đài Loan", value: "dai-loan" },
  { label: "Ấn Độ", value: "an-do" },
];

const imdbOptions = [
  { label: "IMDb mặc định", value: "none" },
  { label: "IMDb giảm dần", value: "desc" },
  { label: "IMDb tăng dần", value: "asc" },
];

const rows: RowConfig[] = [
  {
    id: "phim-moi-nhat",
    title: "Phim mới nhất",
    endpoints: latestEndpoints,
  },
  {
    id: "phim-le",
    title: "Phim lẻ",
    endpoints: ["films/danh-sach/phim-le?page=1"],
  },
  {
    id: "phim-bo",
    title: "Phim bộ",
    endpoints: ["films/danh-sach/phim-bo?page=1"],
  },
  {
    id: "hanh-dong",
    title: "Hành động",
    endpoints: ["films/the-loai/hanh-dong?page=1"],
  },
  {
    id: "hoat-hinh",
    title: "Hoạt hình",
    endpoints: ["films/the-loai/hoat-hinh?page=1"],
  },
];

const navItems = [
  { label: "Trang Chủ", href: "#home" },
  { label: "Lọc Phim", href: "#loc-phim" },
  { label: "Phim Mới", href: "#phim-moi-nhat" },
  { label: "Phim Lẻ", href: "#phim-le" },
  { label: "Phim Bộ", href: "#phim-bo" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  const text = await response.text();
  let payload: unknown;

  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    throw new Error("NguonC API did not return JSON");
  }

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.message === "string"
        ? payload.message
        : `Request failed with ${response.status}`;
    throw new Error(message);
  }

  if (
    isRecord(payload) &&
    (payload.status === "error" || payload.status === false)
  ) {
    throw new Error(
      typeof payload.message === "string"
        ? payload.message
        : "NguonC API returned an error",
    );
  }

  return payload as T;
}

function apiUrl(endpoint: string) {
  return `${API_ROOT}/${endpoint.replace(/^\/+/, "")}`;
}

function imdbApiUrl(endpoint: string) {
  return `${IMDB_API_ROOT}/${endpoint.replace(/^\/+/, "")}`;
}

function imdbLookupUrl(endpoint: string) {
  return `${IMDB_LOOKUP_ROOT}/${endpoint.replace(/^\/+/, "")}`;
}

function fallbackKey(endpoints: string[]) {
  return endpoints.map(apiUrl).join("|");
}

async function fetchFirstList(key: string): Promise<ApiListResponse> {
  const urls = key.split("|").filter(Boolean);
  let lastError: unknown;

  for (const url of urls) {
    try {
      const payload = await fetcher<ApiListResponse>(url);

      if (getItems(payload).length > 0) {
        return payload;
      }

      lastError = new Error("NguonC API returned an empty list");
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All NguonC list endpoints failed");
}

function unwrapCollection(collection?: FilmCollection) {
  if (Array.isArray(collection)) {
    return collection;
  }

  if (collection && Array.isArray(collection.data)) {
    return collection.data;
  }

  return [];
}

function getItems(payload?: ApiListResponse) {
  const collections = [
    payload?.items,
    payload?.movies,
    payload?.data?.items,
    payload?.data?.movies,
  ];
  const items = collections.flatMap((collection) =>
    unwrapCollection(collection),
  );

  return items.filter((item) => item.slug);
}

function getMovie(payload?: ApiDetailResponse) {
  return payload?.movie ?? payload?.data?.movie;
}

function getEpisodeServers(payload?: ApiDetailResponse) {
  const movie = getMovie(payload);
  const episodes =
    movie?.episodes ?? payload?.episodes ?? payload?.data?.episodes ?? [];

  return Array.isArray(episodes) ? episodes : [];
}

function getEpisodeItems(server: EpisodeServer) {
  const items = server.server_data ?? server.items ?? [];
  return Array.isArray(items) ? items : [];
}

function getEpisodeUrl(item: EpisodeItem) {
  return item.embed ?? item.link_embed ?? item.m3u8 ?? item.link_m3u8 ?? "";
}

function getEpisodeLabel(episode: EpisodeItem, index: number) {
  return episode.name ?? episode.filename ?? `Tập ${index + 1}`;
}

function stripVietnamese(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function normalizeTitle(value?: string) {
  return stripVietnamese(value ?? "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getFilmYear(film?: FilmSummary | FilmDetail) {
  const year = Number(film?.year);
  return Number.isFinite(year) ? year : undefined;
}

function getKnownImdbId(film?: FilmSummary | FilmDetail) {
  const raw = film?.imdb_id ?? film?.imdbId ?? film?.imdb;
  const match = typeof raw === "string" ? raw.match(/tt\d+/) : null;
  return match?.[0];
}

function getImdbSearchTitles(payload: ImdbSearchResponse) {
  return (
    payload.titles ??
    payload.results ??
    payload.data?.titles ??
    payload.data?.results ??
    []
  );
}

function isImdbLookupTitle(
  title: ImdbSearchTitle | ImdbLookupTitle,
): title is ImdbLookupTitle {
  return "#IMDB_ID" in title || "#TITLE" in title;
}

function pickImdbTitle(
  film: FilmSummary | FilmDetail,
  titles: Array<ImdbSearchTitle | ImdbLookupTitle>,
) {
  const title = normalizeTitle(film.name);
  const originalTitle = normalizeTitle(film.original_name);
  const year = getFilmYear(film);

  return titles
    .filter((item) => getImdbTitleId(item))
    .map((item) => {
      const itemTitle = normalizeTitle(
        isImdbLookupTitle(item)
          ? item["#TITLE"]
          : item.primaryTitle ?? item.title,
      );
      const itemOriginal = normalizeTitle(
        isImdbLookupTitle(item) ? undefined : item.originalTitle,
      );
      const itemYear = isImdbLookupTitle(item)
        ? item["#YEAR"]
        : item.startYear ?? item.year;
      let score = 0;

      if (itemTitle && (itemTitle === title || itemTitle === originalTitle)) {
        score += 6;
      }

      if (
        itemOriginal &&
        (itemOriginal === title || itemOriginal === originalTitle)
      ) {
        score += 5;
      }

      if (year && itemYear && year === itemYear) {
        score += 3;
      }

      return { item, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.item;
}

function getImdbTitleId(title?: ImdbSearchTitle | ImdbLookupTitle) {
  if (!title) {
    return undefined;
  }

  return isImdbLookupTitle(title) ? title["#IMDB_ID"] : title.id ?? title.titleId;
}

async function findImdbId(film: FilmSummary | FilmDetail) {
  const query = film.original_name?.trim() || film.name?.trim();

  if (!query) {
    return undefined;
  }

  try {
    const search = await fetcher<ImdbSearchResponse>(
      imdbApiUrl(`search/titles?query=${encodeURIComponent(query)}`),
    );
    const match = pickImdbTitle(film, getImdbSearchTitles(search));
    const id = getImdbTitleId(match);

    if (id) {
      return id;
    }
  } catch {
    // imdbapi.dev search can be rate-limited; fall back to a lightweight ID lookup.
  }

  try {
    const lookup = await fetcher<ImdbLookupResponse>(
      imdbLookupUrl(`search?q=${encodeURIComponent(query)}`),
    );
    const match = pickImdbTitle(film, lookup.description ?? []);
    return getImdbTitleId(match);
  } catch {
    return undefined;
  }
}

async function fetchImdbRating(film: FilmSummary | FilmDetail) {
  try {
    const knownId = getKnownImdbId(film);
    const imdbId = knownId ?? (await findImdbId(film));

    if (!imdbId) {
      return null;
    }

    const detail = await fetcher<ImdbTitleResponse>(
      imdbApiUrl(`titles/${imdbId}`),
    );
    const value = detail.rating?.aggregateRating;

    if (typeof value !== "number") {
      return null;
    }

    return {
      id: detail.id ?? detail.titleId ?? imdbId,
      value,
      voteCount: detail.rating?.voteCount,
    } satisfies ImdbRating;
  } catch {
    return null;
  }
}

function useImdbRating(film?: FilmSummary | FilmDetail) {
  const title = filmTitle(film);
  const key = film?.slug || film?.id || title;

  return useSWR<ImdbRating | null>(
    film && title !== "FuuCine" ? ["imdb-rating", key, film.original_name] : null,
    () => (film ? fetchImdbRating(film) : Promise.resolve(null)),
    {
      dedupingInterval: 24 * 60 * 60 * 1000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );
}

function getEpisodeSource(serverName: string) {
  const normalized = stripVietnamese(serverName);

  if (normalized.includes("thuyet") || normalized.includes("long tieng")) {
    return { key: "thuyet-minh", title: "Thuyết Minh", order: 2 };
  }

  if (normalized.includes("vietsub") || normalized.includes("sub")) {
    return { key: "vietsub", title: "Vietsub", order: 1 };
  }

  return { key: normalized || "nguon-phat", title: serverName, order: 3 };
}

function groupEpisodesBySource(episodes: EpisodeWithServer[]) {
  const groups = new Map<
    string,
    EpisodeGroup & { order: number; firstServerIndex: number }
  >();

  for (const episode of episodes) {
    const source = getEpisodeSource(episode.serverName);
    const existing = groups.get(source.key);

    if (existing) {
      existing.episodes.push(episode);
    } else {
      groups.set(source.key, {
        key: source.key,
        title: source.title,
        order: source.order,
        firstServerIndex: episode.serverIndex,
        episodes: [episode],
      });
    }
  }

  return Array.from(groups.values())
    .sort(
      (a, b) => a.order - b.order || a.firstServerIndex - b.firstServerIndex,
    )
    .map(({ order: _order, firstServerIndex: _firstServerIndex, ...group }) => ({
      ...group,
      episodes: group.episodes.sort(
        (a, b) =>
          a.serverIndex - b.serverIndex || a.episodeIndex - b.episodeIndex,
      ),
    }));
}

function getEpisodeDisplayNumber(episode: EpisodeWithServer) {
  return episode.episodeIndex + 1;
}

function formatEpisodeGroupSummary(episodes: EpisodeWithServer[]) {
  return groupEpisodesBySource(episodes)
    .map((group) => `${group.episodes.length} ${group.title}`)
    .join(" · ");
}

function flattenEpisodes(servers: EpisodeServer[]) {
  return servers.flatMap((server, serverIndex) =>
    getEpisodeItems(server).map((item, episodeIndex) => ({
      ...item,
      episodeIndex,
      serverIndex,
      serverName: server.server_name ?? server.name ?? "Server",
    })),
  );
}

function getPoster(film?: FilmSummary | FilmDetail) {
  return normalizeImageUrl(film?.poster_url ?? film?.thumb_url);
}

function getThumb(film?: FilmSummary | FilmDetail) {
  return normalizeImageUrl(film?.thumb_url ?? film?.poster_url);
}

function normalizeImageUrl(url?: string) {
  if (!url) {
    return PLACEHOLDER_IMAGE;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (url.startsWith("/")) {
    return `https://phim.nguonc.com${url}`;
  }

  return url;
}

function filmTitle(film?: FilmSummary | FilmDetail) {
  return film?.name?.trim() || film?.original_name?.trim() || "FuuCine";
}

function metaParts(film?: FilmSummary | FilmDetail) {
  return [
    film?.year,
    film?.time,
    film?.quality,
    film?.language,
    film?.episode_current ?? film?.current_episode,
  ]
    .filter(Boolean)
    .map(String);
}

function optionLabel(options: { label: string; value: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? "";
}

function browseEndpoints(filters: BrowseFilters) {
  const hasTaxonomyFilter =
    filters.genre !== "all" || filters.year !== "all" || filters.country !== "all";
  const groups: string[][] = [];

  if (filters.genre !== "all") {
    groups.push([`films/the-loai/${filters.genre}?page=1`]);
  }

  if (filters.year !== "all") {
    groups.push([`films/nam-phat-hanh/${filters.year}?page=1`]);
  }

  if (filters.country !== "all") {
    groups.push([`films/quoc-gia/${filters.country}?page=1`]);
  }

  if (!hasTaxonomyFilter) {
    groups.push([`films/danh-sach/${filters.list}?page=1`]);
  }

  return groups;
}

function pagedEndpoint(endpoint: string, page: number) {
  if (endpoint.includes("page=")) {
    return endpoint.replace(/page=\d+/, `page=${page}`);
  }

  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}page=${page}`;
}

function browseResultsKey(filters: BrowseFilters) {
  const endpointKey = browseEndpoints(filters)
    .map((group) => group.join(","))
    .join("|");

  return `${endpointKey}::list=${filters.list}::imdbSort=${filters.imdbSort}`;
}

async function fetchEndpointGroup(group: string[]) {
  let lastError: unknown;
  const collected = new Map<string, FilmSummary>();

  for (const url of group) {
    for (let page = 1; page <= 12; page += 1) {
      try {
        const items = getItems(
          await fetcher<ApiListResponse>(apiUrl(pagedEndpoint(url, page))),
        );

        for (const item of items) {
          if (item.slug) {
            collected.set(item.slug, item);
          }
        }

        if (items.length === 0) {
          break;
        }
      } catch (error) {
        lastError = error;
        break;
      }
    }
  }

  if (collected.size > 0) {
    return Array.from(collected.values());
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All NguonC list endpoints failed");
}

async function sortByImdb(films: FilmSummary[], imdbSort: BrowseFilters["imdbSort"]) {
  if (imdbSort === "none") {
    return films;
  }

  const ratedFilms = await Promise.all(
    films.map(async (film, index) => ({
      film,
      index,
      rating: await fetchImdbRating(film),
    })),
  );

  return ratedFilms
    .sort((a, b) => {
      const aRating = a.rating?.value;
      const bRating = b.rating?.value;

      if (typeof aRating !== "number" && typeof bRating !== "number") {
        return a.index - b.index;
      }

      if (typeof aRating !== "number") {
        return 1;
      }

      if (typeof bRating !== "number") {
        return -1;
      }

      return imdbSort === "desc" ? bRating - aRating : aRating - bRating;
    })
    .map(({ film }) => film);
}

function isSeriesFilm(film: FilmSummary) {
  const episodes = Number(film.total_episodes);
  const currentEpisode = stripVietnamese(String(film.current_episode ?? film.episode_current ?? ""));
  const time = stripVietnamese(String(film.time ?? ""));

  if (Number.isFinite(episodes) && episodes > 1) {
    return true;
  }

  if (currentEpisode.includes("tap") || currentEpisode.includes("/")) {
    return true;
  }

  return time.includes("/tap");
}

function filterByListType(films: FilmSummary[], list: BrowseFilters["list"]) {
  return films.filter((film) =>
    list === "phim-bo" ? isSeriesFilm(film) : !isSeriesFilm(film),
  );
}

async function fetchBrowseResults(key: string): Promise<FilmSummary[]> {
  const [endpointKey, listPart = "list=phim-bo", imdbPart = "imdbSort=none"] =
    key.split("::");
  const list = listPart.replace(/^list=/, "") as BrowseFilters["list"];
  const imdbSort = imdbPart.replace(/^imdbSort=/, "") as BrowseFilters["imdbSort"];
  const groups = endpointKey
    .split("|")
    .filter(Boolean)
    .map((group) => group.split(",").filter(Boolean));
  const settled = await Promise.allSettled(groups.map(fetchEndpointGroup));
  const lists = settled.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );

  if (!lists.length) {
    throw new Error("Không thể tải dữ liệu bộ lọc");
  }

  if (lists.length <= 1) {
    return sortByImdb(filterByListType(lists[0] ?? [], list), imdbSort);
  }

  const [primary, ...filters] = lists;

  const intersection = primary.filter((film) => {
    const slug = film.slug;

    if (!slug) {
      return false;
    }

    return filters.every((list) => list.some((item) => item.slug === slug));
  });

  return sortByImdb(filterByListType(intersection, list), imdbSort);
}

function browseFilterLabels(filters: BrowseFilters) {
  const parts = [filters.list === "phim-le" ? "Phim Lẻ" : "Phim Bộ"];

  if (filters.genre !== "all") {
    parts.push(optionLabel(genreOptions, filters.genre));
  }

  if (filters.year !== "all") {
    parts.push(filters.year);
  }

  if (filters.country !== "all") {
    parts.push(optionLabel(countryOptions, filters.country));
  }

  if (filters.imdbSort === "desc") {
    parts.push("IMDb giảm dần");
  }

  if (filters.imdbSort === "asc") {
    parts.push("IMDb tăng dần");
  }

  return parts.filter(Boolean);
}

function browseTitle(filters: BrowseFilters) {
  return browseFilterLabels(filters).join(" · ");
}

function toText(html?: string) {
  if (!html) {
    return "";
  }

  if (typeof window === "undefined") {
    return html;
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

function categoryLabels(movie?: FilmDetail) {
  const source = movie?.category ?? movie?.categories ?? [];
  const categories = Array.isArray(source)
    ? source
    : Object.values(source).flatMap((entry) => entry.list ?? []);

  return categories
    .map((category) =>
      typeof category === "string" ? category : category.name ?? category.slug,
    )
    .filter(Boolean)
    .slice(0, 5) as string[];
}

function firstPlayableEpisode(servers: EpisodeServer[]) {
  for (const server of servers) {
    for (const item of getEpisodeItems(server)) {
      const url = getEpisodeUrl(item);
      if (url) {
        return url;
      }
    }
  }

  return "";
}

function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debounced;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function useDialogFocus<T extends HTMLElement, U extends HTMLElement>({
  dialogRef,
  initialFocusRef,
  onClose,
}: {
  dialogRef: RefObject<T>;
  initialFocusRef: RefObject<U>;
  onClose: () => void;
}) {
  useEffect(() => {
    const dialog = dialogRef.current;
    const frame = window.requestAnimationFrame(() => initialFocusRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialog) {
        return;
      }

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => !element.hasAttribute("inert"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dialogRef, initialFocusRef, onClose]);
}

function RetryButton({
  onRetry,
  isRetrying,
}: {
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={isRetrying}
      className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md border border-current/30 px-4 text-sm font-bold transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] disabled:cursor-wait disabled:opacity-60"
    >
      {isRetrying ? "Đang thử lại" : "Thử lại"}
    </button>
  );
}

type DetailsSelection = {
  slug: string;
  morphId?: string;
  selectedEpisodeUrl?: string;
};

type PlayerSelection = {
  slug: string;
  episodeUrl?: string;
  morphId?: string;
  returnTo: DetailsSelection;
};

export default function FuuCine_Root() {
  const backgroundRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [detailsSelection, setDetailsSelection] = useState<DetailsSelection | null>(null);
  const [playerSelection, setPlayerSelection] = useState<PlayerSelection | null>(null);
  const [disclaimerOpen, setDisclaimerOpen] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(DISCLAIMER_STORAGE_KEY) !== "true";
  });
  const [ambientImage, setAmbientImage] = useState(PLACEHOLDER_IMAGE);
  const [draftFilters, setDraftFilters] =
    useState<BrowseFilters>(defaultBrowseFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<BrowseFilters>(defaultBrowseFilters);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const {
    data: latestData,
    error: latestError,
    isLoading: latestLoading,
    isValidating: latestValidating,
    mutate: retryLatest,
  } = useSWR<ApiListResponse>(fallbackKey(latestEndpoints), fetchFirstList);

  const heroFilms = getItems(latestData).slice(0, 5);
  const heroFilm = heroFilms[heroIndex] ?? heroFilms[0];
  const heroDeckFilms = heroFilm
    ? [
        heroFilm,
        ...heroFilms.filter((film) => film.slug !== heroFilm.slug),
      ].slice(0, 5)
    : heroFilms;
  const heroImage = getPoster(heroFilm);
  const overlayOpen =
    searchOpen ||
    disclaimerOpen ||
    Boolean(detailsSelection) ||
    Boolean(playerSelection);

  useEffect(() => {
    document.title = PAGE_TITLE;
  }, []);

  useEffect(() => {
    if (heroImage) {
      setAmbientImage(heroImage);
    }
  }, [heroImage]);

  useEffect(() => {
    setHeroIndex(0);
  }, [latestData]);

  const prefersReducedMotion = useReducedMotion();
  const heroAutoplaying =
    heroFilms.length > 1 && !overlayOpen && !heroPaused && !prefersReducedMotion;

  useEffect(() => {
    if (!heroAutoplaying) {
      return;
    }

    const timer = window.setInterval(() => {
      setHeroIndex((index) => (index + 1) % heroFilms.length);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [heroAutoplaying, heroFilms.length]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = overlayOpen ? "hidden" : previousOverflow;
    backgroundRef.current?.setAttribute("aria-hidden", String(overlayOpen));
    if (backgroundRef.current) {
      backgroundRef.current.inert = overlayOpen;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      backgroundRef.current?.removeAttribute("aria-hidden");
      if (backgroundRef.current) {
        backgroundRef.current.inert = false;
      }
    };
  }, [overlayOpen]);

  const openOverlay = () => {
    if (!openerRef.current && document.activeElement instanceof HTMLElement) {
      openerRef.current = document.activeElement;
    }
  };
  const restoreOpener = () => {
    const opener = openerRef.current;
    openerRef.current = null;
    window.requestAnimationFrame(() => opener?.isConnected && opener.focus());
  };
  const openDetails = (selection: DetailsSelection) => {
    openOverlay();
    setDetailsSelection(selection);
  };
  const openPlayer = ({
    slug,
    episodeUrl,
    morphId,
    returnTo = { slug, morphId, selectedEpisodeUrl: episodeUrl },
  }: Omit<PlayerSelection, "returnTo"> & { returnTo?: DetailsSelection }) => {
    openOverlay();
    setPlayerSelection({ slug, episodeUrl, morphId, returnTo });
  };
  const closeDetails = () => {
    setDetailsSelection(null);
    restoreOpener();
  };
  const closePlayer = (episodeUrl?: string) => {
    if (!playerSelection) {
      return;
    }

    setPlayerSelection(null);
    setDetailsSelection({
      ...playerSelection.returnTo,
      selectedEpisodeUrl: episodeUrl ?? playerSelection.returnTo.selectedEpisodeUrl,
    });
  };
  const handlePreviewEnd = () => setAmbientImage(heroImage || PLACEHOLDER_IMAGE);
  const handleHeroSelect = (slug?: string) => {
    if (!slug) {
      return;
    }

    const nextIndex = heroFilms.findIndex((film) => film.slug === slug);
    if (nextIndex >= 0) {
      setHeroIndex(nextIndex);
    }
  };
  const handleBrowse = () => {
    setAppliedFilters(draftFilters);
    window.setTimeout(() => {
      document
        .getElementById("duyet-phim")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <div className="cinema-shell relative min-h-screen w-full overflow-hidden bg-[#030305] font-body text-[#FAFAFA] transition-colors duration-300">
      <div ref={backgroundRef}>
        <a
          href="#main-content"
          className="skip-link fixed left-4 top-4 z-[100] -translate-y-20 rounded-md bg-[#00F0FF] px-4 py-3 font-bold text-[#030305] transition-transform focus:translate-y-0 focus:outline-none"
        >
          Bỏ qua điều hướng
        </a>
        <AmbientLayer image={ambientImage} />
        <CinematicAtmosphere />
        <div className="theme-readable-mask absolute inset-0 z-10 pointer-events-none" />

        <Navigation
          onOpenSearch={() => {
            openOverlay();
            setSearchOpen(true);
          }}
          onOpenMenuSearch={() => {
            openOverlay();
            setSearchOpen(true);
          }}
        />

        <main id="main-content" className="relative z-20 flex w-full flex-col" tabIndex={-1}>
          <HeroSection
            film={heroFilm}
            films={heroDeckFilms}
            isLoading={latestLoading}
            error={latestError}
            isRetrying={latestValidating}
            onRetry={() => void retryLatest()}
            activeSlug={heroFilm?.slug}
            autoplaying={heroAutoplaying}
            paused={heroPaused}
            onPause={() => setHeroPaused(true)}
            onToggleAutoplay={() => setHeroPaused((paused) => !paused)}
            onSelectFilm={handleHeroSelect}
            onDetails={() =>
              heroFilm?.slug &&
              openDetails({
                slug: heroFilm.slug,
                morphId: `hero-${heroFilm.slug}`,
              })
            }
            onPlay={() =>
              heroFilm?.slug &&
              openPlayer({
                slug: heroFilm.slug,
                morphId: `hero-${heroFilm.slug}`,
              })
            }
          />

        <BrowseFilterPanel
          filters={draftFilters}
          isLoading={browseLoading}
          onChange={setDraftFilters}
          onBrowse={handleBrowse}
        />

          <BrowseResults
            filters={appliedFilters}
            onSelect={(slug, morphId) => openDetails({ slug, morphId })}
            onPlay={(slug, morphId) => openPlayer({ slug, morphId })}
            onPreview={setAmbientImage}
            onPreviewEnd={handlePreviewEnd}
            onLoadingChange={setBrowseLoading}
          />

          <section className="pb-16 pt-2 md:pt-4" aria-label="Danh sách phim">
            {rows.map((row) => (
              <MovieRow
                key={row.id}
                row={row}
                onSelect={(slug, morphId) => openDetails({ slug, morphId })}
                onPlay={(slug, morphId) => openPlayer({ slug, morphId })}
                onPreview={setAmbientImage}
                onPreviewEnd={handlePreviewEnd}
              />
            ))}
          </section>
        </main>
      </div>

      <AnimatePresence>
        {disclaimerOpen ? (
          <DisclaimerModal
            onClose={() => {
              window.localStorage.setItem(DISCLAIMER_STORAGE_KEY, "true");
              setDisclaimerOpen(false);
              restoreOpener();
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {searchOpen ? (
          <SearchOverlay
            onClose={() => {
              setSearchOpen(false);
              restoreOpener();
            }}
            onSelect={(slug, morphId) => {
              setSearchOpen(false);
              openDetails({ slug, morphId });
            }}
            onPlay={(slug, morphId) => {
              setSearchOpen(false);
              openPlayer({ slug, morphId });
            }}
            onPreview={setAmbientImage}
            onPreviewEnd={handlePreviewEnd}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {detailsSelection ? (
          <DetailsModal
            slug={detailsSelection.slug}
            morphId={detailsSelection.morphId}
            initialEpisodeUrl={detailsSelection.selectedEpisodeUrl}
            onClose={closeDetails}
            onPlay={(slug, episodeUrl) => {
              const returnTo = {
                ...detailsSelection,
                selectedEpisodeUrl: episodeUrl,
              };
              setDetailsSelection(null);
              openPlayer({
                slug,
                episodeUrl,
                morphId: detailsSelection.morphId,
                returnTo,
              });
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {playerSelection ? (
          <PlayerModal
            slug={playerSelection.slug}
            initialUrl={playerSelection.episodeUrl}
            morphId={playerSelection.morphId}
            onClose={closePlayer}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function DisclaimerModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  useDialogFocus({ dialogRef, initialFocusRef: confirmRef, onClose });

  return (
    <motion.div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#030305]/88 px-4 py-8 backdrop-blur-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
      aria-describedby="disclaimer-description"
    >
      <motion.div
        className="disclaimer-card relative w-full max-w-2xl overflow-hidden rounded-lg border border-white/10 bg-[#0B0B10]/92 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.72)] md:p-7"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#00F0FF]/25 bg-[#00F0FF]/10 text-[#7AF7FF] shadow-[0_0_28px_rgba(0,240,255,0.18)]">
              <ShieldAlert className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#7AF7FF]">
                Thông báo minh bạch
              </p>
              <h2
                id="disclaimer-title"
                className="mt-2 font-display text-2xl font-extrabold leading-[1.2] tracking-[-0.015em] text-white md:text-3xl"
              >
                FuuCine là project demo giao diện
              </h2>
            </div>
          </div>

          <div id="disclaimer-description" className="space-y-3 text-sm leading-7 text-[#D4D4D8] md:text-base">
            <p>
              FuuCine là project demo được thực hiện bởi{" "}
              <a
                href="https://github.com/epauengi"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-[#7AF7FF] underline decoration-[#00F0FF]/40 underline-offset-4 hover:text-white"
              >
                github.com/epauengi
              </a>
              . Project này chỉ tập trung vào thiết kế, trải nghiệm web và cách
              tích hợp dữ liệu phía client.
            </p>
            <p>
              Các API, hình ảnh, thông tin phim, tập phim, liên kết phát và dữ
              liệu liên quan được lấy từ các nguồn/bên thứ ba như NguonC và IMDb.
              Tôi không sở hữu, lưu trữ, kiểm duyệt hoặc kiểm soát nội dung phim,
              quảng cáo, pop-up hay bất kỳ nội dung nào được chèn từ các nguồn đó.
            </p>
            <p>
              Nếu một nguồn dữ liệu bên thứ ba hiển thị quảng cáo hoặc nội dung
              không phù hợp, điều đó không đại diện cho FuuCine hoặc tác giả
              project. Người dùng vui lòng cân nhắc trước khi tiếp tục sử dụng.
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-[#A1A1AA]">
              Bấm xác nhận để tiếp tục vào trang.
            </p>
            <button
              ref={confirmRef}
              type="button"
              onClick={onClose}
              className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 font-display text-sm font-extrabold text-[#030305] transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] active:scale-[0.98]"
            >
              Tôi đã hiểu
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AmbientLayer({ image }: { image: string }) {
  return (
    <div className="ambient-layer fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#030305]">
      <AnimatePresence mode="wait">
        <motion.img
          key={image}
          src={image}
          alt=""
          className="absolute inset-[-10%] h-[120%] w-[120%] object-cover opacity-30 blur-3xl saturate-110 contrast-110"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        />
      </AnimatePresence>
      <div className="projector-grid absolute inset-0 opacity-20" />
      <div className="projector-sweep absolute -left-1/4 top-0 h-full w-2/3 bg-[linear-gradient(100deg,transparent,rgba(0,240,255,0.08),rgba(255,255,255,0.04),transparent)] blur-2xl" />
      <div className="filmstrip-mask absolute left-0 right-0 top-28 h-3 opacity-10" />
      <div className="filmstrip-mask absolute bottom-20 left-0 right-0 h-3 opacity-[0.06]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_22%_42%,rgba(0,240,255,0.08),transparent_36%)]" />
      <div className="ambient-dim absolute inset-0 bg-[#030305]/[0.76]" />
    </div>
  );
}

function CinematicAtmosphere() {
  return (
    <div className="cinematic-atmosphere fixed inset-0 z-[12] pointer-events-none overflow-hidden">
      <div className="cinema-beam cinema-beam-a" />
      <div className="cinema-beam cinema-beam-b" />
      <div className="premiere-scanline" />
      <div className="lens-iris" />
    </div>
  );
}

function Navigation({
  onOpenSearch,
  onOpenMenuSearch,
}: {
  onOpenSearch: () => void;
  onOpenMenuSearch: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("#home");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const targets = navItems
      .map(({ href }) => document.querySelector<HTMLElement>(href))
      .filter((target): target is HTMLElement => Boolean(target));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActiveHref(`#${visible.target.id}`);
        }
      },
      { rootMargin: "-25% 0px -60%", threshold: [0, 0.15, 0.5] },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-40 transition-all duration-300",
        scrolled
          ? "nav-surface glass-panel border-b border-white/5 py-4"
          : "nav-surface bg-gradient-to-b from-[#030305] to-transparent py-6",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-6 md:px-16">
        <a
          href="#home"
          className="brand-mark font-display text-2xl font-extrabold tracking-[-0.02em] text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          aria-label="FuuCine home"
        >
          FUU<span className="text-[#00F0FF]">CINE</span>
        </a>

        <nav
          className="hidden items-center gap-8 text-sm font-medium text-[#A1A1AA] md:flex"
          aria-label="Primary"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setActiveHref(item.href)}
              aria-current={activeHref === item.href ? "page" : undefined}
              className={cn(
                "nav-link transition-colors hover:text-white focus:outline-none focus-visible:text-white",
                activeHref === item.href
                  ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                  : "",
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          <ThemeToggle className="hidden sm:flex" />
          <button
            type="button"
            onClick={onOpenSearch}
            className="nav-icon-button inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:text-[#00F0FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
            aria-label="Mở tìm kiếm"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="nav-icon-button inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:text-[#00F0FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] md:hidden"
            aria-expanded={menuOpen}
            aria-label="Mở menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="mobile-menu-surface mx-6 mt-4 rounded-lg border border-white/10 bg-[#0F0F14]/95 p-3 shadow-lg shadow-black/30 md:hidden"
          >
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => {
                  setActiveHref(item.href);
                  setMenuOpen(false);
                }}
                aria-current={activeHref === item.href ? "page" : undefined}
                className="block min-h-11 rounded-md px-3 py-3 text-sm font-semibold text-[#D4D4D8] transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 flex items-center justify-between rounded-md px-3 py-3 text-sm font-semibold text-[#D4D4D8]">
              <span>Giao diện</span>
              <ThemeToggle />
            </div>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onOpenMenuSearch();
              }}
              className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-3 text-left text-sm font-semibold text-[#00F0FF] transition-colors hover:bg-[#00F0FF]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
            >
              <Search className="h-4 w-4" />
              Tìm kiếm
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function HeroSection({
  film,
  films,
  isLoading,
  error,
  isRetrying,
  onRetry,
  activeSlug,
  autoplaying,
  paused,
  onPause,
  onToggleAutoplay,
  onSelectFilm,
  onDetails,
  onPlay,
}: {
  film?: FilmSummary;
  films: FilmSummary[];
  isLoading: boolean;
  error?: Error;
  isRetrying: boolean;
  onRetry: () => void;
  activeSlug?: string;
  autoplaying: boolean;
  paused: boolean;
  onPause: () => void;
  onToggleAutoplay: () => void;
  onSelectFilm: (slug?: string) => void;
  onDetails: () => void;
  onPlay: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const meta = metaParts(film);
  const description = toText(film?.description).slice(0, 190);

  return (
    <section
      id="home"
      aria-busy={isLoading || isRetrying}
      onPointerEnter={onPause}
      onFocusCapture={onPause}
      className="relative grid min-h-[100dvh] w-full overflow-hidden px-6 pb-20 pt-32 md:min-h-[760px] md:grid-cols-[minmax(0,1fr)_minmax(340px,520px)] md:items-end md:gap-12 md:px-16 md:pb-24 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,600px)]"
    >
      {film ? (
        <motion.img
          key={film.slug ?? getPoster(film)}
          src={getPoster(film)}
          alt=""
          className="absolute inset-0 z-0 h-full w-full object-cover opacity-42 saturate-[1.15]"
          initial={reduceMotion ? false : { opacity: 0, scale: 1.12 }}
          animate={reduceMotion ? { opacity: 0.42 } : { opacity: 0.42, scale: 1.02 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          onError={(event) => {
            event.currentTarget.src = PLACEHOLDER_IMAGE;
          }}
        />
      ) : (
        <div className="absolute inset-0 z-0 bg-[#111116]" />
      )}
      <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,#030305_0%,rgba(3,3,5,0.92)_34%,rgba(3,3,5,0.56)_68%,rgba(3,3,5,0.82)_100%)]" />
      <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_72%_38%,rgba(0,240,255,0.16),transparent_38%),linear-gradient(to_top,#030305_0%,transparent_42%,rgba(3,3,5,0.86)_100%)]" />
      <div className="absolute bottom-0 left-0 right-0 z-10 h-48 bg-gradient-to-t from-[#030305] to-transparent" />
      <div className="absolute left-6 right-6 top-24 z-20 hidden h-px bg-gradient-to-r from-transparent via-white/18 to-transparent md:block" />

      <div className="relative z-20 flex w-full min-w-0 max-w-[850px] flex-col gap-5 self-end">
        {isLoading ? (
          <HeroSkeleton />
        ) : error ? (
          <div
            role="alert"
            className="state-panel state-panel-error max-w-lg rounded-lg border border-[#FF0055]/25 bg-[#FF0055]/10 p-5 text-sm font-semibold text-[#F4C7D4]"
          >
            <p>Không thể tải phim mới. Vui lòng thử lại.</p>
            <RetryButton onRetry={onRetry} isRetrying={isRetrying} />
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={film?.slug ?? filmTitle(film)}
            className="flex min-w-0 flex-col gap-5"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="flex flex-wrap items-center gap-3"
            >
              <span className="rounded-md border border-[#00F0FF]/[0.35] bg-[#00F0FF]/[0.12] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#7AF7FF] shadow-[0_0_24px_rgba(0,240,255,0.12)]">
                Phim Mới
              </span>
              {film?.quality ? (
                <span className="rounded-md border border-white/[0.12] bg-white/[0.08] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white">
                  {film.quality}
                </span>
              ) : null}
              <ImdbBadge film={film} />
              <span className="hidden h-px w-20 bg-gradient-to-r from-[#00F0FF] to-transparent md:block" />
            </motion.div>

            <motion.h1
              key={film?.slug ?? filmTitle(film)}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="cinema-title line-clamp-3 max-w-[15ch] pb-4 text-balance font-display text-5xl font-extrabold leading-[1.18] tracking-[-0.02em] text-white drop-shadow-2xl md:max-w-[15ch] md:text-6xl xl:text-7xl"
            >
              {filmTitle(film)}
            </motion.h1>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex max-w-full flex-wrap items-center gap-2 text-sm font-medium text-[#D4D4D8]"
            >
              {meta.length ? (
                meta.slice(0, 3).map((part, index) => (
                  <span
                    key={`${part}-${index}`}
                    className={cn(
                      "rounded-md border border-white/[0.08] bg-white/[0.045] px-3 py-1.5",
                      index === 0 ? "text-[#7AF7FF]" : "",
                    )}
                  >
                    {part}
                  </span>
                ))
              ) : (
                <span>Đang cập nhật metadata</span>
              )}
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.44 }}
              className="hero-signal-rail"
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </motion.div>

            {autoplaying ? (
              <div
                key={film?.slug ?? filmTitle(film)}
                className="hero-autoplay-meter"
                aria-hidden="true"
              >
                <span />
              </div>
            ) : null}

            {films.length > 1 ? (
              <div className="flex flex-wrap items-center gap-3">
                <HeroTimeline
                  films={films}
                  activeSlug={activeSlug}
                  onSelect={onSelectFilm}
                />
                <button
                  type="button"
                  onClick={onToggleAutoplay}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-white/15 bg-black/20 px-3 text-sm font-bold text-[#D4D4D8] transition-colors hover:border-[#00F0FF]/45 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                  aria-pressed={!paused}
                >
                  {paused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
                  {paused ? "Tiếp tục" : "Tạm dừng"}
                </button>
              </div>
            ) : null}

            {description ? (
              <motion.p
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.45 }}
                className="text-pretty max-w-[65ch] text-base font-medium leading-8 text-[#D4D4D8] md:text-[1.0625rem]"
              >
                {description}
                {description.length >= 190 ? "..." : ""}
              </motion.p>
            ) : null}

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-3 grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 sm:flex sm:w-auto sm:flex-wrap sm:gap-4"
            >
              <button
                type="button"
                onClick={onPlay}
                disabled={!film?.slug}
                className="group flex min-w-0 items-center justify-center gap-2 rounded-full bg-white px-4 py-4 font-display text-sm font-bold text-[#030305] shadow-[0_0_34px_rgba(255,255,255,0.18)] transition-transform hover:scale-[1.035] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] disabled:pointer-events-none disabled:opacity-50 sm:gap-3 sm:px-8 sm:text-base"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#030305] text-white transition-colors group-hover:bg-[#00F0FF] group-hover:text-[#030305]">
                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                </span>
                Xem Ngay
              </button>
              <button
                type="button"
                onClick={onDetails}
                disabled={!film?.slug}
                className="glass-panel flex min-w-0 items-center justify-center gap-2 rounded-full px-4 py-4 font-display text-sm font-bold text-white transition-colors hover:bg-white/10 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] disabled:pointer-events-none disabled:opacity-50 sm:px-8 sm:text-base"
              >
                <Info className="h-5 w-5" />
                Chi Tiết
              </button>
            </motion.div>
          </motion.div>
          </AnimatePresence>
        )}
        <p className="sr-only" aria-live="polite">
          {isLoading
            ? "Đang tải phim mới"
            : error
              ? "Không thể tải phim mới"
              : autoplaying
                ? "Tự động chuyển phim đang bật"
                : paused
                  ? "Tự động chuyển phim đã tạm dừng"
                  : "Tự động chuyển phim không khả dụng"}
        </p>
      </div>

      <HeroPosterDeck
        key={film?.slug ?? "hero-deck"}
        films={films.length ? films : film ? [film] : []}
        activeKey={film?.slug ?? filmTitle(film)}
        onSelect={onSelectFilm}
      />
    </section>
  );
}

function HeroTimeline({
  films,
  activeSlug,
  onSelect,
}: {
  films: FilmSummary[];
  activeSlug?: string;
  onSelect: (slug?: string) => void;
}) {
  return (
    <div className="hero-timeline flex max-w-full gap-2 overflow-x-auto pb-1">
      {films.slice(0, 5).map((item, index) => {
        const active = item.slug === activeSlug;

        return (
          <button
            key={`${item.slug ?? filmTitle(item)}-${index}`}
            type="button"
            onClick={() => onSelect(item.slug)}
            className={cn(
              "hero-timeline-button group flex min-w-[130px] items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]",
              active
                ? "border-[#00F0FF]/45 bg-[#00F0FF]/12 text-white"
                : "border-white/10 bg-white/[0.035] text-[#A1A1AA] hover:border-white/20 hover:bg-white/[0.07] hover:text-white",
            )}
            aria-pressed={active}
          >
            <span className="font-display text-xs font-extrabold text-[#7AF7FF]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="line-clamp-1 text-xs font-bold">
              {filmTitle(item)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function HeroPosterDeck({
  films,
  activeKey,
  onSelect,
}: {
  films: FilmSummary[];
  activeKey?: string;
  onSelect: (slug?: string) => void;
}) {
  const deck = films.slice(0, 4);

  return (
    <div className="relative z-20 mt-10 hidden min-h-[560px] self-end lg:block">
      <div className="hero-orbit absolute -left-14 -top-8 h-[520px] w-[520px]" aria-hidden="true" />
      <div className="absolute -left-10 top-14 h-[420px] w-px bg-gradient-to-b from-transparent via-[#00F0FF]/[0.55] to-transparent" />
      <div className="absolute left-0 top-0 w-[min(42vw,520px)]">
        {deck.map((item, index) => {
          const offsets = [
            "translate-x-0 translate-y-0 rotate-[-2deg] z-30 opacity-100",
            "translate-x-24 translate-y-12 rotate-[5deg] z-20 opacity-80",
            "translate-x-6 translate-y-28 rotate-[-8deg] z-10 opacity-50",
            "translate-x-36 translate-y-36 rotate-[9deg] z-0 opacity-35",
          ];

          return (
            <motion.button
              key={`${item.slug ?? filmTitle(item)}-${index}`}
              type="button"
              onClick={() => onSelect(item.slug)}
              className={cn(
                "poster-frame hero-deck-card absolute aspect-[2/3] w-[300px] overflow-hidden rounded-lg border border-white/[0.12] bg-[#121216] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]",
                index === 0 ? "hero-deck-card-active" : "",
                offsets[index],
              )}
              initial={{ opacity: 0, y: 34, rotate: 0 }}
              animate={{ opacity: index === 0 ? 1 : undefined, y: 0 }}
              transition={{ duration: 0.65, delay: 0.12 * index }}
            >
              <motion.img
                layoutId={item.slug ? `hero-${item.slug}` : undefined}
                src={getPoster(item)}
                alt={filmTitle(item)}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = PLACEHOLDER_IMAGE;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-white/10" />
            </motion.button>
          );
        })}

        <div className="glass-panel absolute left-10 top-[410px] z-40 w-[360px] rounded-lg p-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#7AF7FF]">
              Now tuning
            </span>
            <span className="h-2 w-2 rounded-full bg-[#FF0055] shadow-[0_0_16px_rgba(255,0,85,0.8)]" />
          </div>
          <div className="space-y-2">
            {deck.slice(0, 3).map((item, index) => (
              <div
                key={`${item.slug ?? filmTitle(item)}-${index}`}
                className={cn(
                  "grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 border-t border-white/[0.08] pt-2 first:border-t-0 first:pt-0",
                  (item.slug ?? filmTitle(item)) === activeKey ? "hero-tuning-active" : "",
                )}
              >
                <span className="font-display text-sm font-bold text-white/[0.45]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="line-clamp-1 text-sm font-semibold text-white">
                  {filmTitle(item)}
                </span>
                <span className="text-xs text-[#A1A1AA]">
                  {item.quality ?? "HD"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="flex max-w-[720px] animate-pulse flex-col gap-5">
      <div className="h-7 w-32 rounded-full bg-white/10" />
      <div className="h-16 w-[74vw] max-w-[640px] rounded bg-white/10 md:h-24" />
      <div className="h-5 w-72 rounded bg-white/10" />
      <div className="mt-3 flex gap-4">
        <div className="h-14 w-40 rounded-full bg-white/15" />
        <div className="h-14 w-40 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

function ImdbBadge({
  film,
  compact = false,
  className,
}: {
  film?: FilmSummary | FilmDetail;
  compact?: boolean;
  className?: string;
}) {
  const { data } = useImdbRating(film);

  if (!data?.value) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-[#F5C518]/30 bg-[#F5C518]/12 font-bold text-[#FFE27A]",
        compact
          ? "px-2 py-1 text-[0.625rem] tracking-[0.08em]"
          : "px-3 py-1.5 text-xs tracking-[0.12em]",
        className,
      )}
      title={
        data.voteCount
          ? `IMDb ${data.value.toFixed(1)} từ ${data.voteCount.toLocaleString("vi-VN")} lượt đánh giá`
          : `IMDb ${data.value.toFixed(1)}`
      }
    >
      <Star className={cn("fill-current", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
      IMDb {data.value.toFixed(1)}
    </span>
  );
}

function BrowseFilterPanel({
  filters,
  isLoading,
  onChange,
  onBrowse,
}: {
  filters: BrowseFilters;
  isLoading: boolean;
  onChange: (filters: BrowseFilters) => void;
  onBrowse: () => void;
}) {
  const setList = (list: BrowseFilters["list"]) => {
    onChange({ ...filters, list });
  };

  return (
    <motion.section
      id="loc-phim"
      className="relative z-50 mx-auto -mt-8 w-full max-w-[1500px] scroll-mt-28 px-4 md:sticky md:top-20 md:-mt-10 md:px-16"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      aria-labelledby="browse-filter-title"
    >
      <div className="filter-console glass-panel rounded-lg p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-3 md:gap-4 xl:flex-row xl:items-end">
          <div className="flex min-w-[160px] items-center gap-3 xl:pb-1">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#00F0FF]/25 bg-[#00F0FF]/10 text-[#7AF7FF]">
              <SlidersHorizontal className="h-5 w-5" />
            </span>
            <h2
              id="browse-filter-title"
              className="font-display text-xl font-extrabold tracking-[-0.015em] text-white"
            >
              Lọc Phim
            </h2>
          </div>

          <div
            className="filter-segment-group grid w-full grid-cols-2 gap-1 rounded-md border border-white/[0.08] bg-black/25 p-1 sm:w-[280px]"
            aria-label="Loại danh sách"
          >
            {[
              { label: "Phim Bộ", value: "phim-bo" },
              { label: "Phim Lẻ", value: "phim-le" },
            ].map((item) => {
              const active = filters.list === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setList(item.value as BrowseFilters["list"])}
                  className={cn(
                    "filter-segment min-h-11 rounded-[7px] px-3 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]",
                    active
                      ? "filter-segment-active bg-white text-[#030305]"
                      : "filter-segment-idle text-[#D4D4D8] hover:bg-white/10 hover:text-white",
                  )}
                  aria-pressed={active}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FilterSelect
              label="Thể loại"
              value={filters.genre}
              options={genreOptions}
              onChange={(genre) =>
                onChange({
                  ...filters,
                  genre,
                })
              }
            />
            <FilterSelect
              label="Năm"
              value={filters.year}
              options={yearOptions}
              onChange={(year) =>
                onChange({
                  ...filters,
                  year,
                })
              }
            />
            <FilterSelect
              label="Quốc gia"
              value={filters.country}
              options={countryOptions}
              onChange={(country) =>
                onChange({
                  ...filters,
                  country,
                })
              }
            />
            <FilterSelect
              label="IMDb"
              value={filters.imdbSort}
              options={imdbOptions}
              onChange={(imdbSort) =>
                onChange({
                  ...filters,
                  imdbSort: imdbSort as BrowseFilters["imdbSort"],
                })
              }
            />
          </div>

          <button
            type="button"
            onClick={onBrowse}
            disabled={isLoading}
            className="filter-submit flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#00F0FF] px-5 font-display text-sm font-extrabold text-[#030305] transition-transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white xl:min-w-[150px] xl:w-auto"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {isLoading ? "Đang duyệt" : "Duyệt phim"}
          </button>
        </div>

        <div className="filter-chip-row mt-4 flex flex-wrap gap-2">
          {browseFilterLabels(filters).map((label) => (
            <span key={label} className="filter-chip">
              {label}
            </span>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  const id = `filter-${stripVietnamese(label).replace(/\s+/g, "-")}`;

  return (
    <div>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="filter-select h-12 w-full rounded-md border border-white/[0.1] bg-[#0B0B10] px-3 text-sm font-bold text-white outline-none transition-colors hover:border-white/25 focus:border-[#00F0FF] focus:ring-2 focus:ring-[#00F0FF]/25"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function BrowseResults({
  filters,
  onSelect,
  onPlay,
  onPreview,
  onPreviewEnd,
  onLoadingChange,
}: {
  filters: BrowseFilters;
  onSelect: (slug: string, morphId?: string) => void;
  onPlay: (slug: string, morphId?: string) => void;
  onPreview: (image: string) => void;
  onPreviewEnd: () => void;
  onLoadingChange: (loading: boolean) => void;
}) {
  const [page, setPage] = useState(1);
  const resultKey = browseResultsKey(filters);
  const { data, error, isLoading, isValidating, mutate } = useSWR<FilmSummary[]>(
    resultKey,
    fetchBrowseResults,
  );
  const films = data ?? [];
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(films.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleFilms = films.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    setPage(1);
  }, [resultKey]);

  useEffect(() => {
    onLoadingChange(isLoading);
  }, [isLoading, onLoadingChange]);

  return (
    <motion.section
      id="duyet-phim"
      className="relative z-20 mx-auto w-full max-w-[1500px] scroll-mt-24 px-4 pb-8 pt-10 md:px-16 md:pb-12 md:pt-14"
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      aria-labelledby="browse-results-title"
      aria-busy={isLoading || isValidating}
    >
      <div className="browse-results-surface row-lane rounded-lg border border-white/[0.08] p-4 md:p-7">
        <div className="mb-7 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#7AF7FF]">Duyệt phim</p>
            <h2
              id="browse-results-title"
              className="mt-1 font-display text-2xl font-extrabold leading-[1.18] tracking-[-0.015em] text-white md:text-3xl"
            >
              {browseTitle(filters)}
            </h2>
          </div>
          <p className="sr-only" aria-live="polite">
            {isLoading ? "Đang tải danh sách phim" : error ? "Không thể tải danh sách phim" : `${films.length} phim`}
          </p>
        </div>

        <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${resultKey}-${currentPage}`}
          className="results-grid grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] justify-items-center gap-x-4 gap-y-8 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:gap-x-6 md:gap-y-10"
          initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(8px)" }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        >
          {isLoading
            ? Array.from({ length: 12 }).map((_, index) => (
                <MovieCardSkeleton key={index} variant="reel" />
              ))
            : null}

          {error ? (
            <div role="alert" className="state-panel state-panel-error col-span-full w-full rounded-lg border border-[#FF0055]/25 bg-[#FF0055]/10 p-5 text-sm font-semibold text-[#F4C7D4]">
              <p>Không thể tải danh sách phim. Vui lòng thử lại.</p>
              <RetryButton onRetry={() => void mutate()} isRetrying={isValidating} />
            </div>
          ) : null}

          {!isLoading && !error && films.length === 0 ? (
            <div role="status" className="state-panel col-span-full w-full rounded-lg border border-white/10 bg-white/[0.04] p-5 text-sm font-semibold text-[#D4D4D8]">
              Chưa có phim phù hợp với bộ lọc này.
            </div>
          ) : null}

          {visibleFilms.map((film, index) => (
            <motion.div
              key={`${film.slug ?? filmTitle(film)}-${index}`}
              className="result-card-motion relative z-10 hover:z-50 focus-within:z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.28,
                delay: Math.min(index * 0.035, 0.22),
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <MovieCard
                film={film}
                morphId={`browse-${resultKey}-${currentPage}-${index}-${film.slug ?? filmTitle(film)}`}
                onSelect={(morphId) => film.slug && onSelect(film.slug, morphId)}
                onPlay={(morphId) => film.slug && onPlay(film.slug, morphId)}
                onPreview={() => onPreview(getPoster(film))}
                onPreviewEnd={onPreviewEnd}
              />
            </motion.div>
          ))}
        </motion.div>
        </AnimatePresence>

        {!isLoading && !error && totalPages > 1 ? (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              className="pagination-button min-h-11 rounded-md border border-white/10 bg-black/20 px-4 text-sm font-bold text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] disabled:pointer-events-none disabled:opacity-40"
            >
              Trước
            </button>
            {Array.from({ length: totalPages }).map((_, index) => {
              const pageNumber = index + 1;
              const visible =
                pageNumber === 1 ||
                pageNumber === totalPages ||
                Math.abs(pageNumber - currentPage) <= 1;

              if (!visible) {
                if (
                  pageNumber === currentPage - 2 ||
                  pageNumber === currentPage + 2
                ) {
                  return (
                    <span
                      key={pageNumber}
                      className="flex min-h-11 min-w-11 items-center justify-center text-sm font-bold text-[#71717A]"
                    >
                      ...
                    </span>
                  );
                }

                return null;
              }

              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  aria-current={pageNumber === currentPage ? "page" : undefined}
                  className={cn(
                    "pagination-button min-h-11 min-w-11 rounded-md border px-3 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]",
                    pageNumber === currentPage
                      ? "pagination-button-active border-[#00F0FF] bg-[#00F0FF]/15 text-white"
                      : "pagination-button-idle border-white/10 bg-black/20 text-[#D4D4D8] hover:bg-white/10 hover:text-white",
                  )}
                >
                  {pageNumber}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
              className="pagination-button min-h-11 rounded-md border border-white/10 bg-black/20 px-4 text-sm font-bold text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] disabled:pointer-events-none disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        ) : null}
      </div>
    </motion.section>
  );
}

function MovieRow({
  row,
  onSelect,
  onPlay,
  onPreview,
  onPreviewEnd,
}: {
  row: RowConfig;
  onSelect: (slug: string, morphId?: string) => void;
  onPlay: (slug: string, morphId?: string) => void;
  onPreview: (image: string) => void;
  onPreviewEnd: () => void;
}) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ApiListResponse>(
    fallbackKey(row.endpoints),
    fetchFirstList,
  );
  const films = getItems(data);
  const rowVariants: Variants = {
    hidden: { opacity: 0, x: 50 },
    show: { opacity: 1, x: 0 },
  };

  return (
    <motion.section
      id={row.id}
      className="relative z-20 w-full py-5 pl-4 md:py-7 md:pl-12 xl:py-8 xl:pl-16"
      variants={rowVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      aria-labelledby={`${row.id}-title`}
      aria-busy={isLoading || isValidating}
    >
      <div className="row-lane rounded-l-lg border border-r-0 border-white/[0.08] py-5 pl-4 shadow-[0_22px_60px_rgba(0,0,0,0.28)] md:py-6 md:pl-6">
      <p className="sr-only" aria-live="polite">
        {isLoading ? `Đang tải ${row.title}` : error ? `Không thể tải ${row.title}` : `${films.length} phim trong ${row.title}`}
      </p>
      <div className="mb-6 flex flex-col gap-3 pr-6 sm:flex-row sm:items-end sm:justify-between md:pr-16">
        <div className="flex items-end gap-3 md:gap-4">
          <span className="hidden font-display text-5xl font-extrabold leading-none tracking-[-0.025em] text-white/[0.055] md:block">
            {String(rows.findIndex((item) => item.id === row.id) + 1).padStart(
              2,
              "0",
            )}
          </span>
        <h2
          id={`${row.id}-title`}
          className="font-display text-2xl font-bold tracking-[-0.015em] text-white md:text-3xl"
        >
          {row.title}
        </h2>
        </div>
      </div>

      <div className="hide-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-5 pr-6 md:gap-6 md:pr-16">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <MovieCardSkeleton key={index} />
          ))
        ) : null}

        {error ? (
          <div role="alert" className="state-panel state-panel-error min-h-[180px] w-full rounded-lg border border-[#FF0055]/25 bg-[#FF0055]/10 p-5 text-sm text-[#F4C7D4]">
            <p>Không thể tải hàng phim này. Vui lòng thử lại.</p>
            <RetryButton onRetry={() => void mutate()} isRetrying={isValidating} />
          </div>
        ) : null}

        {!isLoading && !error && films.length === 0 ? (
          <div role="status" className="state-panel min-h-[180px] w-full rounded-lg border border-white/10 bg-white/[0.04] p-5 text-sm text-[#D4D4D8]">
            Chưa có phim trong danh mục này.
          </div>
        ) : null}

        {films.map((film, index) => (
          <MovieCard
            key={`${film.slug ?? filmTitle(film)}-${index}`}
            film={film}
            morphId={`row-${row.id}-${index}-${film.slug ?? filmTitle(film)}`}
            onSelect={(morphId) => film.slug && onSelect(film.slug, morphId)}
            onPlay={(morphId) => film.slug && onPlay(film.slug, morphId)}
            onPreview={() => onPreview(getPoster(film))}
            onPreviewEnd={onPreviewEnd}
          />
        ))}
      </div>
      </div>
    </motion.section>
  );
}

function MovieCard({
  film,
  morphId,
  isActive = false,
  onSelect,
  onPlay,
  onPreview,
  onPreviewEnd,
}: {
  film: FilmSummary;
  morphId?: string;
  isActive?: boolean;
  onSelect: (morphId?: string) => void;
  onPlay: (morphId?: string) => void;
  onPreview: () => void;
  onPreviewEnd: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) {
      return;
    }

    const rect = cardRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    cardRef.current.style.setProperty("--card-x", `${x}px`);
    cardRef.current.style.setProperty("--card-y", `${y}px`);
    setRotate({
      x: ((y - centerY) / centerY) * -10,
      y: ((x - centerX) / centerX) * 10,
    });
  };

  const beginPreview = () => {
    setIsHovered(true);
    onPreview();
  };
  const clearTilt = () => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
    onPreviewEnd();
  };

  return (
    <div className="snap-start">
      <article
        ref={cardRef}
        onMouseEnter={beginPreview}
        onFocusCapture={beginPreview}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            clearTilt();
          }
        }}
        onMouseLeave={clearTilt}
        onMouseMove={handleMouseMove}
        style={{
          transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale(${isHovered ? 1.05 : 1})`,
          transition: isHovered
            ? "none"
            : "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        className={cn(
          "movie-card-spotlight group relative z-10 aspect-[2/3] w-[160px] shrink-0 rounded-lg bg-white/[0.035] p-px text-left will-change-transform hover:z-30 focus-within:z-30 md:w-[220px]",
          isActive ? "movie-card-active" : "",
        )}
      >
        <div
          className={cn(
            "absolute -inset-2 rounded-lg bg-[#00F0FF] blur-2xl transition-opacity duration-300",
            isHovered ? "opacity-28" : "opacity-0",
          )}
        />
        <motion.img
          layoutId={morphId}
          src={getThumb(film)}
          className="absolute inset-px h-[calc(100%-2px)] w-[calc(100%-2px)] rounded-lg object-cover shadow-lg shadow-black/40"
          alt={filmTitle(film)}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = PLACEHOLDER_IMAGE;
          }}
        />
        <button
          type="button"
          onClick={() => onSelect(morphId)}
          className="absolute inset-0 z-[3] rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          aria-label={`Xem chi tiết ${filmTitle(film)}`}
        />
        <div className="pointer-events-none absolute left-2 top-2 z-[4] rounded-md border border-black/25 bg-black/[0.45] px-2 py-1 text-[0.625rem] font-bold uppercase tracking-[0.12em] text-white backdrop-blur">
          {film.quality ?? "HD"}
        </div>
        <ImdbBadge
          film={film}
          compact
          className="pointer-events-none absolute right-2 top-2 z-[4] bg-black/[0.55] backdrop-blur"
        />
        <div className="pointer-events-none absolute inset-x-px bottom-px z-[4] rounded-b-lg bg-gradient-to-t from-black via-black/[0.72] to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white md:text-[0.9375rem]">
            {filmTitle(film)}
          </h3>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="line-clamp-1 text-xs text-[#D4D4D8]">
              {metaParts(film).slice(0, 2).join(" / ") || "FuuCine"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onPlay(morphId)}
          className="card-play-button absolute bottom-3 right-3 z-[5] inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#030305] shadow-lg shadow-black/30 transition-transform hover:scale-110 focus:outline-none focus-visible:scale-110 focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          aria-label={`Xem ngay ${filmTitle(film)}`}
        >
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </button>
      </article>
    </div>
  );
}

function MovieCardSkeleton({ variant = "default" }: { variant?: "default" | "reel" }) {
  return (
    <div
      className={cn(
        "movie-card-skeleton aspect-[2/3] w-[160px] shrink-0 snap-start overflow-hidden rounded-lg bg-white/10 md:w-[220px]",
        variant === "reel" ? "movie-card-skeleton-reel" : "animate-pulse",
      )}
    >
      {variant === "reel" ? (
        <>
          <span />
          <span />
          <span />
        </>
      ) : null}
    </div>
  );
}

function SearchOverlay({
  onClose,
  onSelect,
  onPlay,
  onPreview,
  onPreviewEnd,
}: {
  onClose: () => void;
  onSelect: (slug: string, morphId?: string) => void;
  onPlay: (slug: string, morphId?: string) => void;
  onPreview: (image: string) => void;
  onPreviewEnd: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword.trim(), 350);
  const shouldSearch = debouncedKeyword.length >= 2;
  const searchUrl = shouldSearch
    ? apiUrl(`films/search?keyword=${encodeURIComponent(debouncedKeyword)}`)
    : null;
  const { data, error, isLoading, isValidating, mutate } = useSWR<ApiListResponse>(searchUrl, fetcher);
  const results = getItems(data);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFilm = results[activeIndex] ?? results[0];
  const activeMorphId = activeFilm
    ? `search-${activeIndex}-${activeFilm.slug ?? filmTitle(activeFilm)}`
    : undefined;
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useDialogFocus({ dialogRef, initialFocusRef: inputRef, onClose });

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedKeyword]);

  useEffect(() => {
    if (activeIndex > Math.max(results.length - 1, 0)) {
      setActiveIndex(0);
    }
  }, [activeIndex, results.length]);

  useEffect(() => {
    if (activeFilm) {
      onPreview(getPoster(activeFilm));
    }

    return onPreviewEnd;
  }, [activeFilm, onPreview, onPreviewEnd]);

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!results.length) {
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    }

    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    }

    if (event.key === "Enter" && activeFilm?.slug) {
      event.preventDefault();
      onSelect(activeFilm.slug, activeMorphId);
    }
  };

  return (
    <motion.div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 overflow-y-auto bg-[#030305]/95 p-4 backdrop-blur-2xl md:p-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm phim"
      aria-busy={isLoading || isValidating}
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="font-display text-xl font-extrabold tracking-[-0.02em] text-white">
            FUU<span className="text-[#00F0FF]">CINE</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:text-[#FF0055] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
            aria-label="Đóng tìm kiếm"
          >
            <X className="h-8 w-8" />
          </button>
        </div>

        <label className="sr-only" htmlFor="search-input">
          Tìm kiếm phim
        </label>
        <input
          ref={inputRef}
          id="search-input"
          type="text"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Tìm kiếm phim, đạo diễn, diễn viên..."
          className="w-full border-b-2 border-[#3F3F46] bg-transparent py-4 font-display text-3xl font-bold leading-[1.18] tracking-[-0.015em] text-white outline-none transition-colors placeholder:text-[#71717A] focus:border-[#00F0FF] md:text-5xl"
        />

        <div className="mt-8 min-h-8 text-sm font-medium text-[#A1A1AA]" aria-live="polite">
          {isLoading ? (
            <span className="inline-flex items-center gap-2 text-[#00F0FF]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tìm kiếm
            </span>
          ) : null}
          {!keyword.trim() ? "Nhập ít nhất 2 ký tự để tìm phim." : null}
          {keyword.trim().length === 1 ? "Thêm 1 ký tự nữa để bắt đầu." : null}
          {shouldSearch && !isLoading && !error
            ? `${results.length} kết quả`
            : null}
        </div>

        <div className="search-actions-row mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#A1A1AA]">
          <span>↑↓ chọn phim</span>
          <span>Enter mở chi tiết</span>
          <span>Esc đóng</span>
        </div>

        {error ? (
          <div role="alert" className="state-panel state-panel-error mt-8 rounded-lg border border-[#FF0055]/25 bg-[#FF0055]/10 p-5 text-sm text-[#F4C7D4]">
            <p>Không thể tìm kiếm lúc này. Vui lòng thử lại.</p>
            <RetryButton onRetry={() => void mutate()} isRetrying={isValidating} />
          </div>
        ) : null}

        <div className="search-command-grid mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 xl:grid-cols-5">
            {isLoading
              ? Array.from({ length: 12 }).map((_, index) => (
                  <div
                    key={index}
                    className="search-card-skeleton aspect-[2/3] animate-pulse rounded-lg bg-white/10"
                  />
                ))
              : null}

            {!isLoading && shouldSearch && results.length === 0 && !error ? (
              <div role="status" className="state-panel col-span-full rounded-lg border border-white/10 bg-white/[0.04] p-6 text-[#D4D4D8]">
                Không có phim nào khớp với từ khóa này.
              </div>
            ) : null}

            {results.map((film, index) => {
              const morphId = `search-${index}-${film.slug ?? filmTitle(film)}`;

              return (
                <motion.div
                  key={`${film.slug ?? filmTitle(film)}-${index}`}
                  className="search-result-shell"
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocusCapture={() => setActiveIndex(index)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.22,
                    delay: Math.min(index * 0.025, 0.2),
                  }}
                >
                  <MovieCard
                    film={film}
                    morphId={morphId}
                    isActive={index === activeIndex}
                    onSelect={(selectedMorphId) =>
                      film.slug && onSelect(film.slug, selectedMorphId)
                    }
                    onPlay={(selectedMorphId) =>
                      film.slug && onPlay(film.slug, selectedMorphId)
                    }
                    onPreview={() => onPreview(getPoster(film))}
                    onPreviewEnd={onPreviewEnd}
                  />
                </motion.div>
              );
            })}
          </div>

          <div className="search-preview-panel sticky top-8 hidden h-fit overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] p-4 lg:block">
            <AnimatePresence mode="wait">
              {activeFilm ? (
                <motion.div
                  key={activeFilm.slug ?? filmTitle(activeFilm)}
                  initial={{ opacity: 0, x: 18, filter: "blur(8px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -12, filter: "blur(8px)" }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-white/10">
                    <img
                      src={getPoster(activeFilm)}
                      alt={filmTitle(activeFilm)}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src = PLACEHOLDER_IMAGE;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.14em] text-[#7AF7FF]">
                        Đang chọn
                      </p>
                      <h2 className="mt-2 line-clamp-2 font-display text-2xl font-extrabold leading-[1.16] tracking-[-0.018em] text-white">
                        {filmTitle(activeFilm)}
                      </h2>
                      <p className="mt-2 line-clamp-1 text-sm font-semibold text-[#D4D4D8]">
                        {metaParts(activeFilm).slice(0, 3).join(" / ") ||
                          "FuuCine"}
                      </p>
                      <div className="mt-3">
                        <ImdbBadge film={activeFilm} compact />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        activeFilm.slug && onPlay(activeFilm.slug, activeMorphId)
                      }
                      className="flex h-12 items-center justify-center gap-2 rounded-full bg-white font-display text-sm font-extrabold text-[#030305] transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] active:scale-[0.98]"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      Xem ngay
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        activeFilm.slug && onSelect(activeFilm.slug, activeMorphId)
                      }
                      className="flex h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.06] font-display text-sm font-extrabold text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] active:scale-[0.98]"
                    >
                      <Info className="h-4 w-4" />
                      Chi tiết
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DetailsModal({
  slug,
  morphId,
  initialEpisodeUrl,
  onClose,
  onPlay,
}: {
  slug: string;
  morphId?: string;
  initialEpisodeUrl?: string;
  onClose: () => void;
  onPlay: (slug: string, episodeUrl?: string) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [selectedEpisodeUrl, setSelectedEpisodeUrl] = useState<string | null>(
    initialEpisodeUrl ?? null,
  );
  const { data, error, isLoading, isValidating, mutate } = useSWR<ApiDetailResponse>(
    apiUrl(`film/${slug}`),
    fetcher,
  );
  const movie = getMovie(data);
  const servers = getEpisodeServers(data);
  const episodes = useMemo(() => flattenEpisodes(servers), [servers]);
  const firstEpisodeUrl = firstPlayableEpisode(servers);
  const activeEpisodeUrl = selectedEpisodeUrl ?? firstEpisodeUrl;
  const description = toText(movie?.description ?? movie?.content);
  const categories = categoryLabels(movie);

  useDialogFocus({ dialogRef, initialFocusRef: closeRef, onClose });

  useEffect(() => {
    setSelectedEpisodeUrl(initialEpisodeUrl ?? null);
  }, [initialEpisodeUrl, slug]);

  return (
    <motion.div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[55] overflow-y-auto bg-[#030305]/95 p-4 backdrop-blur-xl md:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết phim"
      aria-busy={isLoading || isValidating}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        className="fixed right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:text-[#FF0055] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] md:right-6 md:top-6"
        aria-label="Đóng chi tiết"
      >
        <X className="h-8 w-8" />
      </button>

      <div className="mx-auto grid min-h-[calc(100dvh-48px)] max-w-[1360px] items-center gap-8 pt-12 md:grid-cols-[minmax(260px,380px)_1fr] md:gap-12 md:pt-0">
        {isLoading ? (
          <DetailsSkeleton />
        ) : null}

        {error ? (
          <div role="alert" className="state-panel state-panel-error md:col-span-2 rounded-lg border border-[#FF0055]/25 bg-[#FF0055]/10 p-6 text-[#F4C7D4]">
            <p>Không thể tải chi tiết phim. Vui lòng thử lại.</p>
            <RetryButton onRetry={() => void mutate()} isRetrying={isValidating} />
          </div>
        ) : null}

        {movie ? (
          <>
            <motion.div
              layoutId={morphId}
              className="detail-poster-stage relative mx-auto aspect-[2/3] w-full max-w-[380px] overflow-hidden rounded-lg border border-white/10 shadow-lg shadow-black/40"
            >
              <img
                src={getPoster(movie)}
                alt={filmTitle(movie)}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = PLACEHOLDER_IMAGE;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            </motion.div>

            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#00F0FF]">
                  <Sparkles className="h-3.5 w-3.5" />
                  FuuCine Pick
                </span>
                <ImdbBadge film={movie} className="rounded-full" />
                {categories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-[#D4D4D8]"
                  >
                    {category}
                  </span>
                ))}
              </div>

              <h2 className="text-balance font-display text-4xl font-extrabold leading-[1.16] tracking-[-0.022em] text-white md:text-5xl">
                {filmTitle(movie)}
              </h2>

              {movie.original_name && movie.original_name !== movie.name ? (
                <p className="mt-3 text-lg text-[#A1A1AA]">
                  {movie.original_name}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3 text-sm font-medium text-[#A1A1AA]">
                {metaParts(movie).map((part, index) => (
                  <span
                    key={`${part}-${index}`}
                    className="rounded-full bg-white/5 px-3 py-1"
                  >
                    {part}
                  </span>
                ))}
              </div>

              {description ? (
                <p className="text-pretty mt-6 max-w-[70ch] text-base font-medium leading-8 text-[#D4D4D8]">
                  {description}
                </p>
              ) : null}

              {episodes.length ? (
                <EpisodePicker
                  episodes={episodes}
                  activeUrl={activeEpisodeUrl}
                  onSelect={(url) => {
                    setSelectedEpisodeUrl(url);
                    onPlay(slug, url);
                  }}
                  className="mt-8"
                />
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </motion.div>
  );
}

function DetailsSkeleton() {
  return (
    <>
      <div className="mx-auto aspect-[2/3] w-full max-w-[380px] animate-pulse rounded-lg bg-white/10" />
      <div className="flex max-w-3xl animate-pulse flex-col gap-5">
        <div className="h-7 w-36 rounded-full bg-white/10" />
        <div className="h-16 w-full rounded bg-white/10 md:h-24" />
        <div className="h-5 w-2/3 rounded bg-white/10" />
        <div className="h-28 w-full rounded bg-white/10" />
        <div className="flex gap-4">
          <div className="h-12 w-36 rounded-full bg-white/15" />
          <div className="h-12 w-32 rounded-full bg-white/10" />
        </div>
      </div>
    </>
  );
}

function EpisodePicker({
  episodes,
  activeUrl,
  onSelect,
  className,
}: {
  episodes: EpisodeWithServer[];
  activeUrl: string;
  onSelect: (url: string) => void;
  className?: string;
}) {
  if (!episodes.length) {
    return null;
  }

  const groups = groupEpisodesBySource(episodes);
  const summary = formatEpisodeGroupSummary(episodes);

  return (
    <section
      className={cn(
        "rounded-lg border border-white/[0.08] bg-white/[0.045] p-4",
        className,
      )}
      aria-label="Chọn tập phim"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-bold text-white">
          Chọn tập phim
        </h3>
        <p className="text-right text-xs font-semibold text-[#A1A1AA]">{summary}</p>
      </div>

      <div className="max-h-72 space-y-5 overflow-y-auto pr-1">
        {groups.map((group) => (
          <div key={group.key}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-white">{group.title}</h4>
              <span className="text-xs font-semibold text-[#A1A1AA]">
                {group.episodes.length} tập
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-10">
              {group.episodes.map((episode, index) => {
                const url = getEpisodeUrl(episode);
                const active = Boolean(url && url === activeUrl);
                const label = String(index + 1);

                return (
                  <button
                    key={`${episode.serverName}-${episode.slug ?? index}-${episode.serverIndex}`}
                    type="button"
                    onClick={() => url && onSelect(url)}
                    disabled={!url}
                    aria-label={`${group.title} tập ${label}`}
                    aria-pressed={active}
                    className={cn(
                      "flex h-11 items-center justify-center rounded-md border text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] disabled:cursor-not-allowed disabled:opacity-40",
                      active
                        ? "border-[#00F0FF] bg-[#00F0FF]/15 text-white"
                        : "border-white/10 bg-black/20 text-[#D4D4D8] hover:border-white/25 hover:bg-white/10",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlayerModal({
  slug,
  initialUrl,
  morphId,
  onClose,
}: {
  slug: string;
  initialUrl?: string;
  morphId?: string;
  onClose: (episodeUrl?: string) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const { data, error, isLoading, isValidating, mutate } = useSWR<ApiDetailResponse>(
    apiUrl(`film/${slug}`),
    fetcher,
  );
  const movie = getMovie(data);
  const servers = getEpisodeServers(data);
  const episodes = useMemo(() => flattenEpisodes(servers), [servers]);
  const firstEmbedUrl = firstPlayableEpisode(servers);
  const embedUrl = selectedUrl ?? firstEmbedUrl;
  const activeEpisode = episodes.find(
    (episode) => getEpisodeUrl(episode) === embedUrl,
  );

  const closePlayer = () => onClose(selectedUrl ?? embedUrl);
  useDialogFocus({ dialogRef, initialFocusRef: closeRef, onClose: closePlayer });

  useEffect(() => {
    setSelectedUrl(initialUrl ?? null);
  }, [initialUrl, slug]);

  return (
    <motion.div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[60] flex flex-col bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-modal="true"
      aria-label="Trình phát phim"
      aria-busy={isLoading || isValidating}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={closePlayer}
        className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:text-[#FF0055] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] md:right-6 md:top-6"
        aria-label="Đóng trình phát"
      >
        <X className="h-8 w-8" />
      </button>

      <div className="relative flex h-[42dvh] min-h-[220px] w-full items-center justify-center bg-[#030305] md:h-[62dvh]">
        {movie && morphId ? (
          <motion.img
            layoutId={morphId}
            src={getPoster(movie)}
            alt=""
            className="player-morph-poster pointer-events-none absolute z-20 h-[78%] max-h-[560px] rounded-lg object-cover"
            initial={{ opacity: 1, scale: 0.92, filter: "blur(0px)" }}
            animate={{ opacity: 0, scale: 1.08, filter: "blur(16px)" }}
            transition={{
              opacity: { delay: 0.42, duration: 0.34 },
              scale: { duration: 0.78, ease: [0.16, 1, 0.3, 1] },
              filter: { delay: 0.3, duration: 0.36 },
            }}
            onError={(event) => {
              event.currentTarget.src = PLACEHOLDER_IMAGE;
            }}
          />
        ) : null}

        {isLoading ? (
          <div className="inline-flex items-center gap-3 text-[#00F0FF]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang tải trình phát
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="state-panel state-panel-error max-w-md rounded-lg border border-[#FF0055]/25 bg-[#FF0055]/10 p-5 text-center text-sm text-[#F4C7D4]">
            <p>Không thể tải nguồn phát. Vui lòng thử lại.</p>
            <RetryButton onRetry={() => void mutate()} isRetrying={isValidating} />
          </div>
        ) : null}

        {!isLoading && !error && embedUrl ? (
          <iframe
            key={embedUrl}
            src={embedUrl}
            className="h-full w-full border-none"
            title={movie ? `Xem ${filmTitle(movie)}` : "FuuCine player"}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
          />
        ) : null}

        {!isLoading && !error && !embedUrl ? (
          <div className="max-w-md rounded-lg border border-white/10 bg-white/[0.04] p-5 text-center text-sm text-[#D4D4D8]">
            Phim này chưa có link phát khả dụng.
          </div>
        ) : null}

        {movie ? (
          <div className="player-now-overlay pointer-events-none absolute bottom-4 left-4 right-4 z-10 flex flex-col gap-1 rounded-lg border border-white/10 bg-black/55 p-3 text-white backdrop-blur-xl md:left-6 md:right-auto md:min-w-[360px] md:max-w-[520px]">
            <span className="text-[0.625rem] font-extrabold uppercase tracking-[0.14em] text-[#7AF7FF]">
              FuuCine đang phát
            </span>
            <span className="line-clamp-1 text-sm font-extrabold md:text-base">
              {filmTitle(movie)}
            </span>
            {activeEpisode ? (
              <span className="line-clamp-1 text-xs font-semibold text-[#D4D4D8]">
                {getEpisodeSource(activeEpisode.serverName).title} · Tập{" "}
                {getEpisodeDisplayNumber(activeEpisode)}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {activeEpisode ? (
        <div className="border-t border-white/10 bg-[#08080B] px-6 py-3 text-white md:px-8">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[#7AF7FF]">
            Đang xem
          </p>
          <p className="mt-1 line-clamp-1 text-sm font-semibold">
            {getEpisodeSource(activeEpisode.serverName).title} · Tập{" "}
            {getEpisodeDisplayNumber(activeEpisode)}
          </p>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold leading-[1.18] tracking-[-0.018em] text-white">
                {movie ? filmTitle(movie) : "FuuCine"}
              </h2>
              <p className="mt-2 text-sm text-[#A1A1AA]">
                {movie ? metaParts(movie).join(" / ") : "Nguồn phát đang tải"}
              </p>
            </div>
            {episodes.length ? (
              <p className="text-sm font-semibold text-[#00F0FF]">
                {formatEpisodeGroupSummary(episodes)}
              </p>
            ) : null}
          </div>

          {episodes.length ? (
            <EpisodePicker
              episodes={episodes}
              activeUrl={embedUrl}
              onSelect={setSelectedUrl}
              className="mt-8"
            />
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
