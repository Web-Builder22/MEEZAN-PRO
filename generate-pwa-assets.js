import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

// 1. Create public directory if not exists
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// 2. Define the premium SVG logo for DigiKhata
const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <!-- Glowing Coin Gradient -->
    <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <!-- Visual Glow Drop Shadow -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />

  <!-- Outer Ring (Fintech Theme) -->
  <circle cx="256" cy="256" r="215" fill="none" stroke="rgba(255, 255, 255, 0.12)" stroke-width="12" />

  <!-- Styled Book & Coin Group (Optimized for centering and safe zones) -->
  <g transform="translate(106, 116)">
    <!-- Right side page of Ledger book -->
    <path d="M150 250 C150 170 200 130 260 130 L260 210 C200 210 150 230 150 250 Z" fill="#ffffff" opacity="0.95" />
    <!-- Left side page of Ledger book -->
    <path d="M150 250 C150 170 100 130 40 130 L40 210 C100 210 150 230 150 250 Z" fill="#f1f5f9" />
    
    <!-- Ledger Spine -->
    <rect x="145" y="134" width="10" height="116" rx="5" fill="#10b981" />

    <!-- Ledger Details Lines (Left Page) -->
    <line x1="60" y1="155" x2="110" y2="155" stroke="#94a3b8" stroke-width="6" stroke-linecap="round" />
    <line x1="60" y1="175" x2="120" y2="175" stroke="#94a3b8" stroke-width="6" stroke-linecap="round" />
    <line x1="60" y1="195" x2="100" y2="195" stroke="#3b82f6" stroke-width="6" stroke-linecap="round" />

    <!-- Ledger Details Lines (Right Page) -->
    <line x1="180" y1="155" x2="230" y2="155" stroke="#10b981" stroke-width="6" stroke-linecap="round" />
    <line x1="180" y1="175" x2="240" y2="175" stroke="#94a3b8" stroke-width="6" stroke-linecap="round" />
    <line x1="180" y1="195" x2="220" y2="195" stroke="#10b981" stroke-width="6" stroke-linecap="round" />

    <!-- Beautiful Glowing Coin at Bottom-Right -->
    <circle cx="230" cy="220" r="45" fill="url(#coinGrad)" stroke="#ffffff" stroke-width="5" filter="url(#glow)" />
    <!-- Currency check mark indicating fully verified transaction ledger -->
    <path d="M216 220 L226 230 L246 210" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  </g>
</svg>
`;

// 3. Define the Maskable Version of SVG (rendered with more padding to perfectly satisfy the OS safe zone requirements)
const maskableSvgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <!-- Glowing Coin Gradient -->
    <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <!-- Visual Glow Drop Shadow -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />

  <!-- Outer Ring (Fintech Theme) -->
  <circle cx="256" cy="256" r="215" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="12" />

  <!-- Styled Book & Coin Group (Optimized with extra padding inside safe zone for maskable use cases) -->
  <g transform="translate(116, 126) scale(0.85)">
    <!-- Right side page of Ledger book -->
    <path d="M150 250 C150 170 200 130 260 130 L260 210 C200 210 150 230 150 250 Z" fill="#ffffff" opacity="0.95" />
    <!-- Left side page of Ledger book -->
    <path d="M150 250 C150 170 100 130 40 130 L40 210 C100 210 150 230 150 250 Z" fill="#f1f5f9" />
    
    <!-- Ledger Spine -->
    <rect x="145" y="134" width="10" height="116" rx="5" fill="#10b981" />

    <!-- Ledger Details Lines (Left Page) -->
    <line x1="60" y1="155" x2="110" y2="155" stroke="#94a3b8" stroke-width="6" stroke-linecap="round" />
    <line x1="60" y1="175" x2="120" y2="175" stroke="#94a3b8" stroke-width="6" stroke-linecap="round" />
    <line x1="60" y1="195" x2="100" y2="195" stroke="#3b82f6" stroke-width="6" stroke-linecap="round" />

    <!-- Ledger Details Lines (Right Page) -->
    <line x1="180" y1="155" x2="230" y2="155" stroke="#10b981" stroke-width="6" stroke-linecap="round" />
    <line x1="180" y1="175" x2="240" y2="175" stroke="#94a3b8" stroke-width="6" stroke-linecap="round" />
    <line x1="180" y1="195" x2="220" y2="195" stroke="#10b981" stroke-width="6" stroke-linecap="round" />

    <!-- Beautiful Glowing Coin at Bottom-Right -->
    <circle cx="230" cy="220" r="45" fill="url(#coinGrad)" stroke="#ffffff" stroke-width="5" filter="url(#glow)" />
    <!-- Currency check mark -->
    <path d="M216 220 L226 230 L246 210" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  </g>
</svg>
`;

async function generatePngIcons() {
  console.log('Generating PNG icons standard and maskable variants...');
  const svgBuffer = Buffer.from(svgContent);
  const maskableSvgBuffer = Buffer.from(maskableSvgContent);

  // standard icons
  await sharp(svgBuffer).resize(192, 192).toFile(path.join(PUBLIC_DIR, 'icon-192.png'));
  await sharp(svgBuffer).resize(512, 512).toFile(path.join(PUBLIC_DIR, 'icon-512.png'));

  // maskable icons
  await sharp(maskableSvgBuffer).resize(192, 192).toFile(path.join(PUBLIC_DIR, 'icon-192-maskable.png'));
  await sharp(maskableSvgBuffer).resize(512, 512).toFile(path.join(PUBLIC_DIR, 'icon-512-maskable.png'));

  console.log('✅ All PNG icons successfully written to public folder.');
}

// 4. Create public/manifest.json
const manifestData = {
  "name": "DigiKhata Ledger",
  "short_name": "DigiKhata",
  "description": "Secure SaaS-grade Digital Ledger, Cash Book, and Multi-language Invoice POS.",
  "id": "/?source=pwa",
  "start_url": "/?source=pwa",
  "display": "standalone",
  "theme_color": "#059669",
  "background_color": "#047857",
  "orientation": "any",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
};

// 5. Create public/sw.js (Service Worker with stale-while-revalidate and API network-first resilience)
const swContent = `
const CACHE_NAME = 'digikhata-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192-maskable.png',
  '/icon-512-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static baseline assets...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Obliterating stale service worker cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Bypass cache completely for API requests, providing an organic offline JSON response wrapper on failure
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(req).catch(() => {
        return new Response(JSON.stringify({
          error: 'Internet is currently disconnected. Offline safe-sandbox active.',
          offline: true,
          status: 'offline'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Stale-While-Revalidate caching strategy for standard static resources
  e.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(req).then((cachedResponse) => {
        const fetchPromise = fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(req, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Graceful fetch suppression
        });
        return cachedResponse || fetchPromise;
      });
    })
  );
});
`;

fs.writeFileSync(path.join(PUBLIC_DIR, 'manifest.json'), JSON.stringify(manifestData, null, 2));
fs.writeFileSync(path.join(PUBLIC_DIR, 'sw.js'), swContent);
console.log('✅ manifest.json and sw.js written to public folder.');

generatePngIcons().catch(err => {
  console.error('Fatal generating PWA visual assets:', err);
  process.exit(1);
});
