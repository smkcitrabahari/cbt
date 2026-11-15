const CACHE_NAME = 'cbt-app-shell-v2.6';
const IMAGE_CACHE_NAME = 'cbt-soal-images-v2.6';

const APP_SHELL_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './config.js',
    './js/supabase.js',
    './js/state.js',
    './js/auth.js',
    './js/exam.js',
    './js/app.js',
    './js/mapel.js',
    './js/siswa.js',
    './js/jadwal.js',
    './js/soal.js',
    './js/guru.js',
    './js/rekap.js'
];

// Event Install: Simpan seluruh App Shell ke Cache
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(APP_SHELL_ASSETS).catch((err) => {
                console.warn('[SW] Sebagian aset gagal di-precache saat install:', err);
            });
        })
    );
});

// Event Activate: Bersihkan cache versi lama
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME && cache !== IMAGE_CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Event Fetch: Routing strategi cache
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Abaikan request non-GET (POST/PUT/DELETE API Supabase)
    if (request.method !== 'GET') return;

    // 1. Strategi Cache-First untuk Gambar Soal (Supabase Storage & ekstensi gambar)
    const isSupabaseStorage = url.pathname.includes('/storage/v1/object/');
    const isImageFile = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url.pathname);

    if (isSupabaseStorage || isImageFile) {
        event.respondWith(
            caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
                const cachedResponse = await cache.match(request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                try {
                    const networkResponse = await fetch(request);
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                } catch (error) {
                    // Fallback transparan jika gambar gagal dimuat saat offline
                    return new Response('', { status: 404, statusText: 'Offline Image Unavailable' });
                }
            })
        );
        return;
    }

    // 2. Strategi Network-First untuk API REST Supabase (/rest/v1/)
    if (url.pathname.includes('/rest/v1/')) {
        event.respondWith(
            fetch(request).catch(() => {
                return new Response(JSON.stringify({ error: 'Offline mode' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // 3. Strategi Stale-While-Revalidate untuk App Shell & CDN (Tailwind, Chart.js, Font)
    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cachedResponse = await cache.match(request);
            const networkFetch = fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                })
                .catch(() => null);

            return cachedResponse || networkFetch;
        })
    );
});