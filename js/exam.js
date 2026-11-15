/**
 * Inti Ujian Semi-Online, Navigasi Soal, & Sistem Keamanan Anti-Kecurangan
 */

async function renderStudentLobby() {
    if (!State.currentUser) return;
    const user = State.currentUser;

    document.getElementById('lobby-student-name').textContent = user.nama;
    document.getElementById('lobby-student-nisn').textContent = user.nisn;
    document.getElementById('lobby-student-class').textContent = user.kelas;
    document.getElementById('login-school-name').textContent = APP_CONFIG.SCHOOL_NAME;
    document.getElementById('lobby-school-title').textContent = APP_CONFIG.SCHOOL_NAME;

    // Periksa status antrean sinkronisasi offline
    checkPendingOfflineResults();

    // Ambil jadwal ujian kelas
    const schedules = await fetchSchedulesForClass(user.kelas);
    const scheduleContainer = document.getElementById('lobby-schedule-list');
    
    if (!schedules || schedules.length === 0) {
        scheduleContainer.innerHTML = `<p class="text-xs text-slate-500 col-span-2 py-4 text-center">Belum ada jadwal ujian aktif untuk kelas ${user.kelas}.</p>`;
        return;
    }

    let html = '';
    schedules.forEach(sch => {
        html += `
            <div class="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
                <div>
                    <span class="px-2.5 py-1 rounded-md bg-blue-100 text-blue-900 font-bold text-xs">${sch.mapel}</span>
                    <h5 class="font-extrabold text-slate-900 text-sm mt-2">Tanggal: ${sch.tanggal}</h5>
                    <p class="text-xs text-slate-600 mt-1">Waktu: ${sch.jam_mulai} - ${sch.jam_selesai} (${sch.durasi} Menit)</p>
                </div>
                <button onclick='startExamSession(${JSON.stringify(sch)})' class="w-full py-2.5 bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs rounded-lg transition">
                    Mulai Ujian
                </button>
            </div>
        `;
    });
    scheduleContainer.innerHTML = html;
}

/**
 * Mengunduh Paket Soal & Pre-cache Seluruh Gambar untuk Mode 100% Offline
 */
async function downloadOfflinePackage() {
    const user = State.currentUser;
    if (!user) return;
    const btn = document.getElementById('btn-download-offline');
    const badge = document.getElementById('offline-package-badge');
    const progressText = document.getElementById('download-progress-text');

    btn.disabled = true;
    progressText.textContent = "Mengunduh jadwal dan paket soal ke penyimpanan perangkat...";

    try {
        const schedules = await fetchSchedulesForClass(user.kelas);
        let totalSoalCached = 0;

        for (const sch of schedules) {
            const soalList = await fetchBankSoalForExam(sch.mapel, user.kelas);
            totalSoalCached += soalList.length;

            // Pre-cache gambar dalam soal menggunakan Cache API
            if ('caches' in window) {
                const imgCache = await caches.open('cbt-soal-images-v2.6');
                for (const s of soalList) {
                    const regexImg = /src="([^"]+)"/g;
                    let match;
                    while ((match = regexImg.exec(s.soal_html)) !== null) {
                        try {
                            await imgCache.add(match[1]);
                        } catch (e) {
                            console.warn("Gagal pre-cache gambar:", match[1]);
                        }
                    }
                }
            }
        }

        badge.textContent = "Paket Offline: Siap (Tersimpan)";
        badge.className = "px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800";
        progressText.textContent = `Berhasil menyimpan paket soal (${totalSoalCached} butir soal) ke perangkat Anda.`;
        showToast("Paket ujian offline berhasil diunduh!", "success");
    } catch (err) {
        console.error("Gagal mengunduh paket offline:", err);
        progressText.textContent = "Gagal mengunduh paket. Periksa koneksi internet.";
    } finally {
        btn.disabled = false;
    }
}

/**
 * Memulai Sesi Ujian (Mengaktifkan Fullscreen, Mengacak Soal, & Timer)
 */
