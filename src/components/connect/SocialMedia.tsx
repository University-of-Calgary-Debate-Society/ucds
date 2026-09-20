import React, { useEffect, useState, useRef } from 'react';
import { Mail, ExternalLink, ArrowRight, Send, AlertTriangle, Globe, Bookmark, Link as LinkIcon } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUcdsOrganization, type OrganizationDoc } from '@/services/userService';
import { type OtherLinkItem } from '@/services/organizationService';
import { clientCache } from '@/utils/clientCache';
import { getAssetUrl } from '@/utils/assetUrl';

interface SocialPlatformConfig {
  key: string;
  name: string;
  tag: string;
  handle: string;
  iconPath: string;
  defaultUrl: string;
  ctaText: string;
}

// Canonical Social Media Platforms for UCDS (Website is explicitly excluded)
const PLATFORMS_ORDER: SocialPlatformConfig[] = [
  {
    key: 'discord',
    name: 'Discord Community',
    tag: 'Official Community Hub',
    handle: 'discord.gg/ucds',
    iconPath: 'images/icons/discord_icon.png',
    defaultUrl: 'https://discord.gg/ucds',
    ctaText: 'Join Discord',
  },
  {
    key: 'instagram',
    name: 'Instagram',
    tag: 'Stories & Event Photos',
    handle: '@ucalgarydebate',
    iconPath: 'images/icons/instagram_icon.png',
    defaultUrl: 'https://instagram.com/ucalgarydebate',
    ctaText: 'Follow Instagram',
  },
  {
    key: 'youtube',
    name: 'YouTube',
    tag: 'Debate Rounds & Seminars',
    handle: '@ucalgarydebatesociety',
    iconPath: 'images/icons/youtube_icon.png',
    defaultUrl: 'https://youtube.com/@ucalgarydebatesociety',
    ctaText: 'Watch on YouTube',
  },
  {
    key: 'x',
    name: 'X (Twitter)',
    tag: 'Live Motions & Notices',
    handle: '@ucalgarydebate',
    iconPath: 'images/icons/x_icon.png',
    defaultUrl: 'https://x.com/ucalgarydebate',
    ctaText: 'Follow on X',
  },
  {
    key: 'facebook',
    name: 'Facebook',
    tag: 'Society Page & Events',
    handle: 'University of Calgary Debate Society',
    iconPath: 'images/icons/facebook_icon.png',
    defaultUrl: 'https://facebook.com/ucalgarydebate',
    ctaText: 'Visit Facebook',
  },
  {
    key: 'linktree',
    name: 'Linktree',
    tag: 'All Quick Resources',
    handle: 'linktr.ee/ucalgarydebate',
    iconPath: 'images/icons/linktree_icon.png',
    defaultUrl: 'https://linktr.ee/ucalgarydebate',
    ctaText: 'Open Linktree',
  },
];

