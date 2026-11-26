import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Bookmark, ExternalLink, GitCompare, Loader2, Search } from 'lucide-react';
import {
  EXPLORE_QUICK_TOPICS,
  fetchLiveAiGiftRecommendations,
  formatInr,
  GiftItem,
  isSafeHttpUrl,
} from '../data/gifts';
import { GiftImage } from '../components/GiftImage';

interface ExplorePageProps {
  searchQuery: string;
  onChangeSearchQuery: (val: string) => void;
  onInspectGift: (gift: GiftItem) => void;
  onSaveGift: (gift: GiftItem) => void;
  onToggleCompare: (gift: GiftItem) => void;
  savedGiftIds: Set<string>;
  compareIds: Set<string>;
}

export function ExplorePage({
  searchQuery,
  onChangeSearchQuery,
  onInspectGift,
  onSaveGift,
  onToggleCompare,
  savedGiftIds,
  compareIds,
}: ExplorePageProps) {
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'asc' | 'desc'>('featured');
  const [liveGifts, setLiveGifts] = useState<GiftItem[]>([]);
  const [lastSearchedTerm, setLastSearchedTerm] = useState<string | null>(null);
  const [searchingAi, setSearchingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const runLiveSearch = async (queryOverride?: string) => {
    const q = (queryOverride ?? searchQuery).trim();
    if (!q) return;
    if (queryOverride) onChangeSearchQuery(queryOverride);

    setSearchingAi(true);
    setAiError(null);
    try {
      const res = await fetchLiveAiGiftRecommendations({
        searchQuery: q,
        minInr: minPrice ? Number(minPrice) : 300,
        maxInr: maxPrice ? Number(maxPrice) : 50000,
      });
      setLiveGifts(res.recommendations.map((r) => r.gift));
      setLastSearchedTerm(q);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to search live gifts.');
    } finally {
      setSearchingAi(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runLiveSearch();
  };

  const visibleGifts = useMemo(() => {
    const min = minPrice ? Number(minPrice) : 0;
    const max = maxPrice ? Number(maxPrice) : Infinity;
    const list = liveGifts.filter((g) => g.priceInr >= min && g.priceInr <= max);
    if (sortBy === 'asc') return [...list].sort((a, b) => a.priceInr - b.priceInr);
    if (sortBy === 'desc') return [...list].sort((a, b) => b.priceInr - a.priceInr);
    return list;
  }, [liveGifts, minPrice, maxPrice, sortBy]);

  return (
    <div className="py-10 sm:py-16 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <p className="text-xs font-semibold text-ochre-700 tracking-wide">
              giftte Intelligence Explorer
            </p>
            <h1 className="font-display text-3xl sm:text-5xl font-semibold text-[#161B18] tracking-tight">
              Search any gift idea for instant picks
            </h1>
            <p className="text-sm sm:text-base text-[#4B544E] leading-relaxed">
              Enter any product or vibe with optional ₹ INR bounds to generate 10 real gift picks complete with matched product photos.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-[#5D6660] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onChangeSearchQuery(e.target.value)}
                placeholder="e.g., Sony headphones, matcha set..."
                aria-label="Search live gift products"
                className="w-full sm:w-60 min-h-[42px] pl-10 pr-3 py-2 text-xs bg-white/95 border border-pine-900/12 rounded-xl text-[#161B18] placeholder:text-[#7A827D] shadow-sm"
              />
            </div>

            <input
              type="number"
              min={0}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min ₹"
              aria-label="Minimum price in Rupees"
              className="w-24 min-h-[42px] px-3 py-2 text-xs font-mono tabular-nums bg-white/95 border border-pine-900/12 rounded-xl text-[#161B18] shadow-sm"
            />
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max ₹"
              aria-label="Maximum price in Rupees"
              className="w-24 min-h-[42px] px-3 py-2 text-xs font-mono tabular-nums bg-white/95 border border-pine-900/12 rounded-xl text-[#161B18] shadow-sm"
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'featured' | 'asc' | 'desc')}
              aria-label="Sort live results"
              className="min-h-[42px] px-3 py-2 text-xs font-medium bg-white/95 border border-pine-900/12 rounded-xl text-[#161B18] shadow-sm"
            >
              <option value="featured">giftte Ranked</option>
              <option value="asc">Price: Low to High</option>
              <option value="desc">Price: High to Low</option>
            </select>

            <button
              type="submit"
              disabled={searchingAi || !searchQuery.trim()}
              className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-pine-900 text-ivory-50 rounded-xl hover:bg-pine-800 disabled:opacity-50 transition-colors whitespace-nowrap shadow-sm"
            >
              {searchingAi ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-ochre-400" />
                  <span>Searching...</span>
                </>
              ) : (
                <span>Search with giftte Intelligence</span>
              )}
            </button>
          </form>
        </div>

        {/* Quick Topic Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#5D6660] mr-1">Try live search:</span>
          {EXPLORE_QUICK_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              disabled={searchingAi}
              onClick={() => void runLiveSearch(topic)}
              className="min-h-[36px] px-3.5 py-1.5 text-xs font-medium glass-soft rounded-xl text-[#3F4843] hover:bg-white hover:text-pine-900 hover:border-ochre-600/30 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {topic}
            </button>
          ))}
        </div>

        {aiError && (
          <div
            role="alert"
            className="glass-card rounded-2xl p-4 border border-rose-200 bg-rose-50/75 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <p className="text-xs text-rose-800">{aiError}</p>
            <button
              type="button"
              onClick={() => void runLiveSearch()}
              className="min-h-[36px] px-4 py-1.5 text-xs font-semibold bg-rose-900 text-white rounded-full hover:bg-rose-800 whitespace-nowrap self-start sm:self-auto"
            >
              Retry
            </button>
          </div>
        )}

        {searchingAi ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card rounded-3xl overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-ivory-100" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-ivory-100 rounded w-1/2" />
                  <div className="h-5 bg-ivory-100 rounded w-4/5" />
                  <div className="h-3 bg-ivory-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleGifts.length === 0 ? (
          <div className="glass-card rounded-3xl p-10 sm:p-14 text-center space-y-4">
            <h2 className="font-display text-2xl font-semibold text-[#161B18]">
              {lastSearchedTerm
                ? `No live products matched your ₹ filter for "${lastSearchedTerm}"`
                : 'Enter a gift keyword or tap a topic above'}
            </h2>
            <p className="text-sm text-[#4B544E] max-w-lg mx-auto leading-relaxed">
              Every card shown here comes directly from giftte Intelligence with matched product photos and links fetched at runtime.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {lastSearchedTerm && (
              <div className="glass-soft rounded-2xl px-5 py-3 flex items-center justify-between gap-4">
                <span className="text-xs font-medium text-pine-900">
                  Showing {visibleGifts.length} live results for &ldquo;{lastSearchedTerm}&rdquo;
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLiveGifts([]);
                    setLastSearchedTerm(null);
                    onChangeSearchQuery('');
                  }}
                  className="text-xs font-semibold text-ochre-700 hover:text-pine-900"
                >
                  Clear Results
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleGifts.map((gift, idx) => {
                const isSaved = savedGiftIds.has(gift.id);
                const isCompared = compareIds.has(gift.id);
                const productLink = isSafeHttpUrl(gift.productUrl)
                  ? gift.productUrl
                  : isSafeHttpUrl(gift.buySearchUrl)
                    ? gift.buySearchUrl
                    : undefined;

                return (
                  <motion.article
                    key={gift.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(idx * 0.03, 0.2) }}
                    whileHover={{ y: -3 }}
                    className="group glass-card rounded-3xl overflow-hidden flex flex-col justify-between transition-shadow hover:shadow-xl"
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() => onInspectGift(gift)}
                        className="block w-full aspect-[4/3] bg-white overflow-hidden text-left border-b border-pine-900/8"
                      >
                        <GiftImage
                          src={gift.image}
                          alt={gift.name}
                          title={gift.name}
                          fit="contain"
                          className="w-full h-full transition-transform duration-300 group-hover:scale-[1.04]"
                        />
                      </button>

                      <div className="p-5 space-y-2">
                        <div className="flex items-center justify-between gap-2 text-xs text-[#5D6660]">
                          <span className="truncate">
                            {gift.maker} · {gift.shortTag}
                          </span>
                          <span className="font-mono text-sm font-semibold tabular-nums text-pine-900 shrink-0">
                            {formatInr(gift.priceInr)}
                          </span>
                        </div>

                        <h2 className="font-display text-lg font-semibold text-[#161B18] leading-snug">
                          <button
                            type="button"
                            onClick={() => onInspectGift(gift)}
                            className="text-left hover:text-ochre-700 transition-colors"
                          >
                            {gift.name}
                          </button>
                        </h2>

                        <p className="text-xs text-[#4B544E] leading-relaxed line-clamp-2">
                          {gift.tagline}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 pb-5 pt-3 border-t border-pine-900/8 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSaveGift(gift)}
                          className={`min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                            isSaved
                              ? 'bg-pine-50 text-pine-900 border border-pine-900/15'
                              : 'bg-pine-900 text-ivory-50 hover:bg-pine-800'
                          }`}
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>{isSaved ? 'Saved' : 'Save'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleCompare(gift)}
                          className={`min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                            isCompared
                              ? 'text-ochre-700 bg-ochre-100/70'
                              : 'text-[#4B544E] hover:text-pine-900 hover:bg-ivory-100'
                          }`}
                        >
                          <GitCompare className="w-3.5 h-3.5" />
                          <span>{isCompared ? 'Comparing' : 'Compare'}</span>
                        </button>
                      </div>

                      {productLink && (
                        <a
                          href={productLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-ochre-700 hover:underline whitespace-nowrap"
                        >
                          <span>Link</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
