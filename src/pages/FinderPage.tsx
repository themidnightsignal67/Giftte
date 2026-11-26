import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowUpRight,
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  GitCompare,
  Loader2,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  AGE_GROUP_OPTIONS,
  FinderQuery,
  formatInr,
  GIFT_FORMAT_OPTIONS,
  GIFT_GOAL_OPTIONS,
  GiftItem,
  INR_BUDGET_PRESETS,
  isSafeHttpUrl,
  LiveAiDecisionResponse,
  OCCASION_OPTIONS,
  PERSONALITY_TRAITS,
  RECIPIENT_OPTIONS,
  URGENCY_OPTIONS,
  VIBE_STYLE_OPTIONS,
} from '../data/gifts';
import { GiftImage } from '../components/GiftImage';

interface FinderPageProps {
  queryState: FinderQuery;
  onChangeQuery: (next: FinderQuery) => void;
  aiResult: LiveAiDecisionResponse | null;
  loading: boolean;
  error: string | null;
  onRunAiFinder: () => Promise<void>;
  onInspectGift: (gift: GiftItem) => void;
  onSaveGift: (gift: GiftItem, cardMessage?: string) => void;
  onToggleCompare: (gift: GiftItem) => void;
  onSaveDecisionRun: (topNames: string[]) => void;
  savedGiftIds: Set<string>;
  compareIds: Set<string>;
  decisionSavedFeedback: boolean;
}

type StudioSection = 'all' | 'who' | 'budget' | 'style' | 'traits';

