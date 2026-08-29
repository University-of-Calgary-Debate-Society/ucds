# University of Calgary Debate Society (UCDS) Web Platform

[![Deploy to GitHub Pages](https://github.com/University-of-Calgary-Debate-Society/ucds/actions/workflows/deploy.yml/badge.svg)](https://github.com/University-of-Calgary-Debate-Society/ucds/actions/workflows/deploy.yml)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-v11-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-CDN%20%26%20DNS-F38020?logo=cloudflare&logoColor=white)](https://cloudflare.com/)

A modern, high-performance web platform for the **University of Calgary Debate Society (UCDS)** built with Vite, React 19, TypeScript, Tailwind CSS, Firebase, and Cloudflare, hosted continuously on GitHub Pages.

---

## ⚡ Tech Stack

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons & UI**: [Lucide React](https://lucide.dev/), Tailwind Merge, CLSX
- **Routing**: [React Router v7](https://reactrouter.com/) with GitHub Pages SPA redirect support (`public/404.html`)
- **Backend / BaaS**: [Firebase](https://firebase.google.com/) (Modular SDK v11 - Authentication, Firestore Database, Analytics)
- **CI / CD Hosting**: [GitHub Pages](https://pages.github.com/) via automated [GitHub Actions](.github/workflows/deploy.yml)
- **Edge CDN & DNS**: [Cloudflare](https://cloudflare.com/) (Security headers, Full Strict SSL/TLS, Caching policies)

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- **Node.js**: v20.x or higher (LTS recommended)
- **npm**: v10.x or higher

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/University-of-Calgary-Debate-Society/ucds.git
cd ucds
npm install
```

### 3. Environment Variables Setup
Copy the example environment file:
```bash
cp .env.example .env.local
```
Update `.env.local` with your Firebase project credentials from the [Firebase Console](https://console.firebase.google.com/):
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=ucds-debate.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ucds-debate
VITE_FIREBASE_STORAGE_BUCKET=ucds-debate.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```
*(Note: The app will run smoothly with mock fallbacks even if keys are not yet configured).*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Available Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Starts Vite local development server with HMR on port 3000 |
| `npm run build` | Runs TypeScript compiler checks and builds production bundle to `dist/` |
| `npm run preview` | Serves the production build locally to verify output |
| `npm run typecheck` | Validates TypeScript types across the entire project |
| `npm run lint` | Lints project using ESLint |
| `npm run deploy` | Builds and deploys manually to GitHub Pages via `gh-pages` |
| `npm run firebase:sync` | Deploys & syncs `firestore.rules`, indexes, Auth and App Check to Firebase |
| `npm run firebase:verify` | Verifies Firebase Admin SDK connectivity for Auth, Firestore, and App Check |
| `npm run firebase:set-role` | Grants user roles (`admin`, `executive`, `member`) via Auth Custom Claims |

---

## 🔒 Firebase Admin SDK, Security Rules & App Check Synchronization

The project integrates the **Firebase Admin SDK** (`firebase-admin`) with automated synchronization for:
1. **Firestore Security Rules (`firestore.rules`)**: Role-based access control with granular validation for `users`, `events`, `tournaments`, `applications`, and `announcements`.
2. **App Check**: Client and Admin SDK support with token verification and enforcement.
3. **Authentication & Custom Claims (`scripts/setRole.js`)**: Assigning `admin`, `executive`, and `member` roles directly to accounts.
4. **CI/CD Continuous Sync**: Automatically compiles and deploys security rules upon pushes to `main` using the GitHub Actions secret `FIREBASE_SERVICE_ACCOUNT_KEY`.

### Manual / Local Rule Sync:
```bash
npm run firebase:sync
```

### Assign User Role:
```bash
npm run firebase:set-role user@ucalgary.ca admin
```

---

## 🌐 GitHub Pages CI/CD Deployment

Deployments are automated via `.github/workflows/deploy.yml`.

### Enabling GitHub Pages in Repository:
1. Go to **Settings > Pages** in your GitHub repository.
2. Under **Build and deployment > Source**, choose **GitHub Actions**.
3. (Optional) Add your Firebase environment variables as **GitHub Repository Secrets**:
   - Go to **Settings > Secrets and variables > Actions**.
   - Add secrets: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, etc.
4. Push any commit to the `main` branch to trigger an automatic build and deployment.

**Default Live URL**: `https://University-of-Calgary-Debate-Society.github.io/ucds`

---

## ☁️ Cloudflare CDN & Custom Domain Setup

To connect a custom domain (e.g. `ucds.ca` or `debate.ucalgary.ca`) using Cloudflare:
1. In Cloudflare DNS, add a `CNAME` pointing to `University-of-Calgary-Debate-Society.github.io` with Proxy enabled (Orange Cloud).
2. Set Cloudflare SSL/TLS mode to **Full (Strict)**.
3. In GitHub repo settings (**Settings > Pages**), enter the custom domain.

See [`docs/CLOUDFLARE_GUIDE.md`](docs/CLOUDFLARE_GUIDE.md) for full instructions.

---

## 📁 Project Structure

```
ucds/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions deployment workflow
├── docs/
│   └── CLOUDFLARE_GUIDE.md     # Cloudflare proxy & SSL configuration guide
├── public/
│   ├── 404.html                # GitHub Pages SPA redirect fallback
│   ├── _headers                # Cloudflare security & caching headers
│   └── _redirects              # Cloudflare SPA rewrite rules
├── src/
│   ├── components/
│   │   ├── DeploymentGuide.tsx # CI/CD and Cloudflare interactive guide
│   │   ├── FirebaseDemo.tsx    # Firebase Auth & Firestore live test card
│   │   ├── StatusBadge.tsx     # Diagnostic status indicator
│   │   └── ThemeToggle.tsx     # Light/Dark mode switcher
│   ├── contexts/
│   │   └── AuthContext.tsx     # Firebase Authentication React Context
│   ├── lib/
│   │   ├── firebase.ts         # Modular Firebase client initialization
│   │   └── utils.ts            # Styling utilities (clsx & twMerge)
│   ├── services/
│   │   └── firestore.ts        # Firestore database services & demo data
│   ├── App.tsx                 # Main application dashboard
│   ├── index.css               # Global CSS & Tailwind configuration
│   └── main.tsx                # Application entry point
├── .env.example                # Documented environment variables template
├── .gitignore                  # Git ignore rules
├── eslint.config.js            # ESLint flat config
├── index.html                  # HTML entry with FOUC prevention & SPA decoder
├── package.json                # Project dependencies and npm scripts
├── tsconfig.json               # TypeScript root configuration
├── vite.config.ts              # Vite bundler & Tailwind configuration
└── wrangler.toml               # Cloudflare configuration file
```

---

## 🤝 Contributing
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
