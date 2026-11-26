export interface GiftItem {
  id: string;
  name: string;
  maker: string;
  category: string;
  format: string;
  vibeStyle: string;
  primaryGoal: string;
  priceInr: number;
  image: string;
  productUrl?: string;
  buySearchUrl?: string;
  shortTag: string;
  tagline: string;
  description: string;
  lovesIt: string;
  skipIf: string;
  presentationTip: string;
  leadTimeDays: number;
  utilityScore: number;
  keepsakeScore: number;
  unwrapScore: number;
  cardTemplates: string[];
  isLiveAi?: boolean;
}

export interface FinderQuery {
  relationship: string;
  occasion: string;
  ageGroup: string;
  minInr: number;
  maxInr: number;
  traits: string[];
  giftFormat: string;
  vibeStyle: string;
  giftGoal: string;
  urgency: string;
  customNote: string;
}

export interface FinderRecommendation {
  gift: GiftItem;
  matchPercentage: number;
  whyItFits: string;
  reasons: string[];
  customCardNote: string;
}

export interface GroundingSource {
  uri: string;
  title?: string;
}

export interface LiveAiDecisionResponse {
  summaryVerdict: string;
  recommendations: FinderRecommendation[];
  groundingSources?: GroundingSource[];
}

export const EXPLORE_QUICK_TOPICS: string[] = [
  'Wireless Headphones',
  'Pour-Over Coffee Set',
  'Luxury Fragrance Gift',
  'Minimalist Desk Accessories',
  'Matcha Ceramic Bowl Set',
  'Smartwatch & Fitness Gear',
  'Leather Travel Organizer',
  'Artisanal Gourmet Hamper',
];

export const RECIPIENT_OPTIONS: string[] = [
  'Partner / Spouse',
  'Girlfriend / Boyfriend',
  'Best Friend',
  'Mom',
  'Dad',
  'Sister',
  'Brother',
  'Boss / Colleague',
  'Mentor / Teacher',
  'Newlyweds',
  'New Parents',
  'Dinner Host',
];

export const OCCASION_OPTIONS: string[] = [
  'Birthday',
  'Anniversary',
  'Wedding',
  'Housewarming',
  'Diwali / Festive',
  'Rakhi / Bhai Dooj',
  'Graduation',
  'Promotion / New Job',
  'Farewell',
  'Thank You',
  "Valentine's Day",
  'Just Because',
];

export const AGE_GROUP_OPTIONS: string[] = [
  'Kid (Under 12)',
  'Teen (13–19)',
  'Young Adult (20s)',
  '30s – 40s',
  '50s+',
  'Senior (65+)',
];

export const PERSONALITY_TRAITS: string[] = [
  'Minimalist',
  'Coffee / Chai Lover',
  'Tech & Desk Geek',
  'Foodie & Home Cook',
  'Bookworm & Writer',
  'Music & Audiophile',
  'Wellness & Calm',
  'Creative & Artistic',
  'Traveler & Outdoors',
  'Host & Entertainer',
  'Sentimental',
  'Luxury Aesthetic',
];

export const GIFT_FORMAT_OPTIONS: string[] = [
  'Any Format',
  'Curated Physical Object',
  'Personalized Keepsake',
  'Experience / Day Out',
  'Gourmet / Artisanal Hamper',
  'Tech & Desk Upgrade',
];

export const VIBE_STYLE_OPTIONS: string[] = [
  'Any Aesthetic',
  'Minimalist & Modern',
  'Warm & Cozy',
  'Heritage & Tactile',
  'Executive Luxury',
];

export const GIFT_GOAL_OPTIONS: string[] = [
  'Any Goal',
  'Used Every Single Day',
  'Keepsake Memory',
  'Unforgettable Unwrap',
  'Zero Clutter / Consumable',
];

export const URGENCY_OPTIONS: string[] = [
  'Need Today (Local / Instant)',
  'Within 2–3 Days',
  'Have 1+ Week',
];

export const INR_BUDGET_PRESETS: { label: string; min: number; max: number }[] = [
  { label: 'Under ₹1,500', min: 300, max: 1500 },
  { label: '₹1,500 – ₹3,500', min: 1500, max: 3500 },
  { label: '₹3,500 – ₹7,500', min: 3500, max: 7500 },
  { label: '₹7,500 – ₹15,000', min: 7500, max: 15000 },
  { label: '₹15,000 – ₹30,000', min: 15000, max: 30000 },
  { label: 'Any Budget', min: 500, max: 30000 },
];

export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function isSafeHttpUrl(url?: string): url is string {
  if (!url) return false;
  return url.startsWith('https://') || url.startsWith('http://');
}

/** Turn any thrown value / API error field into a readable string (never "[object Object]"). */
function toErrorMessage(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value instanceof Error && value.message) return value.message;
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (typeof rec.error === 'string' && rec.error.trim()) return rec.error.trim();
    if (typeof rec.message === 'string' && rec.message.trim()) return rec.message.trim();
    try {
      const json = JSON.stringify(value);
      if (json && json !== '{}' && json !== 'null') return json.slice(0, 280);
    } catch {
      // ignore
    }
  }
  return fallback;
}

export async function fetchLiveAiGiftRecommendations(
  payload: Partial<FinderQuery> & { searchQuery?: string }
): Promise<LiveAiDecisionResponse> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 28000);

    try {
      const res = await fetch('/api/gifts/decide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const rawText = await res.text();
      let parsed: (Partial<LiveAiDecisionResponse> & {
        error?: unknown;
        gifts?: FinderRecommendation[];
        message?: unknown;
      }) | null = null;
      try {
        parsed = JSON.parse(rawText) as Partial<LiveAiDecisionResponse> & {
          error?: unknown;
          gifts?: FinderRecommendation[];
          message?: unknown;
        };
      } catch {
        parsed = null;
      }

      if (!res.ok) {
        if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < 2) {
          await new Promise((r) => setTimeout(r, 450 * (attempt + 1)));
          continue;
        }
        throw new Error(
          toErrorMessage(
            parsed?.error ?? parsed?.message,
            `giftte Intelligence returned status ${res.status}. Please tap Retry.`
          )
        );
      }

      const recs = Array.isArray(parsed?.recommendations)
        ? parsed.recommendations
        : Array.isArray(parsed?.gifts)
          ? parsed.gifts
          : null;

      if (!parsed || !recs) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 450 * (attempt + 1)));
          continue;
        }
        throw new Error(
          rawText.trimStart().startsWith('<')
            ? 'giftte Intelligence could not reach the live curation server. Set GEMINI_API_KEYS in Vercel Environment Variables, redeploy, then tap Retry.'
            : toErrorMessage(
                parsed?.error,
                'Unexpected response format from giftte Intelligence. Please tap Retry.'
              )
        );
      }

      return {
        summaryVerdict: parsed.summaryVerdict || 'giftte Intelligence suggestions ready.',
        recommendations: recs,
        groundingSources: Array.isArray(parsed.groundingSources) ? parsed.groundingSources : [],
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (attempt < 2) continue;
        throw new Error('Request timed out while loading gifts. Please tap Retry.');
      }
      if (attempt === 2) {
        throw new Error(toErrorMessage(err, 'Unable to generate giftte Intelligence suggestions.'));
      }
      if (err instanceof Error && !err.message.includes('status 429') && !err.message.includes('rate limit')) {
        throw new Error(toErrorMessage(err, 'Unable to generate giftte Intelligence suggestions.'));
      }
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  throw new Error('Unable to fetch giftte Intelligence suggestions right now. Please tap Retry.');
}