export const SocialMedia: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'socials' | 'other'>('socials');
  const [firestoreLinks, setFirestoreLinks] = useState<Record<string, string>>({});
  const [otherLinks, setOtherLinks] = useState<OtherLinkItem[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Guarantee background video plays continuously
  useEffect(() => {
    const playVideo = () => {
      if (videoRef.current) {
        videoRef.current.defaultMuted = true;
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }
    };

    playVideo();
    window.addEventListener('focus', playVideo);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') playVideo();
    });

    return () => {
      window.removeEventListener('focus', playVideo);
    };
  }, []);

  // Fetch and listen to Firestore document `university-of-calgary-debate-society`
  // Updates ONCE on initial load and only when an executive updates the document
  useEffect(() => {
    // 1. Initial cached fallback for instant rendering without flash
    const cachedOrg = clientCache.get<OrganizationDoc>('org_ucds');
    if (cachedOrg) {
      if (cachedOrg.links) {
        const norm: Record<string, string> = {};
        Object.entries(cachedOrg.links).forEach(([k, v]) => {
          const cleanK = k.trim().toLowerCase();
          if (cleanK !== 'website' && typeof v === 'string' && v.trim().length > 0) {
            norm[cleanK] = v.trim();
          }
        });
        setFirestoreLinks(norm);
      }
      if (cachedOrg['links-other']) {
        const parsedOther: OtherLinkItem[] = [];
        const sorted = Object.entries(cachedOrg['links-other']).sort((a, b) => {
          const numA = parseInt(a[0], 10);
          const numB = parseInt(b[0], 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a[0].localeCompare(b[0]);
        });
        sorted.forEach(([, val]) => {
          if (val && typeof val === 'object') {
            parsedOther.push({
              name: val.name || '',
              link: val.link || '',
              description: val.description || '',
            });
          }
        });
        setOtherLinks(parsedOther);
      }
    }

    // 2. Real-time single document subscription
    if (!db) {
      getUcdsOrganization().then((org) => {
        if (org && org.links) {
          const norm: Record<string, string> = {};
          Object.entries(org.links).forEach(([k, v]) => {
            const cleanK = k.trim().toLowerCase();
            if (cleanK !== 'website' && typeof v === 'string') norm[cleanK] = v.trim();
          });
          setFirestoreLinks(norm);
        }
      });
      return;
    }

    const docRef = doc(db, 'Organizations', 'university-of-calgary-debate-society');
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists() && docSnap.id !== '_default') {
          const data = docSnap.data();

          // Sync social links
          if (data.links && typeof data.links === 'object') {
            const normalized: Record<string, string> = {};
            Object.entries(data.links).forEach(([key, url]) => {
              const cleanKey = key.trim().toLowerCase();
              if (cleanKey !== 'website' && typeof url === 'string' && url.trim().length > 0) {
                normalized[cleanKey] = url.trim();
              }
            });
            setFirestoreLinks(normalized);
          }

          // Sync links-other nested map
          const rawOther = data['links-other'] || data.linksOther;
          if (rawOther && typeof rawOther === 'object' && !Array.isArray(rawOther)) {
            const sorted = Object.entries(rawOther as Record<string, unknown>).sort((a, b) => {
              const numA = parseInt(a[0], 10);
              const numB = parseInt(b[0], 10);
              if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
              return a[0].localeCompare(b[0]);
            });

            const parsedOther: OtherLinkItem[] = [];
            sorted.forEach(([, val]) => {
              if (val && typeof val === 'object') {
                const item = val as Record<string, unknown>;
                const name = typeof item.name === 'string' ? item.name.trim() : '';
                const link = typeof item.link === 'string' ? item.link.trim() : '';
                const description = typeof item.description === 'string' ? item.description.trim() : '';
                if (name || link) {
                  parsedOther.push({ name, link, description });
                }
              }
            });
            setOtherLinks(parsedOther);
          }

          // Cache document on client to conserve server reads
          clientCache.set('org_ucds', { id: docSnap.id, ...data }, 30 * 60 * 1000);
        }
      },
      (err) => {
        console.warn('onSnapshot listener notice:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Build list of active social cards, merging Firestore links with fallbacks
  const socialCards = PLATFORMS_ORDER.map((platform) => {
    const firestoreUrl =
      firestoreLinks[platform.key] ||
      (platform.key === 'x' ? firestoreLinks['twitter'] : undefined);

    const activeUrl = firestoreUrl || platform.defaultUrl;

    return {
      ...platform,
      url: activeUrl,
    };
  });

  return (
    <div className="socials-page-container">
      {/* 1. Viewport-Pinned Background Video */}
      <div className="socials-video-wrapper" aria-hidden="true">
        <video
          ref={videoRef}
          src={getAssetUrl('videos/SocialMediaBackground.mp4')}
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
          onLoadedData={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
          className="socials-video-element"
        />
        {/* High-Contrast Light/Dark Mode Overlay for Maximum Video Visibility and Text Readability */}
        <div className="socials-video-overlay" />
      </div>

      {/* Main Content Layer */}
      <div className="socials-content-layer">
        {/* Sleek Tab Selector */}
        <div className="socials-tabs-container">
          <button
            type="button"
            onClick={() => setActiveTab('socials')}
            className={`socials-tab-btn ${activeTab === 'socials' ? 'active' : ''}`}
            aria-label="View Social Media Channels"
          >
            <Globe className="w-4 h-4" />
            <span>Social Media</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('other')}
            className={`socials-tab-btn ${activeTab === 'other' ? 'active' : ''}`}
            aria-label="View Other Resource Links"
          >
            <Bookmark className="w-4 h-4" />
            <span>Other Links</span>
            {otherLinks.length > 0 && (
              <span className="tab-counter-pill">{otherLinks.length}</span>
            )}
          </button>
        </div>

        {/* TAB 1: SOCIAL MEDIA */}
        {activeTab === 'socials' && (
          <div key="socials" className="tab-content-panel tab-content-enter w-full">
            {/* MOBILE VIEW: Just display the icons for the associated social media platforms */}
            <div className="mobile-social-icons-wrapper md:hidden" role="list">
              <div className="mobile-social-icons-grid">
                {socialCards.map((item) => (
                  <a
                    key={item.key}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mobile-social-icon-item group"
                    aria-label={`Open ${item.name}`}
                    title={item.name}
                  >
                    <div className="mobile-icon-circle">
                      <img
                        src={getAssetUrl(item.iconPath)}
                        alt={`${item.name} icon`}
                        className="w-10 h-10 object-contain drop-shadow-md group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <span className="mobile-icon-label">{item.name.replace(' Community', '')}</span>
                  </a>
                ))}

                {/* Mobile Direct Email Icon */}
                <a
                  href="mailto:debate@ucds.ca"
                  className="mobile-social-icon-item group"
                  aria-label="Send email to debate@ucds.ca"
                  title="Society Email"
                >
                  <div className="mobile-icon-circle">
                    <Mail className="w-9 h-9 text-[#0075A2] dark:text-[#53afd0] drop-shadow-md group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="mobile-icon-label">Email</span>
                </a>
              </div>
            </div>

            {/* DESKTOP VIEW: Expanded Cards with 1/2 Spacing, Enlarge Icons, and Linktree Notice */}
            <div className="hidden md:flex socials-grid-track" role="list">
              {socialCards.map((item, index) => {
                const floatDelay = `${(index * 0.45).toFixed(2)}s`;
                const enterDelay = `${(0.04 + index * 0.06).toFixed(2)}s`;
                const isLinktree = item.key === 'linktree';

                return (
                  <div
                    key={item.key}
                    className="social-row-centered social-row-enter"
                    style={{ animationDelay: enterDelay }}
                    role="listitem"
                  >
                    <div className="social-card">
                      {/* Clickable Free-Floating Enlarged Icon */}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-icon-anchor"
                        aria-label={`Open ${item.name} in new tab`}
                        title={`Open ${item.name}`}
                      >
                        <div
                          className="social-free-icon"
                          style={{ animationDelay: floatDelay }}
                        >
                          <img
                            src={getAssetUrl(item.iconPath)}
                            alt={`${item.name} icon`}
                            className="social-icon-img"
                            loading="lazy"
                          />
                        </div>
                      </a>

                      {/* Card Body */}
                      <div className="social-card-body">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="social-tag">{item.tag}</span>
                          {isLinktree && (
                            <span className="linktree-badge-mini">
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              <span>Soon Defunct</span>
                            </span>
                          )}
                        </div>
                        <h2 className="social-platform-name">{item.name}</h2>
                        <p className="social-handle">{item.handle}</p>

                        {/* Linktree Deprecation Warning Label */}
                        {isLinktree && (
                          <div className="linktree-warning-banner">
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>Notice: Linktree will soon be defunct. This website is its official replacement.</span>
                          </div>
                        )}
                      </div>

                      {/* Thick-Bordered Button with Light/Dark Centre */}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-social-action group"
                        aria-label={`${item.ctaText} (opens in a new tab)`}
                      >
                        <span>{item.ctaText}</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </div>
                  </div>
                );
              })}

              {/* Email Contact Card at Bottom */}
              <div
                className="social-row-centered social-row-enter"
                style={{ animationDelay: `${(0.04 + socialCards.length * 0.06).toFixed(2)}s` }}
                role="listitem"
              >
                <div className="social-card">
                  {/* Clickable Free-Floating Email Icon */}
                  <a
                    href="mailto:debate@ucds.ca"
                    className="social-icon-anchor"
                    aria-label="Send email to debate@ucds.ca"
                    title="Send email to debate@ucds.ca"
                  >
                    <div
                      className="social-free-icon"
                      style={{ animationDelay: `${(socialCards.length * 0.45).toFixed(2)}s` }}
                    >
                      <Mail className="w-11 h-11 text-[#0075A2] dark:text-[#53afd0] drop-shadow-md" />
                    </div>
                  </a>

                  {/* Card Body */}
                  <div className="social-card-body">
                    <span className="social-tag">Direct Inquiries</span>
                    <h2 className="social-platform-name">Society Email</h2>
                    <p className="social-handle">debate@ucds.ca</p>
                  </div>

                  {/* Action Button to Open Mail Client */}
                  <a
                    href="mailto:debate@ucds.ca"
                    className="btn-social-action group"
                    aria-label="Send Email to debate@ucds.ca"
                  >
                    <span>Send Email</span>
                    <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: OTHER LINKS */}
        {activeTab === 'other' && (
          <div key="other" className="tab-content-panel tab-content-enter w-full">
            {otherLinks.length === 0 ? (
              <div className="tab-empty-state-card text-center py-16 px-6 bg-white/85 dark:bg-[#15162C]/90 backdrop-blur-2xl rounded-3xl border-2 border-slate-200 dark:border-slate-800 max-w-xl mx-auto shadow-2xl space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-[#0075A2]/10 dark:bg-[#53afd0]/15 flex items-center justify-center text-[#0075A2] dark:text-[#53afd0] mx-auto border border-[#0075A2]/20">
                  <LinkIcon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold font-title text-[#1C244C] dark:text-[#F6F6F6]">No Additional Links Published</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                  Executives can publish official matter files, tournament documents, and community bookmarks from the Executive Portal.
                </p>
              </div>
            ) : (
              <>
                {/* MOBILE VIEW: Compact list of link names with small gaps */}
                <div className="md:hidden mobile-other-links-list" role="list">
                  {otherLinks.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mobile-other-link-item group"
                      role="listitem"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <LinkIcon className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0] shrink-0" />
                        <span className="mobile-other-link-name truncate">{item.name}</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0075A2] dark:group-hover:text-[#53afd0] shrink-0 transition-colors" />
                    </a>
                  ))}
                </div>

                {/* DESKTOP VIEW: Keep expanded form of the display */}
                <div className="hidden md:flex socials-grid-track" role="list">
                  {otherLinks.map((item, idx) => {
                    const enterDelay = `${(0.04 + idx * 0.06).toFixed(2)}s`;

                    return (
                      <div
                        key={idx}
                        className="social-row-centered social-row-enter"
                        style={{ animationDelay: enterDelay }}
                        role="listitem"
                      >
                        <div className="social-card">
                          <div className="social-free-icon shrink-0">
                            <div className="w-16 h-16 rounded-2xl bg-[#0075A2]/10 dark:bg-[#53afd0]/15 flex items-center justify-center text-[#0075A2] dark:text-[#53afd0] border border-[#0075A2]/20">
                              <LinkIcon className="w-8 h-8" />
                            </div>
                          </div>

                          <div className="social-card-body">
                            <span className="social-tag">Resource Link</span>
                            <h2 className="social-platform-name">{item.name}</h2>
                            {item.description ? (
                              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium leading-relaxed">
                                {item.description}
                              </p>
                            ) : (
                              <p className="social-handle font-mono text-xs text-slate-400">
                                {item.link}
                              </p>
                            )}
                          </div>

                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-social-action group"
                            aria-label={`Open ${item.name} in new tab`}
                          >
                            <span>Open Resource</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialMedia;