async function startExamSession(schedule) {
    if (!confirm(`Mulai ujian ${schedule.mapel}? Pastikan Anda siap dan tidak meninggalkan layar ujian.`)) return;

    State.examActive = schedule;
    State.answers = {};
    State.doubtful = {};
    State.violations = 0;
    State.currentIndex = 0;

    // Ambil soal dari server atau cache
    const rawSoal = await fetchBankSoalForExam(schedule.mapel, State.currentUser.kelas);
    if (!rawSoal || rawSoal.length === 0) {
        showToast("Bank soal untuk mata pelajaran ini belum tersedia!", "error");
        return;
    }

    // Acak urutan soal (Fisher-Yates Shuffle) per siswa
    State.questions = [...rawSoal].sort(() => Math.random() - 0.5);

    // Pulihkan progres auto-save jika ada
    const savedProgress = localStorage.getItem(`cbt_progress_${State.currentUser.nisn}_${schedule.mapel}`);
    if (savedProgress) {
        try {
            const parsed = JSON.parse(savedProgress);
            State.answers = parsed.answers || {};
            State.doubtful = parsed.doubtful || {};
        } catch (e) { console.error(e); }
    }

    showScreen('screen-exam');
    document.getElementById('exam-mapel-title').textContent = schedule.mapel;
    document.getElementById('exam-student-info').textContent = `${State.currentUser.nama} (${State.currentUser.kelas})`;
    document.getElementById('exam-max-violations').textContent = APP_CONFIG.MAX_VIOLATIONS;

    // Aktifkan mode layar penuh (Fullscreen)
    document.documentElement.requestFullscreen().catch(err => console.log("Fullscreen ditolak browser:", err));

    // Mulai Timer Mundur (dalam detik)
    State.timeRemaining = schedule.durasi * 60;
    if (State.timerInterval) clearInterval(State.timerInterval);
    State.timerInterval = setInterval(updateExamTimer, 1000);

    // Mulai Auto-Save Lokal
    if (State.autoSaveTimer) clearInterval(State.autoSaveTimer);
    State.autoSaveTimer = setInterval(autoSaveExamProgress, APP_CONFIG.AUTO_SAVE_INTERVAL_MS);

    // Aktifkan listener keamanan anti-kecurangan
    setupSecurityListeners();

    renderCurrentQuestion();
    renderQuestionNavGrid();
}

function updateExamTimer() {
    if (State.timeRemaining <= 0) {
        clearInterval(State.timerInterval);
        showToast("Waktu ujian telah habis!", "info");
        submitExam(true);
        return;
    }

    State.timeRemaining--;
    const hours = Math.floor(State.timeRemaining / 3600);
    const minutes = Math.floor((State.timeRemaining % 3600) / 60);
    const seconds = State.timeRemaining % 60;

    document.getElementById('exam-timer').textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function autoSaveExamProgress() {
    if (!State.currentUser || !State.examActive) return;
    const progressData = {
        answers: State.answers,
        doubtful: State.doubtful,
        timestamp: Date.now()
    };
    localStorage.setItem(`cbt_progress_${State.currentUser.nisn}_${State.examActive.mapel}`, JSON.stringify(progressData));
}

function renderCurrentQuestion() {
    if (State.questions.length === 0) return;
    const idx = State.currentIndex;
    const q = State.questions[idx];

    document.getElementById('exam-current-number').textContent = idx + 1;
    document.getElementById('exam-total-number').textContent = State.questions.length;
    document.getElementById('exam-question-content').innerHTML = q.soal_html;

    const options = [
        { key: 'A', text: q.opsi_a },
        { key: 'B', text: q.opsi_b },
        { key: 'C', text: q.opsi_c },
        { key: 'D', text: q.opsi_d },
        { key: 'E', text: q.opsi_e }
    ].filter(opt => opt.text && opt.text.trim() !== '');

    const currentAnswer = State.answers[q.id];
    let html = '';
    options.forEach(opt => {
        const isChecked = currentAnswer === opt.key ? 'checked' : '';
        const activeClass = isChecked ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50';
        html += `
            <label class="flex items-start gap-3 p-3.5 rounded-xl border ${activeClass} cursor-pointer transition select-none">
                <input type="radio" name="exam_option" value="${opt.key}" ${isChecked} onclick="selectAnswer('${q.id}', '${opt.key}')" class="mt-1 w-4 h-4 text-blue-600 accent-blue-600" />
                <span class="font-bold text-slate-800 text-sm mr-2">${opt.key}.</span>
                <span class="text-slate-900 text-sm flex-1">${opt.text}</span>
            </label>
        `;
    });
    document.getElementById('exam-options-container').innerHTML = html;

    // Checkbox ragu-ragu
    document.getElementById('exam-flag-doubt').checked = !!State.doubtful[q.id];

    // Tombol Navigasi
    document.getElementById('btn-prev-question').disabled = idx === 0;
    const isLast = idx === State.questions.length - 1;
    document.getElementById('btn-next-question').classList.toggle('hidden', isLast);
    document.getElementById('btn-finish-exam').classList.toggle('hidden', !isLast);

    renderQuestionNavGrid();
}

function selectAnswer(questionId, optionKey) {
    State.answers[questionId] = optionKey;
    renderQuestionNavGrid();
    autoSaveExamProgress();
}

function toggleDoubtCurrentQuestion() {
    const q = State.questions[State.currentIndex];
    State.doubtful[q.id] = document.getElementById('exam-flag-doubt').checked;
    renderQuestionNavGrid();
}

function navigateQuestion(direction) {
    const newIdx = State.currentIndex + direction;
    if (newIdx >= 0 && newIdx < State.questions.length) {
        State.currentIndex = newIdx;
        renderCurrentQuestion();
    }
}

function jumpToQuestion(index) {
    if (index >= 0 && index < State.questions.length) {
        State.currentIndex = index;
        renderCurrentQuestion();
    }
}

function renderQuestionNavGrid() {
    const grid = document.getElementById('exam-question-grid');
    if (!grid) return;
    let html = '';
    State.questions.forEach((q, idx) => {
        const isAnswered = State.answers[q.id] !== undefined;
        const isDoubtful = State.doubtful[q.id];
        const isCurrent = State.currentIndex === idx;

        let bgClass = "bg-slate-200 text-slate-700";
        if (isAnswered) bgClass = "bg-emerald-600 text-white font-bold";
        if (isDoubtful) bgClass = "bg-amber-400 text-slate-900 font-bold";
        if (isCurrent) bgClass += " ring-2 ring-blue-900 scale-105";

        html += `
            <button onclick="jumpToQuestion(${idx})" class="h-10 rounded-lg text-xs font-bold transition flex items-center justify-center ${bgClass}">
                ${idx + 1}
            </button>
        `;
    });
    grid.innerHTML = html;
}

/**
 * Sistem Keamanan & Anti-Kecurangan (Deteksi Keluar Layar / Fullscreen / Blur)
 */
function setupSecurityListeners() {
    // 1. Deteksi Keluar Fullscreen
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && State.examActive) {
            triggerViolation("Anda keluar dari mode layar penuh (Fullscreen).");
        }
    });

    // 2. Deteksi Pindah Tab / Minimalkan Browser (Visibility Change)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && State.examActive) {
            triggerViolation("Anda terdeteksi berpindah tab atau meminimalkan browser.");
        }
    });

    // 3. Deteksi Kehilangan Fokus Jendela (Blur)
    window.addEventListener('blur', () => {
        if (State.examActive) {
            document.body.classList.add('screen-blur-lock');
            triggerViolation("Layar ujian kehilangan fokus (berpindah aplikasi).");
        }
    });

    window.addEventListener('focus', () => {
        document.body.classList.remove('screen-blur-lock');
    });

    // 4. Blokir Klik Kanan & Shortcut PrintScreen / Copy
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('copy', e => e.preventDefault());
    document.addEventListener('cut', e => e.preventDefault());
    document.addEventListener('paste', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        if (e.key === 'PrintScreen' || (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'u' || e.key === 'c'))) {
            e.preventDefault();
            triggerViolation("Pintasan keyboard terlarang terdeteksi.");
        }
    });
}

