import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, ExternalLink, Plus, Trash2 } from 'lucide-react';
import {
  formatInr,
  GiftItem,
  isSafeHttpUrl,
  OCCASION_OPTIONS,
  RECIPIENT_OPTIONS,
} from '../data/gifts';
import { GiftImage } from '../components/GiftImage';

export interface RecipientListDoc {
  id: string;
  name: string;
  relationship: string;
  occasion: string;
  budgetMax: number;
  notes?: string;
}

export interface SavedGiftDoc {
  id: string;
  gift: GiftItem;
  recipientId: string;
  recipientName?: string;
  status: 'Shortlisted' | 'Decided' | 'Purchased';
  personalNote?: string;
  cardMessage?: string;
}

export interface DecisionSnapshotDoc {
  id: string;
  recipientType: string;
  occasion: string;
  interest: string;
  budgetTier: string;
  vibe: string;
  topGiftNames: string[];
}

interface VaultPageProps {
  recipients: RecipientListDoc[];
  savedGifts: SavedGiftDoc[];
  decisions: DecisionSnapshotDoc[];
  onCreateRecipient: (payload: {
    name: string;
    relationship: string;
    occasion: string;
    budgetMax: number;
    notes: string;
  }) => void;
  onDeleteRecipient: (recipientId: string) => void;
  onUpdateSavedStatus: (savedId: string, status: SavedGiftDoc['status']) => void;
  onUpdateSavedNotes: (savedId: string, personalNote: string, cardMessage: string) => void;
  onReassignRecipient: (savedId: string, recipientId: string, recipientName: string) => void;
  onRemoveSavedGift: (savedId: string) => void;
  onInspectGift: (gift: GiftItem) => void;
  onApplyDecisionToFinder: (decision: DecisionSnapshotDoc) => void;
}

