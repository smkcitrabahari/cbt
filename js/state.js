/**
 * State Management Global Aplikasi CBT
 */
const State = {
    currentUser: null,       // { id, nisn/username, nama, kelas, role: 'siswa'|'admin'|'guru' }
    currentRole: 'siswa',    // 'siswa' | 'admin' | 'guru'
    activeScreen: 'screen-login', // 'screen-login' | 'screen-student-lobby' | 'screen-exam' | 'screen-admin'
    
    // Sesi Ujian Aktif Siswa
    examActive: null,        // { id, mapel, kelas, tanggal, jam_mulai, jam_selesai, durasi }
    questions: [],           // Array objek soal yang sudah diacak (shuffled)
    currentIndex: 0,         // Indeks soal aktif saat ini (0-based)
    answers: {},             // Peta jawaban siswa: { questionId: 'A' }
    doubtful: {},            // Peta status ragu-ragu: { questionId: true/false }
    violations: 0,           // Jumlah pelanggaran layar/fullscreen
    timerInterval: null,     // Interval timer mundur ujian
    timeRemaining: 0,        // Sisa waktu dalam detik
    autoSaveTimer: null,     // Interval auto-save lokal
    isOfflineMode: !navigator.onLine
};

window.State = State;