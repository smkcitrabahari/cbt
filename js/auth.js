/**
 * Sistem Autentikasi Multi-Role & Offline Fallback
 */

function switchLoginRole(role) {
    const btnSiswa = document.getElementById('tab-role-siswa');
    const btnStaff = document.getElementById('tab-role-staff');
    const formSiswa = document.getElementById('form-login-siswa');
    const formStaff = document.getElementById('form-login-staff');

    if (role === 'siswa') {
        State.currentRole = 'siswa';
        btnSiswa.className = "py-2.5 text-sm font-bold rounded-lg bg-white text-blue-900 shadow-sm transition";
        btnStaff.className = "py-2.5 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition";
        formSiswa.classList.remove('hidden');
        formStaff.classList.add('hidden');
    } else {
        State.currentRole = 'staff';
        btnSiswa.className = "py-2.5 text-sm font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition";
        btnStaff.className = "py-2.5 text-sm font-bold rounded-lg bg-white text-blue-900 shadow-sm transition";
        formSiswa.classList.add('hidden');
        formStaff.classList.remove('hidden');
    }
}

async function handleStudentLogin(event) {
    event.preventDefault();
    const nisn = document.getElementById('login-nisn').value.trim();
    const password = document.getElementById('login-siswa-pass').value.trim();

    showToast("Memeriksa kredensial peserta...", "info");

    let student = null;

    // 1. Coba verifikasi ke server Supabase jika online
    if (navigator.onLine && supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('siswa')
                .select('*')
                .eq('nisn', nisn)
                .single();
            
            if (data) {
                if (data.password === password) {
                    student = data;
                    // Simpan cache profil siswa di localStorage untuk login offline berikutnya
                    localStorage.setItem(`cbt_student_${nisn}`, JSON.stringify(data));
                } else {
                    showToast("Password atau PIN ujian salah!", "error");
                    return;
                }
            }
        } catch (err) {
            console.warn("[Auth] Gagal verifikasi online, mencoba cache offline:", err);
        }
    }

    // 2. Fallback verifikasi cache offline jika server tidak dapat dijangkau
    if (!student) {
        const cachedStudent = localStorage.getItem(`cbt_student_${nisn}`);
        if (cachedStudent) {
            const parsed = JSON.parse(cachedStudent);
            if (parsed.password === password) {
                student = parsed;
                showToast("Login berhasil via Cache Offline.", "info");
            } else {
                showToast("Password salah (Mode Offline).", "error");
                return;
            }
        } else {
            showToast("Data siswa tidak ditemukan. Pastikan sudah pernah login secara online atau hubungi proktor.", "error");
            return;
        }
    }

    if (student) {
        State.currentUser = {
            id: student.id,
            nisn: student.nisn,
            nama: student.nama,
            kelas: student.kelas,
            role: 'siswa'
        };
        localStorage.setItem('cbt_active_session', JSON.stringify(State.currentUser));
        showToast(`Selamat datang, ${student.nama}!`, "success");
        showScreen('screen-student-lobby');
        if (typeof renderStudentLobby === 'function') renderStudentLobby();
    }
}

async function handleStaffLogin(event) {
    event.preventDefault();
    const identifier = document.getElementById('login-staff-id').value.trim();
    const password = document.getElementById('login-staff-pass').value.trim();

    showToast("Memverifikasi akun staff...", "info");

    if (!supabaseClient) {
        // Fallback akun default admin jika Supabase belum dikonfigurasi
        if (identifier === 'admin' && password === 'admin123') {
            State.currentUser = { id: 'admin-default', nama: 'Administrator Utama', role: 'admin' };
            localStorage.setItem('cbt_active_session', JSON.stringify(State.currentUser));
            showScreen('screen-admin');
            if (typeof initAdminDashboard === 'function') initAdminDashboard();
            return;
        }
        showToast("Supabase belum dikonfigurasi untuk login staff.", "error");
        return;
    }

    try {
        // Cek tabel admin
        const { data: adminData } = await supabaseClient
            .from('admin')
            .select('*')
            .eq('username', identifier)
            .single();

        if (adminData && adminData.password === password) {
            State.currentUser = {
                id: adminData.id,
                nama: adminData.nama_admin,
                role: 'admin'
            };
            localStorage.setItem('cbt_active_session', JSON.stringify(State.currentUser));
            showScreen('screen-admin');
            if (typeof initAdminDashboard === 'function') initAdminDashboard();
            return;
        }

        // Cek tabel guru (berdasarkan NIP)
        const { data: guruData } = await supabaseClient
            .from('guru')
            .select('*')
            .eq('nip', identifier)
            .single();

        if (guruData && guruData.password === password) {
            State.currentUser = {
                id: guruData.id,
                nama: guruData.nama_guru,
                nip: guruData.nip,
                mapel: guruData.mapel,
                kelas: guruData.kelas,
                role: 'guru'
            };
            localStorage.setItem('cbt_active_session', JSON.stringify(State.currentUser));
            showScreen('screen-admin');
            if (typeof initAdminDashboard === 'function') initAdminDashboard();
            return;
        }

        showToast("Username/NIP atau password salah!", "error");
    } catch (err) {
        console.error("Login staff error:", err);
        showToast("Terjadi kesalahan saat login ke server.", "error");
    }
}

function logoutUser() {
    if (confirm("Apakah Anda yakin ingin keluar dari sesi ini?")) {
        localStorage.removeItem('cbt_active_session');
        State.currentUser = null;
        State.examActive = null;
        if (State.timerInterval) clearInterval(State.timerInterval);
        showScreen('screen-login');
        showToast("Berhasil keluar sesi.", "info");
    }
}

window.switchLoginRole = switchLoginRole;
window.handleStudentLogin = handleStudentLogin;
window.handleStaffLogin = handleStaffLogin;
window.logoutUser = logoutUser;