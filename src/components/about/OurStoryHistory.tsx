import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Compass,
  Landmark,
  Award,
  Globe2,
  Sparkles,
  BookOpen,
  Users,
  Swords,
  ChevronRight,
  Zap,
  ArrowRight,
  HeartPulse,
  Network,
  Calendar,
  Trophy,
  GraduationCap,
  Scroll,
  Timer,
  Radio,
  Binary,
  Lightbulb,
  PartyPopper,
  Volume2,
  AlertTriangle,
  TrendingDown,
  Coins,
  Shield,
  Scale,
  Flame,
  MessageSquare,
} from 'lucide-react';
import { getAssetUrl } from '@/utils/assetUrl';
import { useSmoothNavigate } from '@/utils/navigation';
import { NeuralNetworkBackground } from '@/components/common';

// Google Drive file IDs
const DRIVE_IMAGES = {
  firstBg: '1eNSvnINX8g5ek3l0XKp4KsjyidsHkzFo', // First background of the page
  foundationBg: '1Zie3Ys-PVPWZDnb6ODjObHQISfH_0g0L', // 1966 section background
  calgary1970: '1cfIj8LRr8Obe3uzQ9Vi9RhOHTJTDNZhe',
  danielleSmith: '1eLLU3-bUvma-KQkbBKLbROYgZ6sEwJWP',
  logo2017_2019: '1SvMPSlFTdtSgX5cQbAWPjWbuakp0KqMt',
  logoBefore2017: '1Fs5FmKF2m9B9LawqcepGF2qHtTYU6VjR',
  logo2019_present: '1Yj26oGE68pT7x7Kwi_QT55aXSKaA1ioI',
  naheedNenshi: '15Vv3OEucxMTsCCXuXscfFPa2GHIVe8wT',
  ucCampus: '1KDgbEVfULFY8JztmE_u1_mapR5vilIJa',
  earlyUofC: '15bekFBr-zoQPCJjlR1PgV_VV-cvBfvBw',
  ninetiesImage: '1RTa8zblwTCvGvxatNcH550WwQI8ZdPyF',
};

const getDriveDirectUrl = (fileId: string): string => {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
};

const getDriveThumbnailUrl = (fileId: string): string => {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
};

interface DriveImageProps {
  fileId: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
}

const DriveImage: React.FC<DriveImageProps> = ({ fileId, alt, className = '', wrapperClassName = '' }) => {
  const [loaded, setLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(getDriveDirectUrl(fileId));
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (currentSrc.includes('lh3.googleusercontent.com')) {
      setCurrentSrc(getDriveThumbnailUrl(fileId));
    } else {
      setHasError(true);
      setLoaded(true);
    }
  };

  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`}>
      {!loaded && !hasError && <div className="history-img-skeleton" aria-hidden="true" />}
      {!hasError ? (
        <img
          src={currentSrc}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={handleError}
          className={`${className} transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : (
        <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center p-4 bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 text-xs text-center">
          <BookOpen className="w-6 h-6 mb-2 opacity-50" />
          <span>Historical Archive Record</span>
        </div>
      )}
    </div>
  );
};

// Eras for tall timeline rail
interface EraSection {
  id: string;
  name: string;
  shortYear: string;
  icon: React.ElementType;
}

const ERA_SECTIONS: EraSection[] = [
  { id: 'mission', name: 'Mission', shortYear: 'Charter', icon: Compass },
  { id: 'foundation', name: 'Foundation', shortYear: '1960s–80s', icon: Landmark },
  { id: 'nineties', name: 'Parliamentary', shortYear: '1990s', icon: Award },
  { id: 'two-thousands', name: 'Millennium', shortYear: '2000s', icon: Radio },
  { id: 'twenty-tens', name: 'Expansion', shortYear: '2010s', icon: Globe2 },
  { id: 'present', name: 'AI & Reason', shortYear: 'Present', icon: Sparkles },
  { id: 'titans', name: 'Debate Titans', shortYear: 'Alumni', icon: Swords },
  { id: 'vision', name: 'Vision 2026', shortYear: 'Future', icon: HeartPulse },
];

const FALLING_ISSUES = [
  { text: 'Octogenarian Rule', icon: Landmark, theme: 'theme-amber', left: 5, delay: 0.3, duration: 13.5 },
  { text: 'Implicit Consent', icon: Shield, theme: 'theme-purple', left: 22, delay: 2.8, duration: 15.0 },
  { text: 'Individual Autonomy', icon: Scale, theme: 'theme-cyan', left: 42, delay: 1.5, duration: 14.2 },
  { text: 'Falling Education Outcomes', icon: TrendingDown, theme: '', left: 66, delay: 4.2, duration: 16.0 },
  { text: 'Multipolar Proxy Conflicts', icon: Swords, theme: '', left: 12, delay: 5.8, duration: 14.8 },
  { text: 'Democratic Backsliding', icon: AlertTriangle, theme: 'theme-amber', left: 84, delay: 1.9, duration: 15.5 },
  { text: 'Supply Chain Weaponization', icon: Network, theme: 'theme-purple', left: 30, delay: 8.1, duration: 13.8 },
  { text: 'Border Militarization', icon: Shield, theme: '', left: 52, delay: 4.8, duration: 16.5 },
  { text: 'Disinformation Warfare', icon: Radio, theme: 'theme-amber', left: 72, delay: 9.0, duration: 14.0 },
  { text: 'Runaway Wealth Concentration', icon: Coins, theme: 'theme-amber', left: 8, delay: 7.4, duration: 15.2 },
  { text: 'Housing Affordability Collapse', icon: Landmark, theme: '', left: 36, delay: 10.2, duration: 13.6 },
  { text: 'Generational Wealth Chasm', icon: TrendingDown, theme: 'theme-purple', left: 58, delay: 0.9, duration: 14.5 },
  { text: 'Vanishing Middle Class', icon: Users, theme: '', left: 88, delay: 6.5, duration: 16.2 },
  { text: 'Wage Stagnation vs Inflation', icon: TrendingDown, theme: 'theme-amber', left: 18, delay: 11.1, duration: 13.9 },
  { text: 'Algorithmic Outrage Loops', icon: Zap, theme: '', left: 48, delay: 3.6, duration: 15.8 },
  { text: 'Synthetic AI Prose Floods', icon: Binary, theme: 'theme-cyan', left: 76, delay: 6.8, duration: 14.6 },
  { text: '15-Second Attention Spans', icon: Timer, theme: 'theme-purple', left: 26, delay: 12.0, duration: 13.4 },
  { text: 'Echo Chamber Polarization', icon: Flame, theme: '', left: 92, delay: 3.8, duration: 16.8 },
  { text: 'Erosion of Public Discourse', icon: MessageSquare, theme: 'theme-cyan', left: 40, delay: 8.6, duration: 15.0 },
];

