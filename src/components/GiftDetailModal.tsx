import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bookmark, Check, Copy, ExternalLink, GitCompare, X } from 'lucide-react';
import { formatInr, GiftItem, isSafeHttpUrl } from '../data/gifts';
import { GiftImage } from './GiftImage';

interface GiftDetailModalProps {
  gift: GiftItem | null;
  onClose: () => void;
  onSaveGift: (gift: GiftItem, cardMessage?: string) => void;
  onToggleCompare: (gift: GiftItem) => void;
  isSaved: boolean;
  isCompared: boolean;
}

export function GiftDetailModal({
  gift,
  onClose,
  onSaveGift,
  onToggleCompare,
  isSaved,
  isCompared,
}: GiftDetailModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyNote = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 1800);
    } catch {
      // Clipboard fallback ignored safely
    }
  };

  const outboundUrl = gift
    ? isSafeHttpUrl(gift.productUrl)
      ? gift.productUrl
      : isSafeHttpUrl(gift.buySearchUrl)
        ? gift.buySearchUrl
        : undefined
    : undefined;

  return (
    <AnimatePresence>
      {gift && (
        <motion.div
          key="gift-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B231B]/50 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gift-modal-title"
          onClick={onClose}
        >
          <motion.div
            key={gift.id}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#FFFDF9]/98 backdrop-blur-2xl border border-pine-900/10 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 items-stretch">
              <div className="bg-white min-h-[240px] sm:min-h-[300px] md:min-h-full border-b md:border-b-0 md:border-r border-pine-900/8">
                <GiftImage
                  src={gift.image}
                  alt={gift.name}
                  title={gift.name}
                  fit="contain"
                  className="w-full h-full"
                />
              </div>

              <div className="p-5 sm:p-8 flex flex-col justify-between gap-6">
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#5D6660]">
                        <span>{gift.maker}</span>
                        <span aria-hidden="true">·</span>
                        <span>{gift.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{gift.shortTag}</span>
                      </div>
                      <h3
                        id="gift-modal-title"
                        className="font-display text-2xl font-semibold text-[#161B18] leading-snug"
                      >
                        {gift.name}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close gift details"
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[#5D6660] hover:text-pine-900 hover:bg-ivory-100 rounded-xl transition-colors shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-pine-900/10 pb-4">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-2xl font-semibold tabular-nums text-pine-900">
                        {formatInr(gift.priceInr)}
                      </span>
                      <span className="text-xs text-[#5D6660] tabular-nums">
                        Est. {gift.leadTimeDays} {gift.leadTimeDays === 1 ? 'day' : 'days'} delivery
                      </span>
                    </div>

                    {outboundUrl && (
                      <a
                        href={outboundUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ochre-700 hover:underline whitespace-nowrap"
                      >
                        <span>View Product</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <p className="text-sm text-[#3F4843] leading-relaxed">{gift.description}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="bg-pine-50 border border-pine-900/10 p-4 rounded-2xl space-y-1">
                      <p className="text-xs font-semibold text-pine-900">Best Fit When</p>
                      <p className="text-xs text-[#3F4843] leading-relaxed">{gift.lovesIt}</p>
                    </div>
                    <div className="bg-ochre-100/65 border border-ochre-600/15 p-4 rounded-2xl space-y-1">
                      <p className="text-xs font-semibold text-ochre-700">Consider Skipping If</p>
                      <p className="text-xs text-[#3F4843] leading-relaxed">{gift.skipIf}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[#161B18]">Wrapping &amp; Presentation</p>
                    <p className="text-xs text-[#4B544E] leading-relaxed">{gift.presentationTip}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#161B18]">Card Note Ideas</p>
                    <div className="space-y-2">
                      {gift.cardTemplates.map((note, idx) => (
                        <div
                          key={note}
                          className="flex items-center justify-between gap-3 bg-ivory-50 border border-pine-900/10 rounded-xl px-3.5 py-2.5"
                        >
                          <p className="text-xs text-[#3F4843] italic">&ldquo;{note}&rdquo;</p>
                          <button
                            type="button"
                            onClick={() => handleCopyNote(note, idx)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-pine-900 hover:text-ochre-700 whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors"
                          >
                            {copiedIndex === idx ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-pine-800" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-pine-900/10">
                  <button
                    type="button"
                    onClick={() => onSaveGift(gift, gift.cardTemplates[0])}
                    className={`flex-1 min-w-[160px] min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${
                      isSaved
                        ? 'bg-pine-50 text-pine-900 border border-pine-900/15'
                        : 'bg-pine-900 text-ivory-50 hover:bg-pine-800'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>{isSaved ? 'Saved in Vault' : 'Save to Vault'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleCompare(gift)}
                    className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-full border transition-colors whitespace-nowrap ${
                      isCompared
                        ? 'border-ochre-600 text-ochre-700 bg-ochre-100/60'
                        : 'border-pine-900/15 text-[#161B18] hover:bg-ivory-100'
                    }`}
                  >
                    <GitCompare className="w-4 h-4" />
                    <span>{isCompared ? 'In Comparison' : 'Add to Compare'}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