function triggerViolation(reason) {
    if (!State.examActive) return;
    State.violations++;
    document.getElementById('exam-violation-count').textContent = State.violations;

    if (State.violations >= APP_CONFIG.MAX_VIOLATIONS) {
        alert(`PERINGATAN KE-2! Anda melakukan pelanggaran batas maksimal. Ujian otomatis didiskualifikasi dengan nilai 0.`);
        submitExam(false, true); // Diskualifikasi
    } else {
        document.getElementById('modal-violation-counter').textContent = State.violations;
        document.getElementById('security-warning-message').textContent = reason;
        document.getElementById('modal-security-warning').classList.remove('hidden');
    }
}

function acknowledgeSecurityWarning() {
    document.getElementById('modal-security-warning').classList.add('hidden');
    // Coba kembalikan fullscreen
    document.documentElement.requestFullscreen().catch(err => {});
}

function confirmSubmitExam() {
    let unanswered = 0;
    State.questions.forEach(q => {
        if (!State.answers[q.id]) unanswered++;
    });

    let msg = "Apakah Anda yakin ingin mengumpulkan jawaban ujian ini?";
    if (unanswered > 0) {
        msg = `Peringatan: Terdapat ${unanswered} soal yang belum dijawab. Yakin ingin mengumpulkan?`;
    }

    if (confirm(msg)) {
        submitExam(false, false);
    }
}

/**
 * Kalkulasi Nilai, Pengiriman ke Supabase, atau Penyimpanan Offline
 */
