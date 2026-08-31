/**
 * Resolves a public asset path (images, icons, audio, photos, seo) relative to Vite's BASE_URL.
 * This guarantees proper asset loading on both custom root domains (e.g. ucds.ca) and GitHub Pages subfolders (/ucds/).
 */
export function getAssetUrl(path: string): string {
  if (!path) return '';
  // If already absolute URL (http:// or https:// or data:), return as is
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) {
    return path;
  }
  const basePath = import.meta.env.BASE_URL || '/';
  const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${cleanBase}${cleanPath}`;
}
