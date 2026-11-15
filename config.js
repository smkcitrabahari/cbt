const CONFIG = {
  SUPABASE_URL: "https://quuuaekcwblffuessuvf.supabase.co",
  SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1dXVhZWtjd2JsZmZ1ZXNzdXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3MDUwODUsImV4cCI6MjExMDI4MTA4NX0.s4BqDK73cirqO89GvToYMAlhsgUXJjxzYJrUelAiyNs",
  MAX_VIOLATIONS: 2
};

// Inisialisasi Supabase Klien Global
if (typeof supabase !== 'undefined' && CONFIG.SUPABASE_URL) {
  try {
    window.supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    console.log("[Config] Supabase Client terinisialisasi.");
  } catch (err) {
    console.error("[Config] Gagal inisialisasi Supabase:", err.message);
  }
}