export const OurStoryHistory: React.FC = () => {
  const [activeEra, setActiveEra] = useState<string>('mission');
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [selectedPillar, setSelectedPillar] = useState<number>(0);
  const smoothNavigate = useSmoothNavigate();

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const registerSectionRef = useCallback((id: string, el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  }, []);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (!el) return;
    const offset = 70;
    const bodyRect = document.body.getBoundingClientRect().top;
    const elementRect = el.getBoundingClientRect().top;
    const elementPosition = elementRect - bodyRect;
    const offsetPosition = elementPosition - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const doc = document.documentElement;
          const totalScrollable = Math.max(doc.scrollHeight - window.innerHeight, 1);
          const currentScroll = window.scrollY || window.pageYOffset || 0;
          const progress = Math.min(Math.max(currentScroll / totalScrollable, 0), 1);
          setScrollProgress(progress);

          // 1. Rock-Solid Active Era Detection (Guarantees 2027 section switches to 'vision')
          const viewportAnchor = window.innerHeight * 0.45;
          let newEra = ERA_SECTIONS[0].id;
          for (const era of ERA_SECTIONS) {
            const el = sectionRefs.current[era.id];
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top <= viewportAnchor) {
                newEra = era.id;
              }
            }
          }
          setActiveEra(newEra);

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.12 }
    );

    const revealSelectors = ['.anim-slide-left', '.anim-slide-right', '.anim-scale-up', '.anim-lift-up', '.anim-focus-in'];
    document.querySelectorAll(revealSelectors.join(', ')).forEach((el) => revealObserver.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      revealObserver.disconnect();
    };
  }, []);

  // Paraphrased, expansive interactive mission pillars (compact)
  const missionPillars = [
    {
      title: 'Spoken Reasoning',
      subtitle: 'Direct Speech',
      icon: MessageSquare,
      summary: 'We offer a living sanctuary for the curious and intellectually hungry to explore how to reason with spoken language in real time.',
      extended: 'In a digital ecosystem of scripted soundbites, standing before peers to articulate, defend, and test arguments extemporaneously is a transformative skill.',
    },
    {
      title: 'Iterative Thinking',
      subtitle: 'Understanding Perspectives',
      icon: Flame,
      summary: 'Debate is far more than a competitive sport—it is a continuous discipline of iterative thought that clarifies complex truths.',
      extended: 'By inhabiting opposing perspectives with rigour and empathy, debaters transcend dogma, uncovering nuanced policy and the roots of their own convictions.',
    },
    {
      title: 'Breaking Thought-Corrosion',
      subtitle: 'An Intellectual Antidote',
      icon: Zap,
      summary: 'With thought-corroding tools resting in every pocket, we build an intellectual fortress against automated thinking and social isolation.',
      extended: 'Where automated algorithms reward outrage and shallow attention, UCDS creates genuine, unscripted discourse where disagreement yields mutual growth.',
    },
    {
      title: 'Radical Welcome',
      subtitle: 'Curiosity Rewarded',
      icon: Users,
      summary: 'Our mission is simple: to create and sustain a vibrant community where exercising curiosity and reason is rewarded. Everyone is welcome.',
      extended: 'Whether you are a novice who has never spoken in public or an experienced parliamentary orator, we provide mentorship and immediate camaraderie.',
    },
  ];

  return (
    <div className="history-page-root" data-active-era={activeEra}>
      {/* ================================================================= */}
      {/* FULL-VIEWPORT SEAMLESS DYNAMIC BACKGROUND STAGE (GPU-COMPOSITED) */}
      {/* ================================================================= */}
      <div className="history-backdrop-stage" aria-hidden="true">
        {/* Scene 0: Mission & Hero */}
        <div className={`backdrop-scene-layer ${activeEra === 'mission' ? 'is-active' : ''}`}>
          <div className="absolute inset-0 opacity-70 dark:opacity-60">
            <DriveImage
              fileId={DRIVE_IMAGES.firstBg}
              alt="UCDS Heritage Foundation"
              className="backdrop-img-full"
              wrapperClassName="w-full h-full"
            />
          </div>
          <div className="scene-flare-blue" />
        </div>

        {/* Scene 1: Foundation 1960s-1980s */}
        <div className={`backdrop-scene-layer ${activeEra === 'foundation' ? 'is-active' : ''}`}>
          <div className="absolute inset-0 opacity-70 dark:opacity-60">
            <DriveImage
              fileId={DRIVE_IMAGES.foundationBg}
              alt="1966 Campus Foundation"
              className="backdrop-img-full"
              wrapperClassName="w-full h-full"
            />
          </div>
          <div className="scene-flare-amber" />
        </div>

        {/* Scene 2: 1990s Parliamentary Golden Age */}
        <div className={`backdrop-scene-layer ${activeEra === 'nineties' ? 'is-active' : ''}`}>
          <div className="absolute inset-0 opacity-70 dark:opacity-60">
            <DriveImage
              fileId={DRIVE_IMAGES.ninetiesImage}
              alt=""
              className="backdrop-img-full object-center"
              wrapperClassName="w-full h-full"
            />
          </div>
          <div className="scene-flare-blue" />
        </div>

        {/* Scene 3: 2000s The Millennium Turn & Global Circuit */}
        <div className={`backdrop-scene-layer ${activeEra === 'two-thousands' ? 'is-active' : ''}`}>
          <div className="absolute inset-0 opacity-60 dark:opacity-50">
            <DriveImage
              fileId={DRIVE_IMAGES.earlyUofC}
              alt=""
              className="backdrop-img-full object-center"
              wrapperClassName="w-full h-full"
            />
          </div>
          <div className="scene-flare-cyan" />
          <div className="scene-flare-blue" />
        </div>

        {/* Scene 4: 2010s-2020s Expansion & Digital Pivot (Lag-Free Neural Network - Flicker Out) */}
        <div className={`backdrop-scene-layer ${activeEra === 'twenty-tens' ? 'is-active' : ''}`}>
          <NeuralNetworkBackground mode="flicker-out" isActive={activeEra === 'twenty-tens'} />
          <div className="scene-flare-cyan" />
        </div>

        {/* Scene 5: The Present (Contemporary UCalgary Campus) */}
        <div className={`backdrop-scene-layer ${activeEra === 'present' ? 'is-active' : ''}`}>
          <div className="absolute inset-0 opacity-70 dark:opacity-55">
            <DriveImage
              fileId={DRIVE_IMAGES.ucCampus}
              alt=""
              className="backdrop-img-full"
              wrapperClassName="w-full h-full"
            />
          </div>
          <div className="scene-flare-cyan" />
        </div>

        {/* Scene 6: Titans (Danielle Smith & Naheed Nenshi - Only active on Titans section) */}
        <div className={`backdrop-scene-layer ${activeEra === 'titans' ? 'is-active' : ''}`}>
          <div className="absolute inset-0 grid grid-cols-2 opacity-65 dark:opacity-65">
            <div className="relative w-full h-full overflow-hidden">
              <DriveImage
                fileId={DRIVE_IMAGES.danielleSmith}
                alt=""
                className="backdrop-img-full object-top"
                wrapperClassName="w-full h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/30 to-transparent" />
            </div>
            <div className="relative w-full h-full overflow-hidden">
              <DriveImage
                fileId={DRIVE_IMAGES.naheedNenshi}
                alt=""
                className="backdrop-img-full object-top"
                wrapperClassName="w-full h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-[#0075A2]/40 to-transparent" />
            </div>
          </div>
          <div className="scene-flare-amber" />
          <div className="scene-flare-cyan" />
        </div>

        {/* Scene 7: Vision 2026-2027 (Neural Network Flickering In) */}
        <div className={`backdrop-scene-layer ${activeEra === 'vision' ? 'is-active' : ''}`}>
          {/* Neural network that flickers into existence */}
          <NeuralNetworkBackground mode="flicker-in" isActive={activeEra === 'vision'} />

          <div className="scene-flare-blue" />
          <div className="scene-flare-cyan" />
        </div>

        {/* Contrast Scrim for Light & Dark Readability */}
        <div className="backdrop-scrim-light" />
      </div>

      {/* ================================================================= */}
      {/* MODERN MINIMALIST HOLOGRAPHIC TIMELINE TRACKER */}
      {/* ================================================================= */}
      <aside className="modern-minimal-timeline" aria-label="Timeline navigation rail">
        <div className="modern-timeline-track-wrap">
          <div className="modern-timeline-track">
            <div
              className="modern-timeline-fill"
              style={{ height: `${Math.min(Math.max(scrollProgress * 100, 4), 96)}%` }}
              aria-hidden="true"
            />
          </div>

          <div className="modern-timeline-nodes">
            {ERA_SECTIONS.map((era, idx) => {
              const isActive = activeEra === era.id;
              const chapterNum = `0${idx + 1}`;

              return (
                <button
                  key={era.id}
                  type="button"
                  onClick={() => scrollToSection(era.id)}
                  className={`modern-node-btn ${isActive ? 'is-active' : ''}`}
                  aria-label={`Jump to ${era.name} (${era.shortYear})`}
                >
                  <div className="modern-node-dot" />
                  <span className="modern-node-num">{chapterNum}</span>
                  <div className="modern-node-label">
                    <span className="modern-node-name">{era.name}</span>
                    <span className="modern-node-year">{era.shortYear}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ================================================================= */}
      {/* MAIN CONTENT STREAM */}
      {/* ================================================================= */}
      <div className="history-canvas-stream">
        {/* Hero Header */}
        <header className="pt-32 pb-20 text-center relative z-10">
          <div className="relative inline-block anim-scale-up">
            <div className="history-title-halo" />
            <h1 className="history-animated-title">
              Our Story &amp; History
            </h1>
          </div>

          {/* Established 1966 Tag Positioned Directly Below the Title */}
          <div className="flex items-center justify-center gap-3.5 mt-6 anim-lift-up delay-1">
            <img
              src={getAssetUrl('images/photos/ucalgary.png')}
              alt="University of Calgary"
              className="w-8 h-8 object-contain drop-shadow"
            />
            <span className="text-sm sm:text-base font-black tracking-widest uppercase text-[#0E1329] dark:text-[#F6F6F6] opacity-90">
              Established 1966
            </span>
          </div>
        </header>

        {/* ================================================================= */}
        {/* SECTION 1: MISSION STATEMENT (TILED IN ROWS OF TWO) */}
        {/* ================================================================= */}
        <section
          id="mission"
          data-era-id="mission"
          ref={(el) => registerSectionRef('mission', el)}
          className="mb-52 scroll-mt-24 relative"
        >
          {/* Monumental Quote Stream */}
          <div className="max-w-4xl mr-auto space-y-8 mb-16">
            <div className="relative pl-6 sm:pl-10 border-l-4 border-[#0075A2] dark:border-[#53afd0] anim-slide-left">
              <p className="font-serif text-2xl sm:text-4xl text-[#0E1329] dark:text-[#F6F6F6] leading-snug font-medium italic">
                &ldquo;The University of Calgary Debate Society lies on the boundary of all intellectual disciplines. We offer a space for the curious and intellectually hungry to explore how to reason with spoken language. Debate is not just a competitive sport, but an exercise in iterative thinking that helps individuals understand not only the world, but also themselves.&rdquo;
              </p>
            </div>
          </div>

          {/* Tiled in Rows of Two & Compact with Gentle Floating Buoyancy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mr-auto mb-14">
            {missionPillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              const isSelected = selectedPillar === idx;
              const floatClass = `float-gentle-${(idx % 4) + 1}`;

              return (
                <div
                  key={pillar.title}
                  onClick={() => setSelectedPillar(idx)}
                  className={`${floatClass} anim-scale-up`}
                >
                  <div
                    className={`mission-pillar-card cursor-pointer ${isSelected ? 'ring-2 ring-[#0075A2] dark:ring-[#53afd0]' : ''
                      }`}
                  >
                    <div className="flex items-center gap-3.5 mb-3">
                      <div className="p-3 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#0075A2] dark:text-[#53afd0] block">
                          {pillar.subtitle}
                        </span>
                        <h3 className="text-xl font-bold font-title text-[#0E1329] dark:text-[#F6F6F6]">
                          {pillar.title}
                        </h3>
                      </div>
                    </div>

                    <p className="text-base text-[#0E1329]/90 dark:text-[#F6F6F6]/90 leading-relaxed font-normal mb-3 flex-1">
                      {pillar.summary}
                    </p>

                    <p className="text-xs text-[#0E1329]/75 dark:text-[#F6F6F6]/75 leading-relaxed pt-2.5 border-t border-black/10 dark:border-white/10">
                      {pillar.extended}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Constitution Button */}
          <div className="pt-4 flex justify-start anim-lift-up delay-2">
            <button
              type="button"
              onClick={() => smoothNavigate('/about/constitution')}
              className="btn-constitution-hero group"
              title="View UCDS Constitution & Bylaws"
            >
              <Scroll className="w-5 h-5 text-white dark:text-[#0E1329] group-hover:rotate-12 transition-transform duration-300" />
              <span>Constitution &amp; Bylaws</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300 opacity-85" />
            </button>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 2: FOUNDATION 1960s-1980s */}
        {/* ================================================================= */}
        <section
          id="foundation"
          data-era-id="foundation"
          ref={(el) => registerSectionRef('foundation', el)}
          className="mb-56 scroll-mt-24 relative"
        >
          <div className="history-watermark-year anim-focus-in select-none">1966</div>

          {/* Beat 1: Stepping Out From Edmonton's Shadow */}
          <div className="max-w-2xl mr-auto mb-24 -mt-10 anim-slide-left delay-1">
            <h2 className="cardless-headline mb-4">
              Gaining Full Autonomy
            </h2>
            <p className="cardless-lead-text mb-4">
              Before 1966, higher education in Calgary operated as a single entity with the University of Alberta. When the <em>Universities Act</em> granted Calgary autonomous charter status in 1966, an exhilarating wave of independence swept the campus.
            </p>
            <p className="cardless-sub-text">
              In the concrete lecture halls of the era, students gathered on Friday afternoons to deliberate the urgent transformations altering their prairie home. This grassroots forum established the direct lineage of the University of Calgary Debate Society.
            </p>
          </div>

          {/* Aperture Window: Early University of Calgary */}
          <div className="max-w-xl ml-auto mb-32 anim-slide-right delay-2">
            <div className="history-aperture-window float-gentle-1 aspect-[16/10]">
              <DriveImage
                fileId={DRIVE_IMAGES.earlyUofC}
                alt="Early University of Calgary Campus"
                className="history-aperture-img"
              />
              <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/90 via-black/55 to-transparent text-white text-sm">
                <span className="font-bold">Early University of Calgary:</span> The formative northwest campus grounds where Calgary debaters first organized collegiate debate forums.
              </div>
            </div>
          </div>

          <div className="history-watermark-year text-right anim-focus-in select-none">1973</div>

          {/* Beat 2: 1973 Oil Boom, Lougheed & NEP */}
          <div className="max-w-3xl mr-auto -mt-10 mb-24 anim-slide-left delay-1">
            <h3 className="cardless-headline text-3xl sm:text-5xl mb-4">
              An Era of High-Stakes Debates
            </h3>
            <p className="cardless-lead-text mb-4">
              The 1973 global oil shock transformed Calgary almost overnight from a quiet regional post into Canada&apos;s corporate petroleum capital. Sky-scraping corporate towers reshaped the downtown skyline within months. Immense wealth collided with deepening political tensions.
            </p>
            <p className="cardless-sub-text">
              Premier Peter Lougheed championed provincial resource sovereignty against Ottawa, culminating in the fierce battles over Pierre Trudeau&apos;s 1980 National Energy Program (NEP). On campus, these were not hypothetical debate prompts—they were visceral struggles debated passionately on Friday evenings in the old Social Sciences lecture halls. These issues continue to echo into the present.
            </p>
          </div>

          {/* Aperture Window: Calgary 1970 Skyline */}
          <div className="max-w-xl mr-auto mb-32 anim-slide-left delay-2">
            <div className="history-aperture-window float-gentle-2 aspect-[16/10]">
              <DriveImage
                fileId={DRIVE_IMAGES.calgary1970}
                alt="Calgary Skyline in 1970"
                className="history-aperture-img"
              />
              <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/90 via-black/55 to-transparent text-white text-sm">
                <span className="font-bold">Downtown Calgary, 1970:</span> Resource extraction headquarters redefining the provincial landscape.
              </div>
            </div>
          </div>

          {/* Beat 3: 1971 CUSID Founding */}
          <div className="max-w-2xl ml-auto mb-20 anim-slide-right delay-3">
            <h3 className="cardless-headline text-2xl sm:text-4xl mb-4">
              Prairie Orators Enter CUSID West
            </h3>
            <p className="cardless-lead-text mb-4">
              In 1971, collegiate debaters across Canada unified under the <strong>Canadian University Society for Intercollegiate Debate (CUSID)</strong>. The Calgary debate society immediately affiliated with <strong>CUSID West</strong>, forging storied circuit rivalries with the University of Alberta, UBC, Simon Fraser, and Saskatchewan.
            </p>
            <p className="cardless-sub-text">
              Calgary debaters traveled across the nation, proving that Western debaters possessed an intellectual sharpness and pragmatic oratory that stood shoulder-to-shoulder with centuries-old Eastern societies like Hart House and McGill.
            </p>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 3: 1990s PARLIAMENTARY GOLDEN AGE */}
        {/* ================================================================= */}
        <section
          id="nineties"
          data-era-id="nineties"
          ref={(el) => registerSectionRef('nineties', el)}
          className="mb-56 scroll-mt-24 relative"
        >
          <div className="history-watermark-year anim-focus-in select-none">1990s</div>

          <div className="max-w-3xl mr-auto -mt-10 mb-20 anim-slide-left delay-1">
            <h2 className="cardless-headline mb-4">
              The Rise of Parliamentary Debating
            </h2>
            <p className="cardless-lead-text mb-4">
              The 1990s were an uncompromising golden age for Canadian intercollegiate debating. Contests were governed by the classic <strong>Canadian Parliamentary (CP)</strong> format—a rigorous two-on-two battle of wits shaped by sharp points of order, cross-floor heckles, and unscripted rhetorical delivery.
            </p>
            <p className="cardless-sub-text">
              Debaters received challenging policy motions with merely fifteen minutes of preparation, the same as today. Laptops and mobile phones did not exist, so debaters had to rely on memory, poise under pressure, and rapid extemporaneous rebuttal.
            </p>
          </div>

          {/* Aperture Window: 1990s Era Debaters */}
          <div className="max-w-xl ml-auto mb-28 anim-slide-right delay-2">
            <div className="history-aperture-window float-gentle-3 aspect-[16/10]">
              <DriveImage
                fileId={DRIVE_IMAGES.ninetiesImage}
                alt="1990s University of Calgary Debate Era"
                className="history-aperture-img"
              />
              <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/90 via-black/55 to-transparent text-white text-sm">
                <span className="font-bold">1990s Debate Union:</span> The golden era of parliamentary competition where Calgary orators regularly captured top speaker breaks.
              </div>
            </div>
          </div>

          {/* Achievements Placed Directly on the Page (Cardless) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-16 mb-24">
            <div className="space-y-4 anim-slide-left delay-1">
              <div className="p-2.5 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] w-fit">
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="cardless-headline text-2xl sm:text-4xl">
                McGoun Cup &amp; National Glory
              </h3>
              <p className="cardless-lead-text text-base sm:text-lg leading-relaxed">
                Calgary debaters surged across the circuit, claiming championships at the McGoun Cup in 1996-1997, and advancing deep into the out-rounds of CUSID Nationals and North Americans.
              </p>
            </div>

            <div className="space-y-4 anim-slide-right delay-2 md:translate-y-8">
              <div className="p-2.5 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] w-fit">
                <Globe2 className="w-5 h-5 text-[#0075A2] dark:text-[#53afd0]" />
              </div>
              <h3 className="cardless-headline text-2xl sm:text-4xl">
                Adopting British Parliamentary
              </h3>
              <p className="cardless-lead-text text-base sm:text-lg leading-relaxed">
                By the late 1990s, the society integrated four-team British Parliamentary debate, aligning Calgary with the World Universities Debating Championship (WUDC) and sending delegations worldwide.
              </p>
            </div>
          </div>

        </section>

        {/* ================================================================= */}
        {/* SECTION 4: 2000s (THE MILLENNIUM TURN & PROVINCIAL ALLIANCES) */}
        {/* ================================================================= */}
        <section
          id="two-thousands"
          data-era-id="two-thousands"
          ref={(el) => registerSectionRef('two-thousands', el)}
          className="mb-56 scroll-mt-24 relative"
        >
          <div className="history-watermark-year text-right anim-focus-in select-none">2000s</div>

          <div className="max-w-3xl ml-auto -mt-10 mb-20 anim-slide-right delay-1">
            <h2 className="cardless-headline mb-4">
              The Millennium Turn: Global Stages &amp; Club Expansion
            </h2>
            <p className="cardless-lead-text mb-4">
              The dawn of the 21st century launched UCDS onto the global circuit. While previous decades solidified regional dominance across western Canada, the 2000s saw Calgary delegations fly across the Atlantic and Pacific—representing the University of Calgary at the <strong>World Universities Debating Championship (WUDC)</strong> in Glasgow, Singapore, and Cork.
            </p>
            <p className="cardless-sub-text">
              Equally transformative was the birth of unified provincial debate coalitions. Calgary established enduring partnerships with the <strong>University of Alberta Debate Society (UADS)</strong> and the <strong>Alberta Debate and Speech Association (ADSA)</strong>, building statewide high school mentorship clinics and setting a high benchmark for intercollegiate argumentation.
            </p>
          </div>

          {/* Millennium Initiatives Placed Directly on Page (Cardless) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 mb-24">
            <div className="space-y-3.5 anim-slide-left delay-1">
              <div className="p-2.5 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] w-fit">
                <Globe2 className="w-5 h-5 text-[#0075A2] dark:text-[#53afd0]" />
              </div>
              <h3 className="cardless-headline text-xl sm:text-2xl">
                Worlds Debating
              </h3>
              <p className="cardless-lead-text text-base leading-relaxed">
                Calgary delegations competed against the best from Oxford, Harvard, Standford, Sydney, Monash, and a plethora of other world class institutions under the rigorous British Parliamentary format, consistently breaking to the elimination rounds.
              </p>
            </div>

            <div className="space-y-3.5 anim-scale-up delay-2 md:translate-y-6">
              <div className="p-2.5 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] w-fit">
                <Network className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              </div>
              <h3 className="cardless-headline text-xl sm:text-2xl">
                UADS &amp; ADSA
              </h3>
              <p className="cardless-lead-text text-base leading-relaxed">
                UCDS joined forces with the University of Alberta Debate Society (UADS) and Alberta Debate and Speech Association (ADSA) to strengthen the western circuit.
              </p>
            </div>

            <div className="space-y-3.5 anim-slide-right delay-3 md:translate-y-12">
              <div className="p-2.5 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] w-fit">
                <Users className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              </div>
              <h3 className="cardless-headline text-xl sm:text-2xl">
                Mentorship
              </h3>
              <p className="cardless-lead-text text-base leading-relaxed">
                Calgary high school programs have historically been some of the strongest in the country, and UCDS has played a significant role in that development. Calgary's roots run deep.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 5: 2010s TO 2020s (WINDING LINE LOGO EVOLUTION) */}
        {/* ================================================================= */}
        <section
          id="twenty-tens"
          data-era-id="twenty-tens"
          ref={(el) => registerSectionRef('twenty-tens', el)}
          className="mb-56 scroll-mt-24 relative"
        >
          <div className="history-watermark-year text-right anim-focus-in select-none">2020</div>

          <div className="max-w-3xl ml-auto -mt-10 mb-24 anim-slide-right delay-1">
            <h2 className="cardless-headline mb-4">
              Tournaments, Virtualization &amp; Pandemic Resilience
            </h2>
            <p className="cardless-lead-text mb-4">
              Calgary cemented its role as a tournaments hub by inaugurating the <strong>Dino Cup</strong> and <strong>Calgary Open</strong>, welcoming teams from across North America. When the COVID-19 pandemic struck in 2020, UCDS engineered a rapid digital pivot, sustaining debate across Discord and digital pairing platforms and connecting students across time zones.
            </p>
            <p className="cardless-sub-text">
              When the COVID-19 pandemic closed campuses in March 2020, UCDS engineered a rapid digital transition. Operating across Discord and digital pairing systems, Calgary provided an indispensable intellectual haven for students, connecting across European and Asian time zones without borders.
            </p>
          </div>

          {/* WINDING LINE OF LOGOS */}
          <div className="winding-logo-stage anim-scale-up delay-2">
            <div className="text-center mb-12">
              <h3 className="cardless-headline text-3xl sm:text-5xl">
                Transformation and Rebranding
              </h3>
            </div>

            <div className="winding-logo-stream">
              <div className="winding-logo-node">
                <div className="winding-logo-medallion">
                  <DriveImage
                    fileId={DRIVE_IMAGES.logoBefore2017}
                    alt="UCDS Logo Pre-2017"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="winding-year-badge">Pre-2017</span>
              </div>

              <div className="winding-arrow-connector hidden md:flex">
                <ArrowRight className="w-10 h-10" />
              </div>

              <div className="winding-logo-node">
                <div className="winding-logo-medallion">
                  <DriveImage
                    fileId={DRIVE_IMAGES.logo2017_2019}
                    alt="UCDS Logo 2017-2019"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="winding-year-badge">2017–2019</span>
              </div>

              <div className="winding-arrow-connector hidden md:flex">
                <ArrowRight className="w-10 h-10" />
              </div>

              <div className="winding-logo-node winding-logo-current">
                <div className="winding-logo-medallion">
                  <DriveImage
                    fileId={DRIVE_IMAGES.logo2019_present}
                    alt="UCDS Current Crest 2019-Present"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="winding-year-badge">2019–Present</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 6: THE PRESENT (AI ERA & CRITICAL THOUGHT) */}
        {/* ================================================================= */}
        <section
          id="present"
          data-era-id="present"
          ref={(el) => registerSectionRef('present', el)}
          className="mb-56 scroll-mt-24 relative"
        >
          <div className="history-watermark-year anim-focus-in select-none">2026</div>

          <div className="max-w-3xl mr-auto -mt-10 mb-20 anim-slide-left delay-1">
            <h2 className="cardless-headline mb-4">
              Spoken Reason in an Automated World
            </h2>
            <p className="cardless-lead-text mb-4">
              Artificial intelligence can generate text and simulate conviction in seconds. But genuine intellect is not the automated generation of language—it is the courageous capacity to <strong>interrogate assertions, detect subtle logical fallacies, and evaluate human values in real time</strong>.
            </p>
          </div>

          {/* Cardless Editorial: The Echo Chamber vs The Antidote (Directly on Page) */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-12 sm:gap-16 mb-24">
            <div className="space-y-4 anim-slide-left delay-2">
              <div className="p-2.5 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 w-fit">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="cardless-headline text-2xl sm:text-4xl text-rose-600 dark:text-rose-400">
                The Algorithmic Echo Chamber
              </h3>
              <p className="cardless-lead-text text-base sm:text-lg leading-relaxed">
                Social media feeds have fragmented communities into defensive silos. Organic, spontaneous human connection has withered, replaced by curated outrage that rewards conformism and punishes open inquiry.
              </p>
            </div>

            <div className="space-y-4 anim-slide-right delay-3 md:translate-y-8">
              <div className="p-2.5 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] w-fit">
                <Zap className="w-5 h-5 text-[#0075A2] dark:text-[#53afd0]" />
              </div>
              <h3 className="cardless-headline text-2xl sm:text-4xl text-[#0075A2] dark:text-[#53afd0]">
                The UCDS Antidote
              </h3>
              <p className="cardless-lead-text text-base sm:text-lg leading-relaxed">
                The University of Calgary Debate Society serves as a radical counterweight. Here, students step away from screens, stand before a room of peers, and engage in unscripted, spoken deliberation where opposing ideas are welcomed as the raw material of truth. We build community, form life-long bonds and prepare students for an ever-evolving world that requires serious mental fortitude, creativity, and the courage to speak one&apos;s mind.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 7: CARDLESS CINEMATIC TITANS (SMITH & NENSHI) */}
        {/* ================================================================= */}
        <section
          id="titans"
          data-era-id="titans"
          ref={(el) => registerSectionRef('titans', el)}
          className="mb-56 scroll-mt-24 relative"
        >
          <div className="titans-creative-stage">
            <div className="text-center max-w-3xl mx-auto mb-20 anim-scale-up">
              <h2 className="cardless-headline text-3xl sm:text-5xl md:text-6xl mb-4">
                Two Titans, One Campus Floor
              </h2>
              <p className="cardless-lead-text max-w-2xl mx-auto">
                Before guiding provincial policy or presiding over major city halls, two of Alberta&apos;s most formidable orators shared the collegiate debate circuit at the University of Calgary in the early 1990s.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
              {/* Danielle Smith Side */}
              <div className="space-y-6 anim-slide-left delay-1">
                <div className="titan-feathered-portrait float-gentle-1">
                  <DriveImage
                    fileId={DRIVE_IMAGES.danielleSmith}
                    alt="Danielle Smith"
                    wrapperClassName="w-full h-full"
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute top-4 left-4 px-3.5 py-1.5 rounded-full text-xs font-black bg-black/75 backdrop-blur-md text-amber-300 border border-amber-300/40">
                    UCalgary Alumna
                  </div>
                </div>

                <div>
                  <h3 className="cardless-headline text-3xl sm:text-4xl mb-1">
                    Danielle Smith
                  </h3>
                  <p className="text-sm font-semibold opacity-70 mb-4">
                    B.A. English &amp; Economics · Former PC Campus Club President
                  </p>
                  <p className="cardless-lead-text leading-relaxed">
                    During her undergraduate years in the early 1990s, Danielle Smith actively competed in campus and intercollegiate debate. Steeped in Canadian Parliamentary procedure, she forged her signature rhetorical attributes: structured proposition delivery, methodical anticipation of counterarguments, and the poise to navigate intense cross-examinations without hesitation.
                  </p>
                </div>
              </div>

              {/* Naheed Nenshi Side */}
              <div className="space-y-6 anim-slide-right delay-2">
                <div className="titan-feathered-portrait float-gentle-2 ml-auto">
                  <DriveImage
                    fileId={DRIVE_IMAGES.naheedNenshi}
                    alt="Naheed Nenshi"
                    wrapperClassName="w-full h-full flex items-end justify-center"
                    className="w-full h-full object-contain object-bottom scale-110 translate-x-3 translate-y-1"
                  />
                  <div className="absolute top-4 right-4 px-3.5 py-1.5 rounded-full text-xs font-black bg-black/75 backdrop-blur-md text-cyan-300 border border-cyan-300/40">
                    UCalgary Alumnus
                  </div>
                </div>

                <div className="text-left md:text-right">
                  <h3 className="cardless-headline text-3xl sm:text-4xl mb-1">
                    Naheed Nenshi
                  </h3>
                  <p className="text-sm font-semibold opacity-70 mb-4">
                    B.Comm · Former Students&apos; Union President (1991–1992)
                  </p>
                  <p className="cardless-lead-text leading-relaxed">
                    Naheed Nenshi was a celebrated competitor across the western Canadian debate circuit. Renowned for sharp extemporaneous wit, rapid rebuttal delivery, and persuasive narrative framing, his undergraduate debating career honed the communication mastery and agility under pressure that would later characterize his public life.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-24 text-center max-w-3xl mx-auto anim-lift-up delay-3">
              <p className="text-xl sm:text-2xl font-serif italic leading-relaxed opacity-95">
                Beyond political ideology, their shared history in the University of Calgary debate community demonstrates what debate makes possible: testing ideas rigorously, speaking with conviction, and respecting the opposing benches across the floor.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SECTION 8: CLUB GOALS FOR 2026-2027 ("AN AED TO CAMPUS CULTURE") */}
        {/* ================================================================= */}
        <section
          id="vision"
          data-era-id="vision"
          ref={(el) => registerSectionRef('vision', el)}
          className="mb-52 scroll-mt-24 relative"
        >
          {/* Heartrate Monitor Line (Behind Year 2027 and Title - NO background, NO outline, only highlighted moving line) */}
          <div className="relative mb-16">
            <div className="vision-heartrate-line-stage" aria-hidden="true">
              <svg className="w-full h-full" viewBox="0 0 540 90" preserveAspectRatio="xMidYMid meet">
                <path
                  d="M 0,45 L 130,45 Q 150,36 170,45 L 210,45 L 225,52 L 245,8 L 265,78 L 285,45 L 320,45 Q 350,30 380,45 L 540,45"
                  className="vision-heartrate-active-line"
                />
              </svg>
            </div>

            <div className="history-watermark-year anim-focus-in select-none">2027</div>

            <div className="relative z-10 max-w-3xl mr-auto -mt-10 mb-16 anim-slide-left delay-1">
              <h2 className="cardless-headline mb-4">
                An AED to Campus Culture: Re-Igniting Dialogue in Calgary
              </h2>
              <p className="cardless-lead-text mb-4">
                For the 2026–2027 academic year, UCDS has set an ambitious mandate: to act as an <strong>engine to campus culture</strong>—injecting vitality, spontaneous community, and intellectual friction back into university life.
              </p>
              <p className="cardless-sub-text">
                Following years of post-pandemic fragmentation and algorithmically induced social fatigue, university campuses risk becoming transactional spaces where students commute, study in isolation, and leave. UCDS is committed to shattering that passivity through live, spoken discourse and multi-disciplinary social events.
              </p>
              <p className="cardless-sub-text">
                <a
                  href="https://www.youtube.com/watch?v=ivVPJhYM8Ng&vl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-wavy decoration-amber-300/70 underline-offset-4 hover:decoration-amber-300"
                >
                  Terrence Tao said it best
                </a>
              </p>
            </div>
          </div>

          {/* Vision Blueprint Tiled in Rows of Two & Compact with Gentle Floating Buoyancy (Uniform Card Colors) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mr-auto mb-16">
            {/* Pillar 1: Guest Speakers */}
            <div className="float-gentle-1 anim-scale-up">
              <div className="vision-pillar-item">
                <div className="p-3 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] w-fit mb-3">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-[#0075A2] dark:text-[#53afd0] mb-1">
                  Masterclasses &amp; Adjudication
                </div>
                <h3 className="text-xl font-bold font-title text-[#0E1329] dark:text-[#F6F6F6] mb-2">
                  Guest Speakers &amp; Clinics
                </h3>
                <p className="text-sm text-[#0E1329]/90 dark:text-[#F6F6F6]/90 leading-relaxed">
                  Welcoming national and international champions, World Universities Debating Championship (WUDC) finalists, and elite Chief Adjudicators to Calgary for high-intensity argumentation masterclasses and certification workshops.
                </p>
              </div>
            </div>

            {/* Pillar 2: Thought and Industry Leaders */}
            <div className="float-gentle-2 anim-scale-up delay-1">
              <div className="vision-pillar-item">
                <div className="p-3 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] w-fit mb-3">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-[#0075A2] dark:text-[#53afd0] mb-1">
                  Civic &amp; Industry Frontiers
                </div>
                <h3 className="text-xl font-bold font-title text-[#0E1329] dark:text-[#F6F6F6] mb-2">
                  Thought &amp; Industry Leaders
                </h3>
                <p className="text-sm text-[#0E1329]/90 dark:text-[#F6F6F6]/90 leading-relaxed">
                  Connecting debate rounds with Calgary&apos;s legal, corporate, policy, and technology frontiers. Hosting symposia with King&apos;s Counsel litigators, energy transition strategists, and civic innovators to interrogate real-world public dilemmas.
                </p>
              </div>
            </div>

            {/* Pillar 3: Social Events */}
            <div className="float-gentle-3 anim-scale-up delay-2">
              <div className="vision-pillar-item">
                <div className="p-3 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] w-fit mb-3">
                  <PartyPopper className="w-5 h-5" />
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-[#0075A2] dark:text-[#53afd0] mb-1">
                  Re-Igniting Camaraderie
                </div>
                <h3 className="text-xl font-bold font-title text-[#0E1329] dark:text-[#F6F6F6] mb-2">
                  Vibrant Social Gatherings
                </h3>
                <p className="text-sm text-[#0E1329]/90 dark:text-[#F6F6F6]/90 leading-relaxed">
                  Breathing joy and spontaneous community back into undergraduate life. Monthly pub nights at the Den, casual &ldquo;hot takes&rdquo; mixers, showcase rounds in the Black Lounge, and welcoming novice retreats.
                </p>
              </div>
            </div>

            {/* Pillar 4: Cross-Campus Collaborations */}
            <div className="float-gentle-4 anim-scale-up delay-2">
              <div className="vision-pillar-item">
                <div className="p-3 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] w-fit mb-3">
                  <Network className="w-5 h-5" />
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-[#0075A2] dark:text-[#53afd0] mb-1">
                  Dismantling Silos
                </div>
                <h3 className="text-xl font-bold font-title text-[#0E1329] dark:text-[#F6F6F6] mb-2">
                  Cross-Campus Collaborations
                </h3>
                <p className="text-sm text-[#0E1329]/90 dark:text-[#F6F6F6]/90 leading-relaxed">
                  Breaking faculty isolation by co-hosting debates with Engineering, Pre-Law, Philosophy, Haskayne Business, and Science societies on bioethics, AI governance, and energy transition.
                </p>
              </div>
            </div>

            {/* Pillar 5: Energizing Campus Grounds */}
            <div className="float-gentle-1 anim-scale-up delay-3">
              <div className="vision-pillar-item">
                <div className="p-3 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] w-fit mb-3">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-[#0075A2] dark:text-[#53afd0] mb-1">
                  Public Arenas
                </div>
                <h3 className="text-xl font-bold font-title text-[#0E1329] dark:text-[#F6F6F6] mb-2">
                  Energizing Campus Grounds
                </h3>
                <p className="text-sm text-[#0E1329]/90 dark:text-[#F6F6F6]/90 leading-relaxed">
                  Exhibition debates in MacEwan Hall, open-microphone policy town halls, and conversational arenas that transform mundane university corridors into buzzing amphitheaters of reasoned speech.
                </p>
              </div>
            </div>

            {/* Pillar 6: Strengthening the Canadian Circuit */}
            <div className="float-gentle-2 anim-scale-up delay-3">
              <div className="vision-pillar-item">
                <div className="p-3 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] w-fit mb-3">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-[#0075A2] dark:text-[#53afd0] mb-1">
                  Circuit Leadership
                </div>
                <h3 className="text-xl font-bold font-title text-[#0E1329] dark:text-[#F6F6F6] mb-2">
                  Strengthening the Circuit
                </h3>
                <p className="text-sm text-[#0E1329]/90 dark:text-[#F6F6F6]/90 leading-relaxed">
                  Asserting bold leadership in CUSID West, expanding our signature Dino Cup into a premier national open, and building deep competitive bridges across Canada and international circuits.
                </p>
              </div>
            </div>

            {/* Pillar 7: Creating New Talent */}
            <div className="float-gentle-3 md:col-span-2 md:max-w-xl md:mx-auto anim-scale-up delay-4">
              <div className="vision-pillar-item">
                <div className="p-3 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] w-fit mb-3">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-[#0075A2] dark:text-[#53afd0] mb-1">
                  Empowering Novices
                </div>
                <h3 className="text-xl font-bold font-title text-[#0E1329] dark:text-[#F6F6F6] mb-2">
                  Cultivating New Talent
                </h3>
                <p className="text-sm text-[#0E1329]/90 dark:text-[#F6F6F6]/90 leading-relaxed">
                  Novice accelerator programs, peer-led adjudication clinics, and barrier-free one-on-one mentorship to ensure every undergraduate can uncover their oratorical confidence and analytical clarity.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* CHAOTIC MODERN WORLD SYMBOLIC SECTION */}
        {/* ================================================================= */}
        <section className="chaotic-world-stage anim-scale-up">
          <div className="chaotic-grid-distortion" aria-hidden="true" />

          {/* Falling Leaves Issues Layer in Background */}
          <div className="chaotic-falling-leaves-stage" aria-hidden="true">
            {FALLING_ISSUES.map((issue) => (
              <div
                key={issue.text}
                className={`falling-leaf-shard ${issue.theme}`}
                style={{
                  left: `${issue.left}%`,
                  animationDelay: `${issue.delay}s`,
                  animationDuration: `${issue.duration}s`,
                }}
              >
                <issue.icon className="w-3.5 h-3.5" />
                <span>{issue.text}</span>
              </div>
            ))}
          </div>

          <div className="relative z-10 text-center max-w-3xl mx-auto mb-4">
            <h2 className="cardless-headline text-3xl sm:text-5xl text-white mb-2">
              A World Fragmented by Outrage &amp; Automation
            </h2>
          </div>

          {/* The Anchor Resolution */}
          <div className="chaotic-anchor-resolution">
            <h3 className="text-2xl sm:text-4xl font-bold font-title text-white mb-4">
              In a World of Chaos, Debate is Your Anchor
            </h3>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-normal">
              We do not accept passive cynicism. We refuse to surrender human conviction to predictive algorithms. When you step onto the debate floor, you look your peers in the eye, test opposing convictions with empathy and rigour, and reclaim your voice in the living forum of reasoned speech.
            </p>
          </div>
        </section>

        {/* ================================================================= */}
        {/* INSPIRATIONAL CALL-TO-ACTION: THE WORLD NEEDS YOU MORE THAN EVER */}
        {/* ================================================================= */}
        <section className="history-cta-arena anim-scale-up">
          <div className="cta-pulse-halo" aria-hidden="true" />
          <div className="max-w-3xl mx-auto space-y-6 relative z-10">
            <div className="cta-needs-you-badge">
              <Sparkles className="w-4 h-4 text-cyan-300 animate-spin-subtle" />
              <span>The world needs you more than ever.</span>
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black font-title text-white">
              Claim Your Seat at the Table
            </h2>
            <p className="text-base sm:text-lg text-white/90 leading-relaxed font-normal max-w-2xl mx-auto">
              You walk the exact same lecture halls. You study in the exact same campus spaces. The ability to articulate your convictions, dissect complex arguments, and command any room is not born—it is trained.
            </p>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => smoothNavigate('/member/register')}
                className="btn-cta-primary group"
              >
                <span>Join the Debate Society</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* Return to Top Button */}
        <div className="text-center py-6">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold bg-[#0E1329] dark:bg-[#0075A2] text-white hover:opacity-90 shadow-xl transition-all cursor-pointer hover:scale-105"
          >
            <span>Return to Top of Timeline</span>
            <ChevronRight className="w-4 h-4 rotate-[-90deg]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OurStoryHistory;
