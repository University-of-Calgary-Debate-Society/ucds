import React, { useEffect, useState, useRef } from 'react';
import { Mail, ExternalLink, ArrowRight, Send } from 'lucide-react';
import { getUcdsOrganization, type OrganizationDoc } from '@/services/userService';
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
  const [firestoreLinks, setFirestoreLinks] = useState<Record<string, string>>({});
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

  // Fetch social links from Firestore Organizations collection
  useEffect(() => {
    let isMounted = true;

    async function fetchSocialLinks() {
      try {
        const orgDoc: OrganizationDoc | null = await getUcdsOrganization();
        if (isMounted && orgDoc && orgDoc.links) {
          const normalized: Record<string, string> = {};
          Object.entries(orgDoc.links).forEach(([key, url]) => {
            const cleanKey = key.trim().toLowerCase();
            // Strictly exclude website link as per instructions
            if (cleanKey !== 'website' && typeof url === 'string' && url.trim().length > 0) {
              normalized[cleanKey] = url.trim();
            }
          });
          setFirestoreLinks(normalized);
        }
      } catch (err) {
        console.error('Failed to load UCDS social links from Firestore:', err);
      }
    }

    fetchSocialLinks();
    return () => {
      isMounted = false;
    };
  }, []);

  // Build the list of active social cards, merging Firestore links with fallbacks
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

      {/* Main Content Layer (Cards List Aligned to the Left) */}
      <div className="socials-content-layer">
        <div className="socials-grid-track" role="list">
          {/* Social Media Cards */}
          {socialCards.map((item, index) => {
            const floatDelay = `${(index * 0.45).toFixed(2)}s`;
            const enterDelay = `${(0.06 + index * 0.08).toFixed(2)}s`;

            return (
              <div
                key={item.key}
                className="social-row-centered social-row-enter"
                style={{ animationDelay: enterDelay }}
                role="listitem"
              >
                <div className="social-card">
                  {/* Clickable Free-Floating Icon (No surrounding boxes) */}
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

                  {/* Card Body with Member Portal Typography */}
                  <div className="social-card-body">
                    <span className="social-tag">{item.tag}</span>
                    <h2 className="social-platform-name">{item.name}</h2>
                    <p className="social-handle">{item.handle}</p>
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
            style={{ animationDelay: `${(0.06 + socialCards.length * 0.08).toFixed(2)}s` }}
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
                  <Mail className="w-9 h-9 text-[#0075A2] dark:text-[#53afd0] drop-shadow-md" />
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
    </div>
  );
};