export function VaultPage({
  recipients,
  savedGifts,
  decisions,
  onCreateRecipient,
  onDeleteRecipient,
  onUpdateSavedStatus,
  onUpdateSavedNotes,
  onReassignRecipient,
  onRemoveSavedGift,
  onInspectGift,
  onApplyDecisionToFinder,
}: VaultPageProps) {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState(RECIPIENT_OPTIONS[2]);
  const [occasion, setOccasion] = useState(OCCASION_OPTIONS[0]);
  const [budgetMax, setBudgetMax] = useState('5000');
  const [notes, setNotes] = useState('');
  const [activeFilterRecipient, setActiveFilterRecipient] = useState<string>('all');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftPersonalNote, setDraftPersonalNote] = useState('');
  const [draftCardMessage, setDraftCardMessage] = useState('');

  const handleAddRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim().slice(0, 80);
    if (!trimmed) return;
    const parsedBudget = Math.max(100, Math.min(2000000, Number(budgetMax) || 5000));
    onCreateRecipient({
      name: trimmed,
      relationship,
      occasion,
      budgetMax: parsedBudget,
      notes: notes.trim().slice(0, 300),
    });
    setName('');
    setNotes('');
  };

  const visibleSaved =
    activeFilterRecipient === 'all'
      ? savedGifts
      : savedGifts.filter((s) => s.recipientId === activeFilterRecipient);

  return (
    <div className="py-10 sm:py-16 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="space-y-2.5 max-w-2xl">
          <p className="text-xs font-semibold text-ochre-700 tracking-wide">
            Personal Gift Vault
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold text-[#161B18] tracking-tight">
            Organize recipients, ₹ budgets, and saved gifts
          </h1>
          <p className="text-sm sm:text-base text-[#4B544E] leading-relaxed">
            No signup or login required—your recipient profiles, saved giftte Intelligence finds, and card notes save automatically right inside your browser.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left column */}
          <div className="lg:col-span-4 space-y-6">
            <form
              onSubmit={handleAddRecipient}
              className="glass-card rounded-3xl p-5 sm:p-6 space-y-4"
            >
              <h2 className="text-sm font-semibold text-pine-900">Add Recipient List</h2>

              <div className="space-y-1.5">
                <label htmlFor="recipient-name" className="block text-xs font-medium text-[#3F4843]">
                  Recipient Name
                </label>
                <input
                  id="recipient-name"
                  type="text"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Mom, Aarav, Maya"
                  className="w-full min-h-[40px] px-3 py-2 text-xs bg-white/95 border border-pine-900/12 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="recipient-rel" className="block text-xs font-medium text-[#3F4843]">
                    Relationship
                  </label>
                  <select
                    id="recipient-rel"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full min-h-[40px] px-2.5 py-2 text-xs bg-white/95 border border-pine-900/12 rounded-xl"
                  >
                    {RECIPIENT_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="recipient-occ" className="block text-xs font-medium text-[#3F4843]">
                    Occasion
                  </label>
                  <select
                    id="recipient-occ"
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    className="w-full min-h-[40px] px-2.5 py-2 text-xs bg-white/95 border border-pine-900/12 rounded-xl"
                  >
                    {OCCASION_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="recipient-budget" className="block text-xs font-medium text-[#3F4843]">
                  Max Budget (₹ INR)
                </label>
                <input
                  id="recipient-budget"
                  type="number"
                  min={100}
                  max={2000000}
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 text-xs font-mono tabular-nums bg-white/95 border border-pine-900/12 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="recipient-notes" className="block text-xs font-medium text-[#3F4843]">
                  Clues or Preferences
                </label>
                <input
                  id="recipient-notes"
                  type="text"
                  maxLength={300}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Loves espresso, clean desk gear"
                  className="w-full min-h-[40px] px-3 py-2 text-xs bg-white/95 border border-pine-900/12 rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold bg-pine-900 text-ivory-50 rounded-full hover:bg-pine-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-ochre-400" />
                <span>Create List</span>
              </button>
            </form>

            <div className="glass-card rounded-3xl p-5 sm:p-6 space-y-3">
              <h2 className="text-sm font-semibold text-pine-900">Your Recipients</h2>
              {recipients.length === 0 ? (
                <p className="text-xs text-[#5D6660]">
                  No recipient lists yet. Create one above to organize gifts cleanly.
                </p>
              ) : (
                <ul className="divide-y divide-pine-900/10">
                  {recipients.map((rec) => (
                    <li key={rec.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-semibold text-[#161B18] truncate">{rec.name}</p>
                        <p className="text-xs text-[#5D6660]">
                          {rec.relationship} · {rec.occasion} ·{' '}
                          <span className="font-mono tabular-nums text-ochre-700 font-semibold">
                            {formatInr(rec.budgetMax)}
                          </span>
                        </p>
                        {rec.notes && (
                          <p className="text-xs text-[#4B544E] line-clamp-2">{rec.notes}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteRecipient(rec.id)}
                        aria-label={`Delete ${rec.name}`}
                        className="p-1.5 text-[#7A827D] hover:text-rose-700 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {decisions.length > 0 && (
              <div className="glass-card rounded-3xl p-5 sm:p-6 space-y-3">
                <h2 className="text-sm font-semibold text-pine-900">Archived Finder Runs</h2>
                <ul className="divide-y divide-pine-900/10">
                  {decisions.slice(0, 6).map((dec) => (
                    <li key={dec.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="text-xs min-w-0">
                        <p className="font-medium text-[#161B18] truncate">
                          {dec.recipientType} · {dec.occasion}
                        </p>
                        <p className="text-[#5D6660] truncate">
                          {dec.budgetTier} · {dec.interest}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onApplyDecisionToFinder(dec)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-pine-900 hover:bg-pine-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        Reopen
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="lg:col-span-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 glass-card rounded-2xl px-5 py-3.5">
              <span className="text-sm font-semibold text-pine-900 tabular-nums">
                Saved Shortlist ({visibleSaved.length})
              </span>
              <div className="flex items-center gap-2">
                <label htmlFor="vault-filter" className="text-xs text-[#5D6660]">
                  Filter by list:
                </label>
                <select
                  id="vault-filter"
                  value={activeFilterRecipient}
                  onChange={(e) => setActiveFilterRecipient(e.target.value)}
                  className="min-h-[36px] px-2.5 py-1.5 text-xs bg-white/95 border border-pine-900/12 rounded-xl"
                >
                  <option value="all">All Saved Gifts</option>
                  <option value="general">General Vault</option>
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {visibleSaved.length === 0 ? (
              <div className="glass-card rounded-3xl p-10 text-center space-y-2">
                <p className="font-display text-xl font-semibold text-[#161B18]">
                  No saved gifts yet
                </p>
                <p className="text-sm text-[#4B544E]">
                  Use the Gift Finder or Explore page to save giftte Intelligence recommendations directly here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleSaved.map((saved) => {
                  const gift = saved.gift;
                  const isEditing = editingNoteId === saved.id;
                  const link = isSafeHttpUrl(gift.productUrl)
                    ? gift.productUrl
                    : isSafeHttpUrl(gift.buySearchUrl)
                      ? gift.buySearchUrl
                      : undefined;

                  return (
                    <motion.article
                      key={saved.id}
                      layout
                      className="glass-card rounded-3xl p-5 flex flex-col sm:flex-row gap-5"
                    >
                      <div className="w-full sm:w-36 aspect-[4/3] rounded-2xl overflow-hidden bg-white border border-pine-900/8 shrink-0">
                        <GiftImage
                          src={gift.image}
                          alt={gift.name}
                          title={gift.name}
                          fit="contain"
                          className="w-full h-full"
                        />
                      </div>

                      <div className="flex-1 space-y-3 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <button
                              type="button"
                              onClick={() => onInspectGift(gift)}
                              className="font-display text-lg font-semibold text-[#161B18] hover:text-ochre-700 text-left"
                            >
                              {gift.name}
                            </button>
                            <p className="text-xs text-[#5D6660]">
                              {gift.maker} ·{' '}
                              <span className="font-mono tabular-nums text-pine-900 font-semibold">
                                {formatInr(gift.priceInr)}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
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
                            <button
                              type="button"
                              onClick={() => onRemoveSavedGift(saved.id)}
                              aria-label={`Remove ${gift.name} from vault`}
                              className="p-1.5 text-[#7A827D] hover:text-rose-700 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <select
                            aria-label="Gift decision status"
                            value={saved.status}
                            onChange={(e) =>
                              onUpdateSavedStatus(
                                saved.id,
                                e.target.value as SavedGiftDoc['status']
                              )
                            }
                            className="min-h-[38px] px-2.5 py-1.5 text-xs font-medium bg-white/95 border border-pine-900/12 rounded-xl"
                          >
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Decided">Decided</option>
                            <option value="Purchased">Purchased</option>
                          </select>

                          <select
                            aria-label="Assign to recipient list"
                            value={saved.recipientId}
                            onChange={(e) => {
                              const nextId = e.target.value;
                              const recName =
                                nextId === 'general'
                                  ? 'General Vault'
                                  : recipients.find((r) => r.id === nextId)?.name || 'Recipient';
                              onReassignRecipient(saved.id, nextId, recName);
                            }}
                            className="min-h-[38px] px-2.5 py-1.5 text-xs bg-white/95 border border-pine-900/12 rounded-xl"
                          >
                            <option value="general">General Vault</option>
                            {recipients.map((r) => (
                              <option key={r.id} value={r.id}>
                                For: {r.name}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) {
                                setEditingNoteId(null);
                              } else {
                                setEditingNoteId(saved.id);
                                setDraftPersonalNote(saved.personalNote || '');
                                setDraftCardMessage(
                                  saved.cardMessage || gift.cardTemplates[0] || ''
                                );
                              }
                            }}
                            className="text-xs font-semibold text-pine-900 hover:text-ochre-700 hover:underline whitespace-nowrap"
                          >
                            {isEditing ? 'Cancel Edit' : 'Edit Note & Card'}
                          </button>
                        </div>

                        {isEditing ? (
                          <div className="space-y-3 pt-2 border-t border-pine-900/10">
                            <div className="space-y-1">
                              <label className="block text-xs font-medium text-[#3F4843]">
                                Personal Reminder Note
                              </label>
                              <input
                                type="text"
                                maxLength={300}
                                value={draftPersonalNote}
                                onChange={(e) => setDraftPersonalNote(e.target.value)}
                                placeholder="e.g., Order with matte linen wrap"
                                className="w-full min-h-[38px] px-3 py-1.5 text-xs bg-white border border-pine-900/12 rounded-xl"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs font-medium text-[#3F4843]">
                                Gift Card Message
                              </label>
                              <textarea
                                rows={2}
                                maxLength={400}
                                value={draftCardMessage}
                                onChange={(e) => setDraftCardMessage(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-pine-900/12 rounded-xl"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateSavedNotes(
                                  saved.id,
                                  draftPersonalNote.trim().slice(0, 300),
                                  draftCardMessage.trim().slice(0, 400)
                                );
                                setEditingNoteId(null);
                              }}
                              className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-pine-900 text-ivory-50 rounded-full hover:bg-pine-800"
                            >
                              <Check className="w-3.5 h-3.5 text-ochre-400" />
                              <span>Save Notes</span>
                            </button>
                          </div>
                        ) : (
                          (saved.personalNote || saved.cardMessage) && (
                            <div className="text-xs text-[#4B544E] space-y-1 pt-1">
                              {saved.personalNote && (
                                <p>
                                  <span className="font-medium text-[#161B18]">Note:</span>{' '}
                                  {saved.personalNote}
                                </p>
                              )}
                              {saved.cardMessage && (
                                <p className="italic text-[#5D6660]">
                                  Card: &ldquo;{saved.cardMessage}&rdquo;
                                </p>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
