# Cloudflare Hookup & Integration Guide for UCDS

This guide details how to connect and configure **Cloudflare** with your Vite-React web application hosted on **GitHub Pages**.

---

## Architecture Overview

```
[ Visitor / Browser ]
        │
        ▼
[ Cloudflare Global CDN / Edge ]
  ├── SSL/TLS Full (Strict) Encryption
  ├── DDoS & WAF Protection
  ├── Security Headers (_headers)
  ├── Asset Caching & Brotli Compression
  └── Custom Domain DNS (e.g., ucds.ca or debate.ucalgary.ca)
        │
        ▼ (CNAME Proxy)
[ GitHub Pages Origin ]
  └── Static Vite SPA Assets (University-of-Calgary-Debate-Society.github.io/ucds)
```

---

## Setup Method 1: Cloudflare as DNS + CDN Proxy for GitHub Pages (Recommended)

### Step 1: Add Custom Domain to GitHub Pages
1. Go to your GitHub repository: [University-of-Calgary-Debate-Society/ucds](https://github.com/University-of-Calgary-Debate-Society/ucds).
2. Navigate to **Settings > Pages**.
3. Under **Custom domain**, enter your domain (e.g. `ucds.ca` or `debate.ucalgary.ca`) and click **Save**.
4. GitHub will generate a `CNAME` file in the root / repository.

### Step 2: Configure Cloudflare DNS Records
In your Cloudflare Dashboard:
1. Go to **DNS > Records**.
2. Add a `CNAME` record:
   - **Type**: `CNAME`
   - **Name**: `@` (for apex `ucds.ca`) or `subdomain` (e.g., `debate` or `www`)
   - **Target**: `University-of-Calgary-Debate-Society.github.io`
   - **Proxy status**: `Proxied (Orange Cloud enabled)`
   - **TTL**: `Auto`

### Step 3: Configure SSL/TLS Mode in Cloudflare
1. In Cloudflare, navigate to **SSL/TLS > Overview**.
2. Select **Full (Strict)** encryption mode.
   > **Why?** GitHub Pages automatically issues Let's Encrypt certificates for custom domains. "Full (Strict)" ensures end-to-end encryption between Cloudflare and GitHub without infinite redirect loops.
3. Under **SSL/TLS > Edge Certificates**, toggle ON:
   - **Always Use HTTPS**
   - **Automatic HTTPS Rewrites**
   - **Minimum TLS Version**: `TLS 1.2` or `TLS 1.3`

### Step 4: Caching & Static Asset Optimization
The project includes `public/_headers` with optimized cache rules:
- `/assets/*` are immutable hashes from Vite, cached in browser and Cloudflare CDN for 1 year (`max-age=31536000`).
- `/index.html` is configured with `must-revalidate` so users instantly receive updates upon new deployments.

---

## Setup Method 2: Direct Deployment via Cloudflare Pages (Alternative)

If you ever wish to host directly on Cloudflare Pages instead of GitHub Pages:
1. In Cloudflare Dashboard, go to **Workers & Pages > Create application > Pages > Connect to Git**.
2. Select `University-of-Calgary-Debate-Society/ucds`.
3. Set build configurations:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variables**: Add your `VITE_FIREBASE_*` keys.
4. Cloudflare will build and serve your app globally on the edge with zero-latency cold starts.

---

## Security Headers Reference (`public/_headers`)

- `Strict-Transport-Security`: Forces HTTPS for all subsequent requests.
- `X-Frame-Options: SAMEORIGIN`: Protects against clickjacking.
- `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing exploits.
- `Referrer-Policy: strict-origin-when-cross-origin`: Shields sensitive referrers.
- `Permissions-Policy`: Restricts unauthorized camera/microphone/geolocation access.
