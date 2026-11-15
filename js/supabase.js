/**
 * Inisialisasi Supabase Client & Helper CRUD
 */
let supabaseClient = null;

try {
    if (window.supabase && APP_CONFIG && APP_CONFIG.SUPABASE_URL !== "https://your-project-ref.supabase.co") {
        supabaseClient = window.supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY);
    } else {
        console.warn("[Supabase] URL atau Anon Key belum dikonfigurasi di config.js. Menggunakan mode simulasi/offline lokal.");
    }
} catch (error) {
    console.error("[Supabase] Gagal menginisialisasi klien:", error);
}

window.supabaseClient = supabaseClient;

/**
 * Helper Universal Mengambil Seluruh Baris Tabel dari Supabase dengan Fallback Cache Lokal
 */
async function fetchAllRows(tableName, cacheKey) {
    try {
        if (!supabaseClient) throw new Error("Supabase tidak aktif");
        const { data, error } = await supabaseClient.from(tableName).select('*');
        if (error) throw error;
        if (data) {
            localStorage.setItem(`cbt_cache_${cacheKey}`, JSON.stringify(data));
            return data;
        }
    } catch (err) {
        console.warn(`[CBT Offline] Gagal fetch ${tableName} dari server, membaca cache lokal:`, err);
        const cached = localStorage.getItem(`cbt_cache_${cacheKey}`);
        if (cached) {
            return JSON.parse(cached);
        }
    }
    return [];
}

/**
 * Mengambil Jadwal Ujian Aktif Berdasarkan Kelas Siswa
 */
async function fetchSchedulesForClass(className) {
    try {
        if (!supabaseClient) throw new Error("Supabase tidak aktif");
        const { data, error } = await supabaseClient
            .from('jadwal_ujian')
            .select('*')
            .ilike('kelas', `%${className}%`);
        if (error) throw error;
        if (data) {
            localStorage.setItem(`cbt_cache_jadwal_${className}`, JSON.stringify(data));
            return data;
        }
    } catch (err) {
        const cached = localStorage.getItem(`cbt_cache_jadwal_${className}`);
        if (cached) return JSON.parse(cached);
    }
    return [];
}

/**
 * Mengambil Bank Soal untuk Mapel & Kelas tertentu
 */
async function fetchBankSoalForExam(mapel, kelas) {
    try {
        if (!supabaseClient) throw new Error("Supabase tidak aktif");
        const { data, error } = await supabaseClient
            .from('bank_soal')
            .select('*')
            .eq('mapel', mapel);
        if (error) throw error;
        if (data && data.length > 0) {
            localStorage.setItem(`cbt_cache_soal_${mapel}_${kelas}`, JSON.stringify(data));
            return data;
        }
    } catch (err) {
        console.warn(`[CBT Offline] Memuat soal dari cache lokal untuk ${mapel}`);
    }
    
    const localSoal = localStorage.getItem(`cbt_cache_soal_${mapel}_${kelas}`) || localStorage.getItem(`cbt_cache_soal_${mapel}`);
    return localSoal ? JSON.parse(localSoal) : [];
}

/**
 * Mengunggah Gambar Soal ke Supabase Storage
 */
async function uploadImageToSupabaseStorage(file) {
    if (!supabaseClient) {
        alert("Supabase Storage belum dikonfigurasi. Unggah gambar memerlukan koneksi server.");
        return null;
    }
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `upload_${fileName}`;

        const { data, error } = await supabaseClient.storage
            .from(APP_CONFIG.STORAGE_BUCKET)
            .upload(filePath, file);

        if (error) throw error;

        const { data: publicUrlData } = supabaseClient.storage
            .from(APP_CONFIG.STORAGE_BUCKET)
            .getPublicUrl(filePath);

        return publicUrlData.publicUrl;
    } catch (err) {
        console.error("Gagal mengunggah gambar:", err);
        alert("Gagal mengunggah gambar ke Supabase Storage: " + err.message);
        return null;
    }
}

window.fetchAllRows = fetchAllRows;
window.fetchSchedulesForClass = fetchSchedulesForClass;
window.fetchBankSoalForExam = fetchBankSoalForExam;
window.uploadImageToSupabaseStorage = uploadImageToSupabaseStorage;