async function submitExam(isTimeout = false, isDisqualified = false) {
    if (!State.examActive || !State.currentUser) return;

    if (State.timerInterval) clearInterval(State.timerInterval);
    if (State.autoSaveTimer) clearInterval(State.autoSaveTimer);

    let correctCount = 0;
    const totalSoal = State.questions.length;

    if (!isDisqualified) {
        State.questions.forEach(q => {
            const studentAns = State.answers[q.id];
            if (studentAns && studentAns.trim().toUpperCase() === q.kunci_jawaban.trim().toUpperCase()) {
                correctCount++;
            }
        });
    }

    const finalScore = isDisqualified ? 0 : Number(((correctCount / totalSoal) * 100).toFixed(2));
    const resultStatus = isDisqualified ? 'DIDISKUALIFIKASI' : (isTimeout ? 'SELESAI (TIMEOUT)' : 'SELESAI');

    const resultRecord = {
        id_siswa: State.currentUser.nisn,
        nama_siswa: State.currentUser.nama,
        kelas: State.currentUser.kelas,
        mapel: State.examActive.mapel,
        nilai: finalScore,
        jumlah_pelanggaran: State.violations,
        status_selesai: resultStatus,
        waktu_selesai: new Date().toISOString()
    };

    // Simpan ke localStorage (Antrean Sinkronisasi Offline)
    const offlineResults = JSON.parse(localStorage.getItem('cbt_offline_results') || '[]');
    // Hapus duplikat mapel yang sama
    const filteredResults = offlineResults.filter(r => !(r.id_siswa === resultRecord.id_siswa && r.mapel === resultRecord.mapel));
    filteredResults.push(resultRecord);
    localStorage.setItem('cbt_offline_results', JSON.stringify(filteredResults));

    // Coba kirim langsung ke Supabase jika online
    await syncOfflineResults(false);

    // Bersihkan cache progres ujian lokal
    localStorage.removeItem(`cbt_progress_${State.currentUser.nisn}_${State.examActive.mapel}`);
    State.examActive = null;

    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {});
    }

    showScreen('screen-student-lobby');
    showToast(`Ujian selesai! Nilai Anda: ${finalScore}`, "success");
    if (typeof renderStudentLobby === 'function') renderStudentLobby();
}

/**
 * Sinkronisasi Otomatis Hasil Ujian Offline ke Supabase
 */
async function syncOfflineResults(showAlerts = false) {
    const offlineResults = JSON.parse(localStorage.getItem('cbt_offline_results') || '[]');
    if (offlineResults.length === 0) {
        const banner = document.getElementById('offline-sync-banner');
        if (banner) banner.classList.add('hidden');
        return;
    }

    const countLabel = document.getElementById('pending-sync-count');
    if (countLabel) countLabel.textContent = offlineResults.length;
    const banner = document.getElementById('offline-sync-banner');
    if (banner) banner.classList.remove('hidden');

    if (!navigator.onLine || !supabaseClient) {
        if (showAlerts) showToast("Perangkat masih offline. Sinkronisasi ditunda.", "info");
        return;
    }

    try {
        let remainingResults = [];
        for (const res of offlineResults) {
            const { error } = await supabaseClient
                .from('hasil_ujian')
                .upsert([res], { onConflict: 'id_siswa,mapel' });
            
            if (error) {
                console.error("Gagal sinkronisasi record:", error);
                remainingResults.push(res);
            }
        }

        localStorage.setItem('cbt_offline_results', JSON.stringify(remainingResults));
        if (remainingResults.length === 0 && banner) {
            banner.classList.add('hidden');
            if (showAlerts) showToast("Seluruh hasil ujian berhasil disinkronkan ke server!", "success");
        }
    } catch (err) {
        console.error("Error sync offline results:", err);
        if (showAlerts) showToast("Gagal menyinkronkan ke server.", "error");
    }
}

// Listener status jaringan otomatis
window.addEventListener('online', () => {
    State.isOfflineMode = false;
    const badge = document.getElementById('login-network-badge');
    if (badge) {
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>Status: Online</span>`;
        badge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 mb-3";
    }
    const lobbyStatus = document.getElementById('lobby-network-status');
    if (lobbyStatus) {
        lobbyStatus.textContent = "ONLINE";
        lobbyStatus.className = "px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white";
    }
    syncOfflineResults(false);
});

window.addEventListener('offline', () => {
    State.isOfflineMode = true;
    const badge = document.getElementById('login-network-badge');
    if (badge) {
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span><span>Status: Offline (Mode Lokal)</span>`;
        badge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-200 border border-amber-400/30 mb-3";
    }
    const lobbyStatus = document.getElementById('lobby-network-status');
    if (lobbyStatus) {
        lobbyStatus.textContent = "OFFLINE";
        lobbyStatus.className = "px-3 py-1 rounded-full text-xs font-bold bg-amber-600 text-white";
    }
});

window.renderStudentLobby = renderStudentLobby;
window.downloadOfflinePackage = downloadOfflinePackage;
window.startExamSession = startExamSession;
window.selectAnswer = selectAnswer;
window.toggleDoubtCurrentQuestion = toggleDoubtCurrentQuestion;
window.navigateQuestion = navigateQuestion;
window.jumpToQuestion = jumpToQuestion;
window.acknowledgeSecurityWarning = acknowledgeSecurityWarning;
window.confirmSubmitExam = confirmSubmitExam;
window.syncOfflineResults = syncOfflineResults;