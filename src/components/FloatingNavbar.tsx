import React, { useState, useRef, useEffect } from 'react';
import {
  Info,
  Calendar,
  Share2,
  Users,
  Megaphone,
  BookOpen,
  ChevronRight,
  X,
} from 'lucide-react';
import { useSmoothNavigate } from '@/utils/navigation';

interface SubcategoryItem {
  title: string;
  href: string;
  desc: string;
}

interface NavCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  subcategories: SubcategoryItem[];
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'about',
    name: 'About',
    icon: Info,
    subcategories: [
      { title: 'Our Story & History', href: '/about/history', desc: 'Debate excellence since 1966' },
      { title: 'Executive Team', href: '/about/executives', desc: 'Meet society leadership' },
      { title: 'Debate Formats', href: '/about/formats', desc: 'BP, CP, and APDA styles' },
      { title: 'Constitution & Bylaws', href: '/about/constitution', desc: 'Governance & standards' },
    ],
  },
  {
    id: 'events',
    name: 'Events',
    icon: Calendar,
    subcategories: [
      { title: 'Weekly Practices', href: '/events/practices', desc: 'Tuesdays & Thursdays training' },
      { title: 'Tournaments & Opens', href: '/events/tournaments', desc: 'Upcoming invitationals' },
      { title: 'High School Debate', href: '/events/high-school', desc: 'Calgary high school tournament' },
      { title: 'Event Calendar', href: '/events/calendar', desc: 'Full semester schedule' },
    ],
  },
  {
    id: 'connect',
    name: 'Connect',
    icon: Share2,
    subcategories: [
      { title: 'Discord Community', href: 'https://discord.gg/ucds', desc: 'Join active discussion channels' },
      { title: 'Social Media', href: '/connect/socials', desc: 'Instagram, YouTube, and X' },
      { title: 'Contact Us', href: '/connect/contact', desc: 'General & executive inquiries' },
      { title: 'Partners & Sponsors', href: '/connect/partners', desc: 'Institutional partnerships' },
    ],
  },
  {
    id: 'members',
    name: 'Members',
    icon: Users,
    subcategories: [
      { title: 'Membership Portal', href: '/member/portal', desc: 'Active members profile & hub' },
      { title: 'Member Login', href: '/member/login', desc: 'Sign in to access your portal' },
      { title: 'Join / Register', href: '/member/register', desc: 'Become an official member' },
      { title: 'Mailing Preferences', href: '/member/unsubscribe', desc: 'Manage or unsubscribe newsletters' },
    ],
  },
  {
    id: 'communications',
    name: 'Communications',
    icon: Megaphone,
    subcategories: [
      { title: 'Announcements', href: '/communications/announcements', desc: 'Official society updates' },
      { title: 'Newsletter & Mailing List', href: '/communications/newsletter', desc: 'Subscribe to weekly digest' },
      { title: 'Motion Archive', href: '/communications/motions', desc: 'Past tournament debate motions' },
    ],
  },
  {
    id: 'resources',
    name: 'Resources',
    icon: BookOpen,
    subcategories: [
      { title: 'Novice Debate Guide', href: '/resources/guide', desc: 'Core fundamentals & structure' },
      { title: 'Speaker & Motion Prep', href: '/resources/prep', desc: 'Strategy & matter files' },
      { title: 'Adjudication Guide', href: '/resources/adjudication', desc: 'Judging rubrics & scoring' },
      { title: 'Useful Links & CUSID', href: '/resources/links', desc: 'Debate circuit resources' },
    ],
  },
];

export const FloatingNavbar: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const smoothNavigate = useSmoothNavigate();

  // Close subcategories drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveCategory(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleCategory = (id: string) => {
    setActiveCategory((prev) => (prev === id ? null : id));
  };

  const selectedCategoryObj = NAV_CATEGORIES.find((cat) => cat.id === activeCategory);

  return (
    <nav
      ref={containerRef}
      className={`floating-nav-container ${activeCategory ? 'has-active-menu' : ''}`}
      aria-label="Main floating navigation"
    >
      {/* Pillar with 6 main icons */}
      <div className="floating-nav-pillar">
        {NAV_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;

          return (
            <button
              key={category.id}
              onClick={() => handleToggleCategory(category.id)}
              className={`nav-item-btn ${isActive ? 'active' : ''}`}
              aria-label={`Toggle ${category.name} menu`}
              aria-expanded={isActive}
            >
              <Icon className="w-5 h-5 transition-transform duration-300" />
              {/* Expandable Hover Tooltip */}
              <span className="nav-tooltip">{category.name}</span>
            </button>
          );
        })}
      </div>

      {/* Subcategories Sliding Drawer (Smooth category switch with key & staggered items) */}
      {selectedCategoryObj && (
        <div key={selectedCategoryObj.id} className="subcategories-drawer">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#1C244C]/15 dark:border-[#53afd0]/20">
            <div className="flex items-center gap-2">
              <selectedCategoryObj.icon className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
              <span className="drawer-header-title">
                {selectedCategoryObj.name}
              </span>
            </div>
            <button
              onClick={() => setActiveCategory(null)}
              className="p-1 rounded-lg text-[#1C244C]/70 dark:text-[#F6F6F6]/70 hover:bg-[#1C244C]/10 dark:hover:bg-[#53afd0]/20 transition"
              aria-label="Close category menu"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {selectedCategoryObj.subcategories.map((sub, idx) => {
              const isExternal = sub.href.startsWith('http://') || sub.href.startsWith('https://');

              return (
                <div
                  key={sub.title}
                  className="subcategory-animated-item"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  {isExternal ? (
                    <a
                      href={sub.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="subcategory-link group"
                      onClick={() => setActiveCategory(null)}
                    >
                      <div>
                        <div className="subcategory-title">{sub.title}</div>
                        <div className="subcategory-desc">{sub.desc}</div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#0075A2] dark:text-[#53afd0]" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="subcategory-link group w-full text-left cursor-pointer"
                      onClick={() => {
                        setActiveCategory(null);
                        smoothNavigate(sub.href);
                      }}
                    >
                      <div>
                        <div className="subcategory-title">{sub.title}</div>
                        <div className="subcategory-desc">{sub.desc}</div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#0075A2] dark:text-[#53afd0]" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};
