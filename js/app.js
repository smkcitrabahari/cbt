/**
 * Controller Navigasi SPA & Manajemen Hak Akses Menu
 */

function showScreen(screenId) {
    const screens = ['screen-login', 'screen-student-lobby', 'screen-exam', 'screen-admin'];
    screens.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.classList.add('hidden');
    });

    const target = document.getElementById(screenId);
    if (target) {
        target.classList.remove('hidden');
        State.activeScreen = screenId;
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    let bg = 'bg-slate-900 text-white';
    if (type === 'success') bg = 'bg-emerald-600 text-white';
    if (type === 'error') bg = 'bg-rose-600 text-white';
    if (type === 'info') bg = 'bg-blue-800 text-white';

    toast.className = `p-4 rounded-xl shadow-xl text-xs font-bold pointer-events-auto transition transform translate-y-2 opacity-0 ${bg}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 50);

    setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function initAdminDashboard() {
    const user = State.currentUser;
    if (!user) return;

    document.getElementById('admin-header-school').textContent = APP_CONFIG.SCHOOL_NAME;
    const badge = document.getElementById('admin-user-badge');

    if (user.role === 'admin') {
        badge.textContent = `Login sebagai: Administrator Utama (${user.nama})`;
        // Tampilkan semua tombol menu admin
        document.querySelectorAll('[data-admin-only="true"]').forEach(el => el.classList.remove('hidden'));
    } else if (user.role === 'guru') {
        badge.textContent = `Login Guru Pengampu: ${user.nama} (Mapel: ${user.mapel || 'Semua'})`;
        // Sembunyikan menu eksklusif admin
        document.querySelectorAll('[data-admin-only="true"]').forEach(el => el.classList.add('hidden'));
    }

    switchAdminTab('rekap');
}

function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.className = "admin-nav-btn px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 font-semibold";
    });

    const activeTab = document.getElementById(`admin-tab-${tabName}`);
    if (activeTab) activeTab.classList.remove('hidden');

    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) activeBtn.className = "admin-nav-btn px-4 py-2 rounded-lg bg-blue-600 text-white font-bold";

    // Inisialisasi data tab terkait
    if (tabName === 'rekap' && typeof renderRekapDashboard === 'function') renderRekapDashboard();
    if (tabName === 'soal' && typeof loadBankSoalList === 'function') loadBankSoalList();
    if (tabName === 'jadwal' && typeof renderJadwalManagement === 'function') renderJadwalManagement();
    if (tabName === 'siswa' && typeof renderSiswaTable === 'function') renderSiswaTable();
    if (tabName === 'guru' && typeof renderGuruTable === 'function') renderGuruTable();
    if (tabName === 'mapel' && typeof renderMapelList === 'function') renderMapelList();
}

// Inisialisasi Saat Dokumen Dimuat
window.addEventListener('DOMContentLoaded', async () => {
    // Cek sesi aktif di localStorage
    const activeSession = localStorage.getItem('cbt_active_session');
    if (activeSession) {
        try {
            State.currentUser = JSON.parse(activeSession);
            if (State.currentUser.role === 'siswa') {
                showScreen('screen-student-lobby');
                renderStudentLobby();
            } else {
                showScreen('screen-admin');
                initAdminDashboard();
            }
        } catch (e) {
            localStorage.removeItem('cbt_active_session');
        }
    } else {
        showScreen('screen-login');
    }

    // Load referensi mapel global
    if (typeof loadGlobalMapelOptions === 'function') loadGlobalMapelOptions();
});

window.showScreen = showScreen;
window.showToast = showToast;
window.initAdminDashboard = initAdminDashboard;
window.switchAdminTab = switchAdminTab;