import { useEffect, useState } from "react";

export type WatchlistItem = {
  slug: string;
  name: string;
  original_name?: string;
  poster_url?: string;
  thumb_url?: string;
  quality?: string;
  year?: string | number;
  addedAt: number;
};

export type HistoryItem = {
  slug: string;
  name: string;
  original_name?: string;
  poster_url?: string;
  thumb_url?: string;
  quality?: string;
  year?: string | number;
  episodeName?: string;
  episodeUrl?: string;
  serverName?: string;
  updatedAt: number;
};

const WATCHLIST_STORAGE_KEY = "fuucine_watchlist_v1";
const HISTORY_STORAGE_KEY = "fuucine_history_v1";
const STORAGE_EVENT = "fuucine_storage_change";

function notifyChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }
}

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWatchlist(items: WatchlistItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items));
    notifyChange();
  } catch {
    // Storage can be full or disabled in private browsing
  }
}

export function getHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
    notifyChange();
  } catch {
    // Storage can be full or disabled in private browsing
  }
}

export function isMovieInWatchlist(slug?: string): boolean {
  if (!slug) return false;
  const list = getWatchlist();
  return list.some((item) => item.slug.toLowerCase() === slug.toLowerCase());
}

export function toggleWatchlistMovie(movie: {
  slug?: string;
  name?: string;
  original_name?: string;
  poster_url?: string;
  thumb_url?: string;
  quality?: string;
  year?: string | number;
}): boolean {
  if (!movie.slug) return false;
  const list = getWatchlist();
  const existingIndex = list.findIndex(
    (item) => item.slug.toLowerCase() === movie.slug?.toLowerCase(),
  );

  if (existingIndex >= 0) {
    list.splice(existingIndex, 1);
    saveWatchlist(list);
    return false;
  } else {
    const newItem: WatchlistItem = {
      slug: movie.slug,
      name: movie.name?.trim() || movie.original_name?.trim() || "Phim",
      original_name: movie.original_name,
      poster_url: movie.poster_url,
      thumb_url: movie.thumb_url,
      quality: movie.quality,
      year: movie.year,
      addedAt: Date.now(),
    };
    list.unshift(newItem);
    saveWatchlist(list.slice(0, 50));
    return true;
  }
}

export function removeMovieFromWatchlist(slug: string): void {
  const list = getWatchlist().filter(
    (item) => item.slug.toLowerCase() !== slug.toLowerCase(),
  );
  saveWatchlist(list);
}

export function addMovieToHistory(
  movie: {
    slug?: string;
    name?: string;
    original_name?: string;
    poster_url?: string;
    thumb_url?: string;
    quality?: string;
    year?: string | number;
  },
  episode?: {
    name?: string;
    url?: string;
    serverName?: string;
  },
): void {
  if (!movie.slug) return;
  const list = getHistory().filter(
    (item) => item.slug.toLowerCase() !== movie.slug?.toLowerCase(),
  );

  const historyEntry: HistoryItem = {
    slug: movie.slug,
    name: movie.name?.trim() || movie.original_name?.trim() || "Phim",
    original_name: movie.original_name,
    poster_url: movie.poster_url,
    thumb_url: movie.thumb_url,
    quality: movie.quality,
    year: movie.year,
    episodeName: episode?.name,
    episodeUrl: episode?.url,
    serverName: episode?.serverName,
    updatedAt: Date.now(),
  };

  list.unshift(historyEntry);
  saveHistory(list.slice(0, 30));
}

export function removeMovieFromHistory(slug: string): void {
  const list = getHistory().filter(
    (item) => item.slug.toLowerCase() !== slug.toLowerCase(),
  );
  saveHistory(list);
}

export function clearAllHistory(): void {
  saveHistory([]);
}

export function useWatchlistAndHistory() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => getWatchlist());
  const [history, setHistory] = useState<HistoryItem[]>(() => getHistory());

  useEffect(() => {
    const handleSync = () => {
      setWatchlist(getWatchlist());
      setHistory(getHistory());
    };

    window.addEventListener(STORAGE_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(STORAGE_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  return {
    watchlist,
    history,
    isInWatchlist: (slug?: string) =>
      Boolean(
        slug &&
          watchlist.some(
            (item) => item.slug.toLowerCase() === slug.toLowerCase(),
          ),
      ),
    toggleWatchlist: toggleWatchlistMovie,
    removeFromWatchlist: removeMovieFromWatchlist,
    addToHistory: addMovieToHistory,
    removeFromHistory: removeMovieFromHistory,
    clearAllHistory,
  };
}
