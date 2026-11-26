import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Menu, X } from 'lucide-react';
import {
  fetchLiveAiGiftRecommendations,
  FinderQuery,
  formatInr,
  GiftItem,
  LiveAiDecisionResponse,
} from './data/gifts';
import { GiftteLogo } from './components/GiftteLogo';
import { GiftDetailModal } from './components/GiftDetailModal';
import { AppPage, HomePage } from './pages/HomePage';
import { FinderPage } from './pages/FinderPage';
import { ExplorePage } from './pages/ExplorePage';
import { ComparePage } from './pages/ComparePage';
import {
  DecisionSnapshotDoc,
  RecipientListDoc,
  SavedGiftDoc,
  VaultPage,
} from './pages/VaultPage';

const STORAGE_KEYS = {
  recipients: 'giftte_recipients_v2',
  savedGifts: 'giftte_saved_gifts_v2',
  decisions: 'giftte_decisions_v2',
  compareGifts: 'giftte_compare_gifts_v3',
};

function createSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

function readPageFromHash(): AppPage {
  const h = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (h === 'finder' || h === 'explore' || h === 'compare' || h === 'vault') {
    return h;
  }
  return 'home';
}

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota or private browsing safely ignored
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>(() => readPageFromHash());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [recipients, setRecipients] = useState<RecipientListDoc[]>(() =>
    readLocalJson<RecipientListDoc[]>(STORAGE_KEYS.recipients, [])
  );
  const [savedGifts, setSavedGifts] = useState<SavedGiftDoc[]>(() =>
    readLocalJson<SavedGiftDoc[]>(STORAGE_KEYS.savedGifts, [])
  );
  const [decisions, setDecisions] = useState<DecisionSnapshotDoc[]>(() =>
    readLocalJson<DecisionSnapshotDoc[]>(STORAGE_KEYS.decisions, [])
  );
  const [compareGifts, setCompareGifts] = useState<GiftItem[]>(() =>
    readLocalJson<GiftItem[]>(STORAGE_KEYS.compareGifts, [])
  );

  const [catalogSearch, setCatalogSearch] = useState('');
  const [inspectedGift, setInspectedGift] = useState<GiftItem | null>(null);
  const [decisionSavedFeedback, setDecisionSavedFeedback] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [finderQuery, setFinderQuery] = useState<FinderQuery>({
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

  const [aiResult, setAiResult] = useState<LiveAiDecisionResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => writeLocalJson(STORAGE_KEYS.recipients, recipients), [recipients]);
  useEffect(() => writeLocalJson(STORAGE_KEYS.savedGifts, savedGifts), [savedGifts]);
  useEffect(() => writeLocalJson(STORAGE_KEYS.decisions, decisions), [decisions]);
  useEffect(() => writeLocalJson(STORAGE_KEYS.compareGifts, compareGifts), [compareGifts]);

  const navigate = useCallback((page: AppPage) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
    window.location.hash = `#/${page}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      setCurrentPage(readPageFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3400);
  }, []);

  const handleRunAiFinder = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await fetchLiveAiGiftRecommendations(finderQuery);
      setAiResult(result);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to fetch giftte Intelligence suggestions.';
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  }, [finderQuery]);

  const savedGiftIds = useMemo(
    () => new Set(savedGifts.map((s) => s.gift.id)),
    [savedGifts]
  );

  const compareIds = useMemo(
    () => new Set(compareGifts.map((g) => g.id)),
    [compareGifts]
  );

  const handleSaveGift = (gift: GiftItem, cardMessage?: string) => {
    const existing = savedGifts.find((s) => s.gift.id === gift.id);
    if (existing) {
      setSavedGifts((prev) => prev.filter((s) => s.id !== existing.id));
      showToast(`Removed "${gift.name}" from Saved Vault.`);
      return;
    }

    const newEntry: SavedGiftDoc = {
      id: createSafeId('saved'),
      gift,
      recipientId: 'general',
      recipientName: 'General Vault',
      status: 'Shortlisted',
      personalNote: '',
      cardMessage: (cardMessage || gift.cardTemplates[0] || '').slice(0, 400),
    };
    setSavedGifts((prev) => [newEntry, ...prev]);
    showToast(`Saved "${gift.name}" to your Vault.`);
  };

  const handleToggleCompare = (gift: GiftItem) => {
    setCompareGifts((prev) => {
      if (prev.some((g) => g.id === gift.id)) {
        return prev.filter((g) => g.id !== gift.id);
      }
      if (prev.length >= 3) {
        showToast('Comparison holds up to 3 finalists—replaced the oldest slot.');
        return [...prev.slice(1), gift];
      }
      return [...prev, gift];
    });
  };

  const handleSaveDecisionRun = (topNames: string[]) => {
    if (topNames.length === 0) return;
    const snap: DecisionSnapshotDoc = {
      id: createSafeId('decision'),
      recipientType: finderQuery.relationship,
      occasion: finderQuery.occasion,
      interest: finderQuery.traits.join(', ') || 'Balanced',
      budgetTier: `${formatInr(finderQuery.minInr)}–${formatInr(finderQuery.maxInr)}`,
      vibe: finderQuery.vibeStyle,
      topGiftNames: topNames.slice(0, 3),
    };
    setDecisions((prev) => [snap, ...prev]);
    setDecisionSavedFeedback(true);
    setTimeout(() => setDecisionSavedFeedback(false), 2200);
    showToast('Finder search archived to your Vault.');
  };

  const handleCreateRecipient = (payload: {
    name: string;
    relationship: string;
    occasion: string;
    budgetMax: number;
    notes: string;
  }) => {
    const rec: RecipientListDoc = {
      id: createSafeId('rec'),
      ...payload,
    };
    setRecipients((prev) => [rec, ...prev]);
    showToast(`Created list for ${payload.name}.`);
  };

  const handleDeleteRecipient = (recipientId: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== recipientId));
    showToast('Recipient list deleted.');
  };

  const handleUpdateSavedStatus = (
    savedId: string,
    status: SavedGiftDoc['status']
  ) => {
    setSavedGifts((prev) =>
      prev.map((s) => (s.id === savedId ? { ...s, status } : s))
    );
  };

  const handleUpdateSavedNotes = (
    savedId: string,
    personalNote: string,
    cardMessage: string
  ) => {
    setSavedGifts((prev) =>
      prev.map((s) =>
        s.id === savedId ? { ...s, personalNote, cardMessage } : s
      )
    );
    showToast('Notes updated.');
  };

  const handleReassignRecipient = (
    savedId: string,
    recipientId: string,
    recipientName: string
  ) => {
    setSavedGifts((prev) =>
      prev.map((s) =>
        s.id === savedId ? { ...s, recipientId, recipientName } : s
      )
    );
  };

  const handleRemoveSavedGift = (savedId: string) => {
    setSavedGifts((prev) => prev.filter((s) => s.id !== savedId));
    showToast('Removed from Vault.');
  };

  const handleApplyDecisionToFinder = (decision: DecisionSnapshotDoc) => {
    setFinderQuery((prev) => ({
      ...prev,
      relationship: decision.recipientType,
      occasion: decision.occasion,
      traits: decision.interest ? decision.interest.split(', ').filter(Boolean) : prev.traits,
    }));
    navigate('finder');
  };

  const navItems: { id: AppPage; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'finder', label: 'Gift Finder' },
    { id: 'explore', label: 'Explore' },
    { id: 'compare', label: `Compare (${compareGifts.length})` },
    { id: 'vault', label: `Saved Vault (${savedGifts.length})` },
  ];

  return (
    <div className="min-h-screen flex flex-col soothing-canvas text-[#161B18]">
      {/* Frosted Atelier Header */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/82 backdrop-blur-2xl border-b border-pine-900/10 shadow-[0_4px_24px_rgba(18,38,30,0.05)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
          <button
            type="button"
            onClick={() => navigate('home')}
            className="inline-flex items-center gap-2.5 font-display text-2xl font-bold tracking-tight text-pine-900 whitespace-nowrap shrink-0"
          >
            <GiftteLogo size={28} />
            <span>giftte</span>
          </button>

          <nav
            aria-label="Primary pages"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#4B544E]"
          >
            {navItems.map((item) => {
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={`relative py-1 transition-colors whitespace-nowrap shrink-0 ${
                    active ? 'text-pine-900 font-semibold' : 'hover:text-pine-900'
                  }`}
                >
                  <span>{item.label}</span>
                  {active && (
                    <motion.span
                      layoutId="nav-active-line"
                      className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-ochre-600 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('finder')}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-pine-900 text-ivory-50 rounded-full hover:bg-pine-800 transition-colors whitespace-nowrap shrink-0 shadow-sm"
            >
              <span>Find a Gift</span>
              <ArrowRight className="w-3.5 h-3.5 text-ochre-400" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-pine-900 hover:bg-white/70 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              aria-label="Mobile page navigation"
              className="md:hidden border-t border-pine-900/10 bg-[#FAF7F2]/96 backdrop-blur-xl px-4 py-3 overflow-hidden"
            >
              <div className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.id)}
                    className={`min-h-[44px] flex items-center px-3 rounded-xl text-sm font-medium text-left ${
                      currentPage === item.id
                        ? 'bg-pine-50 text-pine-900 font-semibold border border-pine-900/10'
                        : 'text-[#4B544E] hover:bg-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Active Page View */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {currentPage === 'home' && <HomePage onNavigate={navigate} />}

            {currentPage === 'finder' && (
              <FinderPage
                queryState={finderQuery}
                onChangeQuery={setFinderQuery}
                aiResult={aiResult}
                loading={aiLoading}
                error={aiError}
                onRunAiFinder={handleRunAiFinder}
                onInspectGift={setInspectedGift}
                onSaveGift={handleSaveGift}
                onToggleCompare={handleToggleCompare}
                onSaveDecisionRun={handleSaveDecisionRun}
                savedGiftIds={savedGiftIds}
                compareIds={compareIds}
                decisionSavedFeedback={decisionSavedFeedback}
              />
            )}

            {currentPage === 'explore' && (
              <ExplorePage
                searchQuery={catalogSearch}
                onChangeSearchQuery={setCatalogSearch}
                onInspectGift={setInspectedGift}
                onSaveGift={handleSaveGift}
                onToggleCompare={handleToggleCompare}
                savedGiftIds={savedGiftIds}
                compareIds={compareIds}
              />
            )}

            {currentPage === 'compare' && (
              <ComparePage
                compareGifts={compareGifts}
                onRemoveCompare={(id) =>
                  setCompareGifts((prev) => prev.filter((item) => item.id !== id))
                }
                onNavigate={navigate}
                onSaveGift={handleSaveGift}
                onInspectGift={setInspectedGift}
                savedGiftIds={savedGiftIds}
              />
            )}

            {currentPage === 'vault' && (
              <VaultPage
                recipients={recipients}
                savedGifts={savedGifts}
                decisions={decisions}
                onCreateRecipient={handleCreateRecipient}
                onDeleteRecipient={handleDeleteRecipient}
                onUpdateSavedStatus={handleUpdateSavedStatus}
                onUpdateSavedNotes={handleUpdateSavedNotes}
                onReassignRecipient={handleReassignRecipient}
                onRemoveSavedGift={handleRemoveSavedGift}
                onInspectGift={setInspectedGift}
                onApplyDecisionToFinder={handleApplyDecisionToFinder}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Quiet Atelier Footer */}
      <footer className="border-t border-pine-900/10 bg-[#FAF7F2]/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => navigate('home')}
              className="inline-flex items-center gap-2 font-display text-xl font-bold tracking-tight text-pine-900"
            >
              <GiftteLogo size={24} />
              <span>giftte</span>
            </button>
            <p className="text-xs text-[#5D6660]">
              giftte Intelligence curation in ₹ INR, zero signup required.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#4B544E]">
            <button type="button" onClick={() => navigate('home')} className="hover:text-pine-900">
              Home
            </button>
            <button type="button" onClick={() => navigate('finder')} className="hover:text-pine-900">
              Gift Finder
            </button>
            <button type="button" onClick={() => navigate('explore')} className="hover:text-pine-900">
              Explore
            </button>
            <button type="button" onClick={() => navigate('compare')} className="hover:text-pine-900">
              Compare
            </button>
            <button type="button" onClick={() => navigate('vault')} className="hover:text-pine-900">
              Saved Vault
            </button>
          </div>

          <p className="text-xs font-semibold text-pine-900">
            Made by Aditya Tomar
          </p>
        </div>
      </footer>

      {/* Gift Brief Modal */}
      <GiftDetailModal
        gift={inspectedGift}
        onClose={() => setInspectedGift(null)}
        onSaveGift={handleSaveGift}
        onToggleCompare={handleToggleCompare}
        isSaved={inspectedGift ? savedGiftIds.has(inspectedGift.id) : false}
        isCompared={inspectedGift ? compareIds.has(inspectedGift.id) : false}
      />

      {/* Action Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            role="status"
            aria-live="polite"
            className="fixed bottom-5 right-4 sm:right-6 z-50 bg-pine-900/95 backdrop-blur-lg text-ivory-50 text-xs font-medium px-4 py-3 rounded-2xl shadow-xl max-w-sm border border-ochre-400/30"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
