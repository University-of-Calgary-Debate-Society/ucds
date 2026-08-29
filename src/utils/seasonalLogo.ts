/**
 * Seasonal Logo & SEO Resolver for University of Calgary Debate Society
 * 
 * Rules:
 * - June 1 to August 31 (Months 5, 6, 7): Pride / LGBTQ+ logo (logo_lgbtq.png)
 * - September 1 to December 17 (Months 8, 9, 10, and Dec 1-17): Fall semester logo (logo_fall.png)
 * - December 18 to March 31 (Dec 18-31, Jan, Feb, Mar): Winter semester logo (logo_winter.png)
 * - Otherwise (April 1 to May 31): Classic normal logo (logo_normal.png)
 */

export interface SeasonalLogoInfo {
  logoFileName: string;
  logoUrl: string;
  seasonName: string;
  altText: string;
}

export function getSeasonalLogoInfo(customDate?: Date): SeasonalLogoInfo {
  const date = customDate || new Date();
  const month = date.getMonth(); // 0-indexed: 0 = Jan, 11 = Dec
  const day = date.getDate(); // 1-31

  const basePath = import.meta.env.BASE_URL || '/';
  const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;

  // 1. Summer Pride Season: June, July, August (Months 5, 6, 7)
  if (month >= 5 && month <= 7) {
    return {
      logoFileName: 'logo_lgbtq.png',
      logoUrl: `${cleanBase}images/seo/logo_lgbtq.png`,
      seasonName: 'Pride Season',
      altText: 'University of Calgary Debate Society Pride Logo',
    };
  }

  // 2. Winter Season: December 18 onward until March 31
  if ((month === 11 && day >= 18) || month === 0 || month === 1 || month === 2) {
    return {
      logoFileName: 'logo_winter.png',
      logoUrl: `${cleanBase}images/seo/logo_winter.png`,
      seasonName: 'Winter Season',
      altText: 'University of Calgary Debate Society Winter Logo',
    };
  }

  // 3. Fall Season: September 1 to December 17 (Months 8, 9, 10, and Dec 1-17)
  if ((month >= 8 && month <= 10) || (month === 11 && day < 18)) {
    return {
      logoFileName: 'logo_fall.png',
      logoUrl: `${cleanBase}images/seo/logo_fall.png`,
      seasonName: 'Fall Season',
      altText: 'University of Calgary Debate Society Fall Logo',
    };
  }

  // 4. Otherwise (April 1 to May 31)
  return {
    logoFileName: 'logo_normal.png',
    logoUrl: `${cleanBase}images/seo/logo_normal.png`,
    seasonName: 'Classic',
    altText: 'University of Calgary Debate Society Logo',
  };
}

/**
 * Dynamically updates document favicon, OpenGraph image, and meta tags based on the active season.
 */
export function updateSeasonalSeoTags(): void {
  if (typeof document === 'undefined') return;

  const { logoUrl, seasonName } = getSeasonalLogoInfo();

  // Update Favicon link
  let favicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }
  favicon.href = logoUrl;

  // Update OpenGraph Image tag
  let ogImage = document.querySelector<HTMLMetaElement>("meta[property='og:image']");
  if (!ogImage) {
    ogImage = document.createElement('meta');
    ogImage.setAttribute('property', 'og:image');
    document.head.appendChild(ogImage);
  }
  ogImage.content = logoUrl;

  // Update Twitter Image tag
  let twitterImage = document.querySelector<HTMLMetaElement>("meta[name='twitter:image']");
  if (!twitterImage) {
    twitterImage = document.createElement('meta');
    twitterImage.setAttribute('name', 'twitter:image');
    document.head.appendChild(twitterImage);
  }
  twitterImage.content = logoUrl;

  // Update Season meta tag
  let seasonMeta = document.querySelector<HTMLMetaElement>("meta[name='ucds-season']");
  if (!seasonMeta) {
    seasonMeta = document.createElement('meta');
    seasonMeta.setAttribute('name', 'ucds-season');
    document.head.appendChild(seasonMeta);
  }
  seasonMeta.content = seasonName;
}
