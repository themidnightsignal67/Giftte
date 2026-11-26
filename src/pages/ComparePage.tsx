import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Bookmark, ExternalLink, X } from 'lucide-react';
import { formatInr, GiftItem, isSafeHttpUrl } from '../data/gifts';
import { GiftImage } from '../components/GiftImage';
import { AppPage } from './HomePage';

type PriorityMetric = 'utility' | 'keepsake' | 'unwrap';

interface ComparePageProps {
  compareGifts: GiftItem[];
  onRemoveCompare: (giftId: string) => void;
  onNavigate: (page: AppPage) => void;
  onSaveGift: (gift: GiftItem) => void;
  onInspectGift: (gift: GiftItem) => void;
  savedGiftIds: Set<string>;
}

export function ComparePage({
  compareGifts,
  onRemoveCompare,
  onNavigate,
  onSaveGift,
  onInspectGift,
  savedGiftIds,
}: ComparePageProps) {
  const [priority, setPriority] = useState<PriorityMetric>('utility');

  const winnerId = useMemo(() => {
    if (compareGifts.length === 0) return null;
    const sorted = [...compareGifts].sort((a, b) => {
      if (priority === 'utility') return b.utilityScore - a.utilityScore;
      if (priority === 'keepsake') return b.keepsakeScore - a.keepsakeScore;
      return b.unwrapScore - a.unwrapScore;
    });
    return sorted[0].id;
  }, [compareGifts, priority]);

  return (
    <div className="py-10 sm:py-16 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <p className="text-xs font-semibold text-ochre-700 tracking-wide">
              Side-by-Side Comparison
            </p>
            <h1 className="font-display text-3xl sm:text-5xl font-semibold text-[#161B18] tracking-tight">
              Settle the tie between your finalists
            </h1>
            <p className="text-sm sm:text-base text-[#4B544E] leading-relaxed">
              Compare up to three giftte Intelligence picks side by side across ₹ INR price, daily utility, keepsake longevity, and unwrap impression.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 glass-soft rounded-2xl self-start md:self-auto">
            {(
              [
                { id: 'utility', label: 'Daily Use' },
                { id: 'keepsake', label: 'Keepsake' },
                { id: 'unwrap', label: 'Unwrap Moment' },
              ] as const
            ).map((opt) => {
              const active = priority === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPriority(opt.id)}
                  className={`relative min-h-[36px] px-3.5 py-1.5 text-xs font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                    active ? 'text-pine-900 font-semibold' : 'text-[#4B544E] hover:text-pine-900'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="compare-priority-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 bg-white rounded-xl shadow-sm border border-pine-900/10"
                    />
                  )}
                  <span className="relative z-10">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {compareGifts.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <h2 className="font-display text-2xl font-semibold text-[#161B18]">
                Your comparison board is empty
              </h2>
              <p className="text-sm text-[#4B544E]">
                Search for real gifts in the Gift Finder or Explore page and tap Compare on up to 3 finalists.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('finder')}
                className="min-h-[42px] inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-pine-900 text-ivory-50 rounded-full hover:bg-pine-800 transition-colors whitespace-nowrap"
              >
                <span>Open Gift Finder</span>
                <ArrowRight className="w-3.5 h-3.5 text-ochre-400" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('explore')}
                className="min-h-[42px] inline-flex items-center px-5 py-2.5 text-xs font-semibold bg-white border border-pine-900/12 text-pine-900 rounded-full hover:bg-ivory-50 transition-colors whitespace-nowrap"
              >
                Search Live Products
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto glass-card rounded-3xl">
            <table className="w-full min-w-[680px] text-left border-collapse">
              <thead>
                <tr className="border-b border-pine-900/10 bg-ivory-50/60">
                  <th className="p-5 w-48 text-xs font-semibold text-[#5D6660] align-bottom">
                    Decision Criterion
                  </th>
                  {compareGifts.map((item) => {
                    const isWinner = winnerId === item.id;
                    return (
                      <th key={item.id} className="p-5 align-top border-l border-pine-900/10">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`text-xs font-semibold ${
                                isWinner ? 'text-ochre-700' : 'text-[#5D6660]'
                              }`}
                            >
                              {isWinner ? 'Recommended Winner' : item.category}
                            </span>
                            <button
                              type="button"
                              onClick={() => onRemoveCompare(item.id)}
                              aria-label={`Remove ${item.name} from comparison`}
                              className="p-1.5 text-[#7A827D] hover:text-pine-900 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-white border border-pine-900/8">
                            <GiftImage
                              src={item.image}
                              alt={item.name}
                              title={item.name}
                              fit="contain"
                              className="w-full h-full"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => onInspectGift(item)}
                            className="font-display text-base font-semibold text-[#161B18] hover:text-ochre-700 text-left block leading-snug"
                          >
                            {item.name}
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-pine-900/10 text-xs">
                <tr>
                  <td className="p-4 font-semibold text-[#161B18]">Price &amp; Delivery</td>
                  {compareGifts.map((item) => (
                    <td key={item.id} className="p-4 border-l border-pine-900/10 tabular-nums">
                      <span className="font-mono text-sm font-semibold text-pine-900">
                        {formatInr(item.priceInr)}
                      </span>
                      <span className="text-[#5D6660] ml-2">· {item.leadTimeDays}d ship</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-[#161B18]">Daily Utility</td>
                  {compareGifts.map((item) => (
                    <td key={item.id} className="p-4 border-l border-pine-900/10 tabular-nums text-[#3F4843]">
                      <span className="font-mono font-medium text-pine-900">{item.utilityScore}/10</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-[#161B18]">Keepsake Longevity</td>
                  {compareGifts.map((item) => (
                    <td key={item.id} className="p-4 border-l border-pine-900/10 tabular-nums text-[#3F4843]">
                      <span className="font-mono font-medium text-pine-900">{item.keepsakeScore}/10</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-[#161B18]">Unwrap Impression</td>
                  {compareGifts.map((item) => (
                    <td key={item.id} className="p-4 border-l border-pine-900/10 tabular-nums text-[#3F4843]">
                      <span className="font-mono font-medium text-pine-900">{item.unwrapScore}/10</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-[#161B18]">Best Fit When</td>
                  {compareGifts.map((item) => (
                    <td key={item.id} className="p-4 border-l border-pine-900/10 text-[#4B544E] leading-relaxed">
                      {item.lovesIt}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-[#161B18]">Skip If</td>
                  {compareGifts.map((item) => (
                    <td key={item.id} className="p-4 border-l border-pine-900/10 text-[#4B544E] leading-relaxed">
                      {item.skipIf}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-[#161B18]">Actions</td>
                  {compareGifts.map((item) => {
                    const saved = savedGiftIds.has(item.id);
                    const link = isSafeHttpUrl(item.productUrl)
                      ? item.productUrl
                      : isSafeHttpUrl(item.buySearchUrl)
                        ? item.buySearchUrl
                        : undefined;
                    return (
                      <td key={item.id} className="p-4 border-l border-pine-900/10">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSaveGift(item)}
                            className={`min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full transition-colors whitespace-nowrap ${
                              saved
                                ? 'bg-pine-50 text-pine-900 border border-pine-900/15'
                                : 'bg-pine-900 text-ivory-50 hover:bg-pine-800'
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                            <span>{saved ? 'Saved in Vault' : 'Save'}</span>
                          </button>
                          {link && (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-ochre-700 hover:underline px-2"
                            >
                              <span>Link</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
