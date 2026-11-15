/**
 * Konfigurasi Global Aplikasi CBT PWA Semi-Online
 */
const APP_CONFIG = {
    // Identitas Sekolah & Ujian
    SCHOOL_NAME: "SMK Citra Bahari Wakatobi",
    ACADEMIC_YEAR: "2026/2027",
    EXAM_TITLE: "Penilaian Sumatif Akhir Semester Ganjil",
    PRINCIPAL_NAME: "Rahmawati, S.S., Gr.",
    PRINCIPAL_NIP: "-",
    LETTERHEAD_PATH: "media-sekolah/kop_sekolah.png", // Path relatif pada bucket atau folder lokal

    // Kredensial Supabase (Ganti dengan kredensial proyek Anda)
    SUPABASE_URL: "https://quuuaekcwblffuessuvf.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1dXVhZWtjd2JsZmZ1ZXNzdXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3MDUwODUsImV4cCI6MjExMDI4MTA4NX0.s4BqDK73cirqO89GvToYMAlhsgUXJjxzYJrUelAiyNs",
    STORAGE_BUCKET: "soal-images",

    // Parameter Keamanan Ujian
    MAX_VIOLATIONS: 2, // Pelanggaran ke-2 otomatis diskualifikasi & nilai 0
    AUTO_SAVE_INTERVAL_MS: 5000,
    APP_VERSION: "v2.6.0-semi-online"
};

window.APP_CONFIG = APP_CONFIG;