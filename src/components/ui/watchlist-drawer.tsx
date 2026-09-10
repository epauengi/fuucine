import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  Clock,
  Film,
  Heart,
  Info,
  Play,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { HistoryItem, WatchlistItem } from "@/lib/watchlist-store";

interface WatchlistDrawerProps {
  isOpen: boolean;
  activeTab: "watchlist" | "history";
  onTabChange: (tab: "watchlist" | "history") => void;
  onClose: () => void;
  watchlist: WatchlistItem[];
  history: HistoryItem[];
  onSelectMovie: (slug: string) => void;
  onPlayMovie: (slug: string, episodeUrl?: string) => void;
  onRemoveFromWatchlist: (slug: string) => void;
  onRemoveFromHistory: (slug: string) => void;
  onClearHistory: () => void;
}

function formatRelativeTime(timestamp: number) {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return "Vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} ngày trước`;
  return new Date(timestamp).toLocaleDateString("vi-VN");
}

export function WatchlistDrawer({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  watchlist,
  history,
  onSelectMovie,
  onPlayMovie,
  onRemoveFromWatchlist,
  onRemoveFromHistory,
  onClearHistory,
}: WatchlistDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 100);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 bg-[#030305]/80 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Danh sách của tôi"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0B0B10]/95 shadow-[0_0_80px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:max-w-lg"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.2)]">
              <Bookmark className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-extrabold tracking-[-0.015em] text-white">
                Danh sách của tôi
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Lưu trữ trên thiết bị cá nhân
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#A1A1AA] transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
            aria-label="Đóng danh sách"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-white/10 px-6 pt-3">
          <button
            type="button"
            onClick={() => onTabChange("watchlist")}
            className={cn(
              "relative flex items-center gap-2 pb-3 font-display text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]",
              activeTab === "watchlist" ? "text-white" : "text-[#71717A] hover:text-[#A1A1AA]",
            )}
            aria-selected={activeTab === "watchlist"}
            role="tab"
          >
            <Heart className={cn("h-4 w-4", activeTab === "watchlist" && "fill-[#FF0055] text-[#FF0055]")} />
            <span>Yêu thích ({watchlist.length})</span>
            {activeTab === "watchlist" && (
              <motion.div
                layoutId="drawer-tab-indicator"
                className="absolute bottom-0 inset-x-0 h-0.5 bg-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.8)]"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange("history")}
            className={cn(
              "relative ml-6 flex items-center gap-2 pb-3 font-display text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]",
              activeTab === "history" ? "text-white" : "text-[#71717A] hover:text-[#A1A1AA]",
            )}
            aria-selected={activeTab === "history"}
            role="tab"
          >
            <Clock className="h-4 w-4" />
            <span>Xem tiếp ({history.length})</span>
            {activeTab === "history" && (
              <motion.div
                layoutId="drawer-tab-indicator"
                className="absolute bottom-0 inset-x-0 h-0.5 bg-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.8)]"
              />
            )}
          </button>

          {activeTab === "history" && history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="ml-auto text-xs font-semibold text-[#71717A] transition-colors hover:text-[#FF0055] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0055]"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {activeTab === "watchlist" ? (
              <motion.div
                key="tab-watchlist"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {watchlist.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#71717A]">
                      <Heart className="h-8 w-8" />
                    </div>
                    <h3 className="mt-4 font-display text-base font-bold text-white">
                      Chưa có phim yêu thích
                    </h3>
                    <p className="mt-2 max-w-xs text-xs text-[#A1A1AA]">
                      Bấm vào biểu tượng trái tim trên bất kỳ bộ phim nào để lưu vào danh sách xem sau.
                    </p>
                  </div>
                ) : (
                  watchlist.map((item) => (
                    <div
                      key={item.slug}
                      className="group relative flex gap-3.5 rounded-lg border border-white/10 bg-white/[0.03] p-2.5 transition-colors hover:border-[#00F0FF]/40 hover:bg-white/[0.06]"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectMovie(item.slug);
                        }}
                        className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-md bg-[#121216] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                      >
                        <img
                          src={item.thumb_url || item.poster_url}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      </button>

                      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectMovie(item.slug);
                            }}
                            className="text-left font-display text-sm font-bold text-white transition-colors hover:text-[#00F0FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                          >
                            <span className="line-clamp-1">{item.name}</span>
                          </button>
                          <div className="mt-1 flex items-center gap-2 text-xs text-[#A1A1AA]">
                            {item.year && <span>{item.year}</span>}
                            {item.quality && (
                              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                                {item.quality}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onPlayMovie(item.slug);
                            }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#00F0FF] px-3 font-display text-xs font-bold text-[#030305] transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            Xem ngay
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectMovie(item.slug);
                            }}
                            className="inline-flex h-9 items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                          >
                            <Info className="h-3.5 w-3.5" />
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveFromWatchlist(item.slug)}
                            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md text-[#71717A] transition-colors hover:bg-white/10 hover:text-[#FF0055] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0055]"
                            aria-label={`Xóa ${item.name} khỏi yêu thích`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="tab-history"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#71717A]">
                      <Film className="h-8 w-8" />
                    </div>
                    <h3 className="mt-4 font-display text-base font-bold text-white">
                      Chưa có lịch sử xem
                    </h3>
                    <p className="mt-2 max-w-xs text-xs text-[#A1A1AA]">
                      Các phim bạn mở xem sẽ tự động được ghi nhớ tại đây để bạn có thể xem tiếp bất cứ lúc nào.
                    </p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.slug}
                      className="group relative flex gap-3.5 rounded-lg border border-white/10 bg-white/[0.03] p-2.5 transition-colors hover:border-[#00F0FF]/40 hover:bg-white/[0.06]"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onPlayMovie(item.slug, item.episodeUrl);
                        }}
                        className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-md bg-[#121216] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                      >
                        <img
                          src={item.thumb_url || item.poster_url}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      </button>

                      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onPlayMovie(item.slug, item.episodeUrl);
                            }}
                            className="text-left font-display text-sm font-bold text-white transition-colors hover:text-[#00F0FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                          >
                            <span className="line-clamp-1">{item.name}</span>
                          </button>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#A1A1AA]">
                            {item.episodeName && (
                              <span className="font-semibold text-[#7AF7FF]">
                                {item.episodeName}
                              </span>
                            )}
                            <span>·</span>
                            <span>{formatRelativeTime(item.updatedAt)}</span>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onPlayMovie(item.slug, item.episodeUrl);
                            }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#00F0FF] px-3 font-display text-xs font-bold text-[#030305] transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            Xem tiếp
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectMovie(item.slug);
                            }}
                            className="inline-flex h-9 items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                          >
                            <Info className="h-3.5 w-3.5" />
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveFromHistory(item.slug)}
                            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md text-[#71717A] transition-colors hover:bg-white/10 hover:text-[#FF0055] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0055]"
                            aria-label={`Xóa ${item.name} khỏi lịch sử`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </div>
  );
}
