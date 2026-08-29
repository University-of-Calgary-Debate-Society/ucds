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
      { title: 'Membership Portal', href: '/member/dashboard', desc: 'Active members hub' },
      { title: 'Executive Portal', href: '/executive/portal', desc: 'Restricted leadership portal' },
      { title: 'Join / Register', href: '/member/register', desc: 'Become an official member' },
      { title: 'Adjudication Log', href: '/member/judging', desc: 'Track tournament judging' },
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
      className="floating-nav-container"
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

      {/* Subcategories Sliding Drawer (to the right) */}
      {selectedCategoryObj && (
        <div className="subcategories-drawer">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#1C244C]/10 dark:border-[#53afd0]/20">
            <div className="flex items-center gap-2">
              <selectedCategoryObj.icon className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
              <span className="font-title font-bold text-sm text-[#1C244C] dark:text-[#F6F6F6]">
                {selectedCategoryObj.name}
              </span>
            </div>
            <button
              onClick={() => setActiveCategory(null)}
              className="p-1 rounded-lg text-[#1C244C]/60 dark:text-[#F6F6F6]/60 hover:bg-[#1C244C]/10 dark:hover:bg-[#53afd0]/20 transition"
              aria-label="Close category menu"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {selectedCategoryObj.subcategories.map((sub) => (
              <a
                key={sub.title}
                href={sub.href}
                className="subcategory-link group"
                onClick={() => setActiveCategory(null)}
              >
                <div>
                  <div className="font-semibold text-xs text-[#1C244C] dark:text-[#F6F6F6] group-hover:text-[#0075A2] dark:group-hover:text-[#53afd0] transition-colors">
                    {sub.title}
                  </div>
                  <div className="text-[11px] text-[#0075A2]/80 dark:text-[#cbd5e1]/70">
                    {sub.desc}
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#0075A2] dark:text-[#53afd0]" />
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};
