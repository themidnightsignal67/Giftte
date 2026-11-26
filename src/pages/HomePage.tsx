import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import brandHeroAtelier from '../assets/images/brand_hero_atelier_1795689434891.jpg';
import brandObjectsFlatlay from '../assets/images/brand_objects_flatlay_1795689435721.jpg';
import brandCraftWrapping from '../assets/images/brand_craft_wrapping_1795689436111.jpg';
import brandBotanicalNote from '../assets/images/brand_botanical_note_1795689436685.jpg';
import { GiftImage } from '../components/GiftImage';

export type AppPage = 'home' | 'finder' | 'explore' | 'compare' | 'vault';

interface HomePageProps {
  onNavigate: (page: AppPage) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const pillars = [
    {
      num: '01',
      image: brandObjectsFlatlay,
      alt: 'Warm walnut desk tray, matte stoneware espresso cup, brass pen, leather folio, and ceramic diffuser on travertine',
      title: 'Precision Object Curation',
      desc: 'Dial in relationship, occasion, aesthetic vibe, delivery window, and your exact Indian Rupee (₹ INR) range to uncover 10 genuine brand-name matches.',
    },
    {
      num: '02',
      image: brandCraftWrapping,
      alt: 'Artisan terracotta silk ribbon spool, brass shears, and tailored cotton gift parcel on linen',
      title: 'Verified Photos & Scoring',
      desc: 'No recycled placeholders—giftte fetches crisp product photos automatically and scores daily utility, keepsake longevity, and unwrap impression.',
    },
    {
      num: '03',
      image: brandBotanicalNote,
      alt: 'Deckle-edge cotton card sealed with pine and burnished gold wax beside a stoneware botanical vessel',
      title: 'Card Notes & Local Vault',
      desc: 'Copy bespoke card messages crafted for the recipient, compare up to three finalists side by side, and archive everything locally without signup.',
    },
  ];

  const dimensions = [
    { label: '12 Relationships & Occasions', value: 'Precision Fit' },
    { label: 'Custom ₹ INR Min–Max', value: 'True Budget' },
    { label: '10 Tailored Matches + Photos', value: 'Every Search' },
    { label: 'Zero Login Gate', value: 'Instant Vault' },
  ];

  return (
    <div className="pb-20 space-y-20 sm:space-y-28">
      {/* Section 1: Flagship Atelier Hero */}
      <section className="pt-10 sm:pt-16 lg:pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl mx-auto text-center space-y-6"
          >
            <p className="text-xs sm:text-sm font-semibold text-ochre-700 tracking-wide">
              giftte Intelligence · Decision Atelier
            </p>

            <h1 className="font-display text-[clamp(2.5rem,5.4vw,4.45rem)] font-semibold text-[#161B18] tracking-tight leading-[1.05]">
              Thoughtful gifts, decided in seconds.
            </h1>

            <p className="text-base sm:text-lg text-[#4B544E] leading-relaxed max-w-2xl mx-auto">
              Tell giftte who you are celebrating, set your exact Indian Rupee budget, and add any clues. giftte Intelligence selects 10 real gifts with matched product photos and handwritten card lines—zero signup needed.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('finder')}
                className="min-h-[52px] w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-9 py-3.5 text-sm font-semibold bg-pine-900 text-ivory-50 rounded-full hover:bg-pine-800 transition-all shadow-[0_14px_34px_-8px_rgba(18,55,42,0.38)] whitespace-nowrap"
              >
                <span>Find a Gift</span>
                <ArrowRight className="w-4 h-4 text-ochre-400" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('explore')}
                className="min-h-[52px] w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-sm font-medium glass-soft rounded-full text-pine-900 hover:bg-white hover:border-pine-900/20 transition-all whitespace-nowrap"
              >
                Quick Product Search →
              </button>
            </div>
          </motion.div>

          {/* Flagship Studio Visual + Interactive Spec Strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4 max-w-6xl mx-auto"
          >
            <div className="glass-card rounded-[2rem] p-2.5 sm:p-4 border border-ochre-600/15">
              <div className="aspect-[16/9] w-full rounded-[1.5rem] overflow-hidden bg-ivory-100">
                <GiftImage
                  src={brandHeroAtelier}
                  alt="Signature ivory linen-wrapped parcel with burnished terracotta-gold silk ribbon on warm travertine beside an espresso vessel and brass compass"
                  title="giftte Atelier Identity"
                  className="w-full h-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {dimensions.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onNavigate('finder')}
                  className="glass-soft rounded-2xl px-5 py-4 flex flex-col justify-between gap-1 text-left hover:bg-white/95 hover:border-ochre-600/30 transition-all group"
                >
                  <span className="text-[11px] font-medium text-[#5D6660] group-hover:text-ochre-700 transition-colors">
                    {item.label}
                  </span>
                  <span className="font-display text-lg font-semibold text-pine-900">
                    {item.value}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 2: The Atelier Standard (3 Editorial Brand Photography Pillars) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="max-w-2xl space-y-2.5">
          <p className="text-xs font-semibold text-ochre-700 tracking-wide">
            The Atelier Standard
          </p>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold text-[#161B18] tracking-tight">
            Crafted around taste, budget clarity, and presentation.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((pillar) => (
            <motion.article
              key={pillar.num}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="glass-card rounded-3xl overflow-hidden flex flex-col justify-between group"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-ivory-100 border-b border-pine-900/8">
                <GiftImage
                  src={pillar.image}
                  alt={pillar.alt}
                  title={pillar.title}
                  className="w-full h-full group-hover:scale-[1.03] transition-transform duration-500"
                />
              </div>
              <div className="p-6 sm:p-7 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="font-mono text-xs font-semibold text-ochre-700 tabular-nums">
                    {pillar.num}
                  </span>
                  <h3 className="font-display text-xl font-semibold text-[#161B18]">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-[#4B544E] leading-relaxed">{pillar.desc}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Section 3: Deep Pine Signature Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-pine-900 text-ivory-50 p-8 sm:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_24px_60px_-18px_rgba(18,55,42,0.45)] border border-ochre-400/20">
          <div className="space-y-2.5 max-w-xl">
            <p className="text-xs font-semibold text-ochre-400 tracking-wide">
              Ready in under 8 seconds
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ivory-50">
              See 10 real gifts with photos matched to your exact ₹ budget.
            </h2>
            <p className="text-sm sm:text-base text-ivory-100/80 leading-relaxed">
              Open the Gift Finder configurator, set relationship, style, and clues, and receive curated picks ready to compare or save.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('finder')}
            className="min-h-[50px] inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-sm font-semibold bg-ochre-600 text-white rounded-full hover:bg-ochre-700 transition-colors whitespace-nowrap shrink-0 shadow-md"
          >
            <span>Find a Gift</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