export function FinderPage({
  queryState,
  onChangeQuery,
  aiResult,
  loading,
  error,
  onRunAiFinder,
  onInspectGift,
  onSaveGift,
  onToggleCompare,
  onSaveDecisionRun,
  savedGiftIds,
  compareIds,
  decisionSavedFeedback,
}: FinderPageProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<StudioSection>('all');
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const toggleTrait = (trait: string) => {
    const exists = queryState.traits.includes(trait);
    const nextTraits = exists
      ? queryState.traits.filter((t) => t !== trait)
      : [...queryState.traits, trait].slice(0, 8);
    onChangeQuery({ ...queryState, traits: nextTraits });
  };

  const handleReset = () => {
    onChangeQuery({
      relationship: 'Best Friend',
      occasion: 'Birthday',
      ageGroup: 'Young Adult (20s)',
      minInr: 1000,
      maxInr: 7500,
      traits: ['Minimalist', 'Coffee / Chai Lover'],
      giftFormat: 'Any Format',
      vibeStyle: 'Any Aesthetic',
      giftGoal: 'Any Goal',
      urgency: 'Within 2–3 Days',
      customNote: '',
    });
  };

  const handleCopyCard = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1800);
    } catch {
      // Clipboard fallback ignored safely
    }
  };

  const handleFindClick = async () => {
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    await onRunAiFinder();
  };

  const sectionTabs: { id: StudioSection; label: string }[] = [
    { id: 'all', label: 'All Options' },
    { id: 'who', label: '1. Who & Occasion' },
    { id: 'budget', label: '2. ₹ Budget & Delivery' },
    { id: 'style', label: '3. Aesthetic & Format' },
    { id: 'traits', label: '4. Traits & Custom Clues' },
  ];

  const showWho = activeSection === 'all' || activeSection === 'who';
  const showBudget = activeSection === 'all' || activeSection === 'budget';
  const showStyle = activeSection === 'all' || activeSection === 'style';
  const showTraits = activeSection === 'all' || activeSection === 'traits';

  const recommendations = aiResult?.recommendations || [];
  const [topMatch, ...otherNine] = recommendations;

  return (
    <div className="py-10 sm:py-16 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Studio Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-semibold text-ochre-700 tracking-wide">
              giftte Intelligence Configurator
            </p>
            <h1 className="font-display text-3xl sm:text-5xl font-semibold text-[#161B18] tracking-tight leading-[1.08]">
              Configure every detail. Get 10 gifts with photos.
            </h1>
            <p className="text-sm sm:text-base text-[#4B544E] leading-relaxed">
              Pick relationship, occasion, exact Indian Rupee (₹) range, style, and clues—giftte Intelligence curates 10 real brand-name gifts and fetches matching product photos in seconds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            <button
              type="button"
              onClick={handleReset}
              className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-pine-900 glass-card rounded-full hover:bg-white transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Options</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleFindClick}
              className="min-h-[44px] inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold bg-pine-900 text-ivory-50 rounded-full hover:bg-pine-800 disabled:opacity-60 transition-colors whitespace-nowrap shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-ochre-400" />
                  <span>Finding 10 Gifts...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-ochre-400" />
                  <span>Find 10 Gifts with giftte Intelligence</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Configurator View Switcher */}
        <div className="flex items-center gap-1.5 p-1.5 glass-soft rounded-2xl overflow-x-auto max-w-full">
          {sectionTabs.map((tab) => {
            const active = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`relative min-h-[38px] px-4 py-2 text-xs font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                  active ? 'text-pine-900 font-semibold' : 'text-[#4B544E] hover:text-pine-900'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="finder-section-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 bg-white rounded-xl shadow-sm border border-pine-900/10"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Rich Configurator Menu */}
        <div className="glass-card rounded-[2rem] p-5 sm:p-8 space-y-8">
          {showWho && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-6 border-b border-pine-900/10">
              <div className="lg:col-span-6 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#161B18]">
                    01. Recipient Relationship
                  </label>
                  <span className="text-xs font-medium text-ochre-700">
                    {queryState.relationship}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {RECIPIENT_OPTIONS.map((rel) => {
                    const active = queryState.relationship === rel;
                    return (
                      <button
                        key={rel}
                        type="button"
                        onClick={() => onChangeQuery({ ...queryState, relationship: rel })}
                        className={`min-h-[40px] px-3 py-2 text-xs font-medium rounded-xl border text-left transition-all truncate ${
                          active
                            ? 'bg-pine-900 text-ivory-50 border-pine-900 shadow-sm'
                            : 'bg-white/85 text-[#3F4843] border-pine-900/10 hover:bg-white hover:border-ochre-600/30'
                        }`}
                      >
                        {rel}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-6 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#161B18]">
                    02. Celebration or Occasion
                  </label>
                  <span className="text-xs font-medium text-ochre-700">
                    {queryState.occasion}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {OCCASION_OPTIONS.map((occ) => {
                    const active = queryState.occasion === occ;
                    return (
                      <button
                        key={occ}
                        type="button"
                        onClick={() => onChangeQuery({ ...queryState, occasion: occ })}
                        className={`min-h-[40px] px-3 py-2 text-xs font-medium rounded-xl border text-left transition-all truncate ${
                          active
                            ? 'bg-ochre-600 text-white border-ochre-600 shadow-sm'
                            : 'bg-white/85 text-[#3F4843] border-pine-900/10 hover:bg-white hover:border-ochre-600/30'
                        }`}
                      >
                        {occ}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {showBudget && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-6 border-b border-pine-900/10">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#161B18]">
                    03. Budget Range in Indian Rupees (₹ INR)
                  </label>
                  <span className="text-xs font-mono font-semibold text-pine-900 tabular-nums">
                    {formatInr(queryState.minInr)} – {formatInr(queryState.maxInr)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="f-min-inr" className="block text-[11px] text-[#5D6660] mb-1">
                      Minimum Budget (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-pine-900">
                        ₹
                      </span>
                      <input
                        id="f-min-inr"
                        type="number"
                        min={100}
                        max={500000}
                        value={queryState.minInr}
                        onChange={(e) =>
                          onChangeQuery({ ...queryState, minInr: Number(e.target.value) || 0 })
                        }
                        className="w-full min-h-[44px] pl-8 pr-3 py-2 text-sm font-mono tabular-nums bg-white/95 border border-pine-900/12 rounded-xl text-[#161B18]"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="f-max-inr" className="block text-[11px] text-[#5D6660] mb-1">
                      Maximum Budget (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-pine-900">
                        ₹
                      </span>
                      <input
                        id="f-max-inr"
                        type="number"
                        min={100}
                        max={2000000}
                        value={queryState.maxInr}
                        onChange={(e) =>
                          onChangeQuery({ ...queryState, maxInr: Number(e.target.value) || 0 })
                        }
                        className="w-full min-h-[44px] pl-8 pr-3 py-2 text-sm font-mono tabular-nums bg-white/95 border border-pine-900/12 rounded-xl text-pine-900 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {INR_BUDGET_PRESETS.map((preset) => {
                    const active =
                      queryState.minInr === preset.min && queryState.maxInr === preset.max;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          onChangeQuery({
                            ...queryState,
                            minInr: preset.min,
                            maxInr: preset.max,
                          })
                        }
                        className={`min-h-[36px] px-3 py-1.5 text-xs font-mono tabular-nums rounded-xl border transition-colors whitespace-nowrap ${
                          active
                            ? 'bg-pine-900 text-ivory-50 border-pine-900 shadow-sm'
                            : 'bg-white/85 text-[#3F4843] border-pine-900/10 hover:bg-white hover:border-ochre-600/30'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#161B18]">
                    04. Age Group
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {AGE_GROUP_OPTIONS.map((age) => {
                      const active = queryState.ageGroup === age;
                      return (
                        <button
                          key={age}
                          type="button"
                          onClick={() => onChangeQuery({ ...queryState, ageGroup: age })}
                          className={`min-h-[38px] px-2.5 py-1.5 text-xs font-medium rounded-xl border text-left transition-all truncate ${
                            active
                              ? 'bg-pine-900 text-ivory-50 border-pine-900'
                              : 'bg-white/85 text-[#3F4843] border-pine-900/10 hover:bg-white'
                          }`}
                        >
                          {age}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#161B18]">
                    05. Delivery Timeline
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {URGENCY_OPTIONS.map((u) => {
                      const active = queryState.urgency === u;
                      return (
                        <button
                          key={u}
                          type="button"
                          onClick={() => onChangeQuery({ ...queryState, urgency: u })}
                          className={`min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-xl border text-left transition-all truncate ${
                            active
                              ? 'bg-ochre-600 text-white border-ochre-600'
                              : 'bg-white/85 text-[#3F4843] border-pine-900/10 hover:bg-white'
                          }`}
                        >
                          {u}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {showStyle && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-pine-900/10">
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-[#161B18]">
                  06. Gift Format
                </label>
                <div className="flex flex-col gap-1.5">
                  {GIFT_FORMAT_OPTIONS.map((fmt) => {
                    const active = queryState.giftFormat === fmt;
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => onChangeQuery({ ...queryState, giftFormat: fmt })}
                        className={`min-h-[38px] px-3.5 py-2 text-xs font-medium rounded-xl border text-left transition-all ${
                          active
                            ? 'bg-pine-900 text-ivory-50 border-pine-900'
                            : 'bg-white/85 text-[#3F4843] border-pine-900/10 hover:bg-white'
                        }`}
                      >
                        {fmt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-[#161B18]">
                  07. Aesthetic Vibe
                </label>
                <div className="flex flex-col gap-1.5">
                  {VIBE_STYLE_OPTIONS.map((vibe) => {
                    const active = queryState.vibeStyle === vibe;
                    return (
                      <button
                        key={vibe}
                        type="button"
                        onClick={() => onChangeQuery({ ...queryState, vibeStyle: vibe })}
                        className={`min-h-[38px] px-3.5 py-2 text-xs font-medium rounded-xl border text-left transition-all ${
                          active
                            ? 'bg-ochre-600 text-white border-ochre-600'
                            : 'bg-white/85 text-[#3F4843] border-pine-900/10 hover:bg-white'
                        }`}
                      >
                        {vibe}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-[#161B18]">
                  08. Gift Priority Goal
                </label>
                <div className="flex flex-col gap-1.5">
                  {GIFT_GOAL_OPTIONS.map((goal) => {
                    const active = queryState.giftGoal === goal;
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => onChangeQuery({ ...queryState, giftGoal: goal })}
                        className={`min-h-[38px] px-3.5 py-2 text-xs font-medium rounded-xl border text-left transition-all ${
                          active
                            ? 'bg-pine-900 text-ivory-50 border-pine-900'
                            : 'bg-white/85 text-[#3F4843] border-pine-900/10 hover:bg-white'
                        }`}
                      >
                        {goal}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {showTraits && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#161B18]">
                    09. Personality &amp; Taste (pick up to 8)
                  </label>
                  <span className="text-xs text-[#5D6660] tabular-nums">
                    {queryState.traits.length}/8 selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PERSONALITY_TRAITS.map((trait) => {
                    const active = queryState.traits.includes(trait);
                    return (
                      <button
                        key={trait}
                        type="button"
                        onClick={() => toggleTrait(trait)}
                        className={`min-h-[38px] px-3.5 py-1.5 text-xs font-medium rounded-xl border transition-all whitespace-nowrap ${
                          active
                            ? 'bg-pine-900 text-ivory-50 border-pine-900 shadow-sm'
                            : 'bg-white/85 text-[#3F4843] border-pine-900/10 hover:bg-white hover:border-ochre-600/30'
                        }`}
                      >
                        {trait}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-2.5">
                <label htmlFor="f-custom-note" className="block text-xs font-semibold text-[#161B18]">
                  10. Custom Note &amp; Specific Clues
                </label>
                <textarea
                  id="f-custom-note"
                  rows={4}
                  maxLength={600}
                  value={queryState.customNote}
                  onChange={(e) => onChangeQuery({ ...queryState, customNote: e.target.value })}
                  placeholder="Write anything specific: e.g., loves Sony headphones, anime room lamps, journaling, skincare, cricket, cooking, or minimalist desk setup..."
                  className="w-full px-4 py-3 text-xs sm:text-sm bg-white/95 border border-pine-900/12 rounded-2xl text-[#161B18] placeholder:text-[#7A827D] leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="pt-4 border-t border-pine-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-[#4B544E]">
              giftte Intelligence picks 10 real gifts matching {queryState.relationship} ·{' '}
              {queryState.occasion} ·{' '}
              <span className="font-mono font-semibold text-pine-900">
                {formatInr(queryState.minInr)}–{formatInr(queryState.maxInr)}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {recommendations.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onSaveDecisionRun(recommendations.slice(0, 3).map((r) => r.gift.name))
                  }
                  className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white border border-pine-900/12 text-pine-900 rounded-full hover:bg-ivory-50 transition-colors whitespace-nowrap"
                >
                  {decisionSavedFeedback ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-pine-800" />
                      <span>Saved to Vault</span>
                    </>
                  ) : (
                    <span>Archive Run</span>
                  )}
                </button>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={handleFindClick}
                className="min-h-[44px] inline-flex items-center gap-2 px-7 py-2.5 text-xs font-semibold bg-ochre-600 text-white rounded-full hover:bg-ochre-700 disabled:opacity-60 transition-colors whitespace-nowrap shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Picking Gifts &amp; Photos...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Suggest 10 Gifts</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results Region */}
        <div ref={resultsRef} className="space-y-8 scroll-mt-24">
          {error && (
            <div
              role="alert"
              className="glass-card rounded-3xl p-6 border border-rose-200 bg-rose-50/75 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-rose-900">
                  giftte Intelligence Search Notice
                </p>
                <p className="text-xs text-rose-800">{error}</p>
              </div>
              <button
                type="button"
                onClick={handleFindClick}
                className="min-h-[40px] px-5 py-2 text-xs font-semibold bg-rose-900 text-white rounded-full hover:bg-rose-800 transition-colors whitespace-nowrap shrink-0"
              >
                Retry Search
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-6">
              <div className="glass-soft rounded-2xl p-5 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-ochre-700 animate-spin shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-pine-900">
                    Curating 10 real gifts and fetching product photos...
                  </p>
                  <p className="text-xs text-[#4B544E]">
                    Matching picks for your {queryState.relationship.toLowerCase()} within{' '}
                    {formatInr(queryState.minInr)}–{formatInr(queryState.maxInr)}.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="glass-card rounded-3xl overflow-hidden animate-pulse"
                  >
                    <div className="aspect-[4/3] bg-ivory-100" />
                    <div className="p-5 space-y-3">
                      <div className="h-3 bg-ivory-100 rounded w-1/2" />
                      <div className="h-5 bg-ivory-100 rounded w-4/5" />
                      <div className="h-3 bg-ivory-100 rounded w-full" />
                      <div className="h-3 bg-ivory-100 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="glass-card rounded-[2rem] p-8 sm:p-14 text-center space-y-5">
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#161B18]">
                Ready to curate 10 gifts for {queryState.relationship}
              </h2>
              <p className="text-sm sm:text-base text-[#4B544E] max-w-xl mx-auto leading-relaxed">
                Click below once your options are set. giftte Intelligence picks 10 real brand-name gifts matched to your preferences and fetches their product images automatically.
              </p>
              <button
                type="button"
                onClick={handleFindClick}
                className="min-h-[48px] inline-flex items-center gap-2.5 px-8 py-3.5 text-sm font-semibold bg-pine-900 text-ivory-50 rounded-full hover:bg-pine-800 transition-colors shadow-md"
              >
                <Search className="w-4 h-4 text-ochre-400" />
                <span>Find 10 Gifts with giftte Intelligence</span>
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-ochre-700">
                    giftte Intelligence Picks
                  </p>
                  <h2 className="font-display text-2xl sm:text-4xl font-semibold text-[#161B18] tracking-tight">
                    10 Tailored Gifts with Product Photos
                  </h2>
                  <p className="text-xs sm:text-sm text-[#4B544E]">{aiResult?.summaryVerdict}</p>
                </div>
                <span className="text-xs font-mono tabular-nums text-[#5D6660] shrink-0">
                  {recommendations.length} curated picks
                </span>
              </div>

              {/* #1 Top Pick Spotlight */}
              {topMatch && (
                <motion.article
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="grid grid-cols-1 lg:grid-cols-12 glass-card rounded-[2rem] overflow-hidden hover:shadow-xl transition-shadow border border-ochre-600/20"
                >
                  <div className="lg:col-span-5 bg-white aspect-[4/3] lg:aspect-auto lg:min-h-[340px] border-b lg:border-b-0 lg:border-r border-pine-900/8">
                    <GiftImage
                      src={topMatch.gift.image}
                      alt={topMatch.gift.name}
                      title={topMatch.gift.name}
                      fit="contain"
                      className="w-full h-full"
                    />
                  </div>

                  <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-5">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#5D6660]">
                          <span className="font-semibold text-ochre-700 tabular-nums">
                            01. Top Match · {topMatch.matchPercentage}% Fit
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{topMatch.gift.maker}</span>
                          <span aria-hidden="true">·</span>
                          <span>{topMatch.gift.format}</span>
                        </div>
                        <span className="font-mono text-xl font-semibold tabular-nums text-pine-900">
                          {formatInr(topMatch.gift.priceInr)}
                        </span>
                      </div>

                      <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#161B18] leading-snug">
                        <button
                          type="button"
                          onClick={() => onInspectGift(topMatch.gift)}
                          className="text-left hover:text-ochre-700 transition-colors"
                        >
                          {topMatch.gift.name}
                        </button>
                      </h3>

                      <p className="text-sm text-[#4B544E] leading-relaxed">{topMatch.whyItFits}</p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-[#5D6660] tabular-nums">
                        <span>Daily Use {topMatch.gift.utilityScore}/10</span>
                        <span aria-hidden="true">·</span>
                        <span>Keepsake {topMatch.gift.keepsakeScore}/10</span>
                        <span aria-hidden="true">·</span>
                        <span>Unwrap {topMatch.gift.unwrapScore}/10</span>
                      </div>

                      {topMatch.reasons.length > 0 && (
                        <p className="text-xs font-medium text-pine-800">
                          {topMatch.reasons.join(' · ')}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-3 bg-ivory-50 border border-pine-900/10 rounded-xl px-4 py-2.5">
                        <p className="text-xs text-[#3F4843] italic truncate">
                          Card Note: &ldquo;{topMatch.customCardNote}&rdquo;
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCopyCard(topMatch.customCardNote, 0)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-pine-900 hover:text-ochre-700 whitespace-nowrap shrink-0"
                        >
                          {copiedIdx === 0 ? (
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
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-pine-900/10">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => onSaveGift(topMatch.gift, topMatch.customCardNote)}
                          className={`min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full transition-colors whitespace-nowrap ${
                            savedGiftIds.has(topMatch.gift.id)
                              ? 'bg-pine-50 text-pine-900 border border-pine-900/15'
                              : 'bg-pine-900 text-ivory-50 hover:bg-pine-800'
                          }`}
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>{savedGiftIds.has(topMatch.gift.id) ? 'Saved' : 'Save Gift'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleCompare(topMatch.gift)}
                          className={`min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${
                            compareIds.has(topMatch.gift.id)
                              ? 'border-ochre-600 text-ochre-700 bg-ochre-100/70'
                              : 'border-pine-900/12 bg-white text-[#3F4843] hover:bg-ivory-50'
                          }`}
                        >
                          <GitCompare className="w-3.5 h-3.5" />
                          <span>
                            {compareIds.has(topMatch.gift.id) ? 'Comparing' : 'Compare'}
                          </span>
                        </button>

                        {isSafeHttpUrl(topMatch.gift.productUrl) && (
                          <a
                            href={topMatch.gift.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-ochre-600 text-white rounded-full hover:bg-ochre-700 transition-colors whitespace-nowrap"
                          >
                            <span>View Product</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onInspectGift(topMatch.gift)}
                        className="min-h-[40px] inline-flex items-center gap-1 text-xs font-semibold text-pine-900 hover:text-ochre-700 whitespace-nowrap px-2"
                      >
                        <span>Full Brief</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.article>
              )}

              {/* Picks 02 - 10 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherNine.map(
                  ({ gift, matchPercentage, whyItFits, reasons, customCardNote }, idx) => {
                    const rankIndex = idx + 2;
                    const rankLabel = rankIndex < 10 ? `0${rankIndex}` : `${rankIndex}`;
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
                        layout
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
                            className="block w-full aspect-[4/3] bg-white overflow-hidden border-b border-pine-900/8"
                          >
                            <GiftImage
                              src={gift.image}
                              alt={gift.name}
                              title={gift.name}
                              fit="contain"
                              className="w-full h-full group-hover:scale-[1.04] transition-transform duration-300"
                            />
                          </button>

                          <div className="p-5 space-y-2.5">
                            <div className="flex items-center justify-between gap-2 text-xs text-[#5D6660]">
                              <span className="font-semibold text-ochre-700 tabular-nums">
                                {rankLabel}. {matchPercentage}% Match · {gift.maker}
                              </span>
                              <span className="font-mono text-sm font-semibold tabular-nums text-pine-900 shrink-0">
                                {formatInr(gift.priceInr)}
                              </span>
                            </div>

                            <h3 className="font-display text-lg font-semibold text-[#161B18] leading-snug">
                              <button
                                type="button"
                                onClick={() => onInspectGift(gift)}
                                className="text-left hover:text-ochre-700 transition-colors"
                              >
                                {gift.name}
                              </button>
                            </h3>

                            <p className="text-xs text-[#4B544E] leading-relaxed line-clamp-3">
                              {whyItFits}
                            </p>

                            {reasons.length > 0 && (
                              <p className="text-[11px] font-medium text-pine-800 truncate">
                                {reasons.join(' · ')}
                              </p>
                            )}

                            <div className="flex items-center justify-between gap-2 bg-ivory-50 border border-pine-900/10 rounded-xl px-3 py-2">
                              <p className="text-[11px] text-[#3F4843] italic truncate">
                                &ldquo;{customCardNote}&rdquo;
                              </p>
                              <button
                                type="button"
                                onClick={() => handleCopyCard(customCardNote, idx + 1)}
                                aria-label="Copy gift card message"
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-pine-900 hover:text-ochre-700 whitespace-nowrap shrink-0"
                              >
                                {copiedIdx === idx + 1 ? (
                                  <Check className="w-3 h-3 text-pine-800" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="px-5 pb-5 pt-3 border-t border-pine-900/10 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSaveGift(gift, customCardNote)}
                              className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap ${
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
                              className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${
                                isCompared
                                  ? 'border-ochre-600 text-ochre-700 bg-ochre-100/70'
                                  : 'border-pine-900/12 bg-white text-[#3F4843] hover:bg-ivory-50'
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
                  }
                )}
              </div>

              {aiResult?.groundingSources && aiResult.groundingSources.length > 0 && (
                <div className="glass-soft rounded-2xl p-4 sm:p-5 space-y-2">
                  <p className="text-xs font-semibold text-[#3F4843]">
                    Sources consulted via Google Search
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
                    {aiResult.groundingSources.map((src) =>
                      isSafeHttpUrl(src.uri) ? (
                        <a
                          key={src.uri}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pine-900 hover:text-ochre-700 hover:underline truncate max-w-xs"
                        >
                          {src.title || src.uri}
                        </a>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
