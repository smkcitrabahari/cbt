/**
 * Dashboard Analitik Real-Time & Rekapitulasi Nilai Resmi PDF
 */

let chartStatusInstance = null;
let chartProgresInstance = null;

async function renderRekapDashboard() {
    const mapelFilter = document.getElementById('rekap-filter-mapel')?.value || '';
    const kelasFilter = document.getElementById('rekap-filter-kelas')?.value || '';
    const tbody = document.getElementById('rekap-table-body');
    if (!tbody) return;

    // Load filter kelas dropdown jika kosong
    const siswaData = await fetchAllRows('siswa', 'siswa');
    const kelasSet = [...new Set(siswaData.map(s => s.kelas))].sort();
    const kelasSelect = document.getElementById('rekap-filter-kelas');
    if (kelasSelect && kelasSelect.options.length <= 1) {
        let kHtml = `<option value="">Semua Kelas</option>`;
        kelasSet.forEach(k => kHtml += `<option value="${k}">${k}</option>`);
        kelasSelect.innerHTML = kHtml;
    }

    const hasilData = await fetchAllRows('hasil_ujian', 'hasil');
    
    // Filter data sesuai pilihan
    const filtered = hasilData.filter(h => {
        let matchMapel = !mapelFilter || h.mapel === mapelFilter;
        let matchKelas = !kelasFilter || h.kelas === kelasFilter;
        // Jika login sebagai guru pengampu, batasi hanya mapel yang diampu
        if (State.currentUser && State.currentUser.role === 'guru' && State.currentUser.mapel) {
            matchMapel = h.mapel === State.currentUser.mapel;
        }
        return matchMapel && matchKelas;
    });

    // Hitung Statistik
    const totalPeserta = filtered.length;
    const totalNilai = filtered.reduce((acc, cur) => acc + Number(cur.nilai), 0);
    const rataNilai = totalPeserta > 0 ? (totalNilai / totalPeserta).toFixed(1) : '0.0';
    const nilaiTertinggi = totalPeserta > 0 ? Math.max(...filtered.map(h => Number(h.nilai))) : 0;
    const diskualifikasiCount = filtered.filter(h => h.status_selesai === 'DIDISKUALIFIKASI').length;

    document.getElementById('stat-total-peserta').textContent = totalPeserta;
    document.getElementById('stat-rata-nilai').textContent = rataNilai;
    document.getElementById('stat-nilai-tertinggi').textContent = nilaiTertinggi;
    document.getElementById('stat-diskualifikasi').textContent = diskualifikasiCount;

    // Render Tabel
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="px-4 py-6 text-center text-slate-500">Belum ada rekap hasil ujian yang masuk.</td></tr>`;
    } else {
        let html = '';
        filtered.forEach(h => {
            const statusBadge = h.status_selesai === 'DIDISKUALIFIKASI' 
                ? `<span class="px-2 py-0.5 rounded bg-rose-600 text-white text-[11px] font-bold">DIDISKUALIFIKASI</span>`
                : `<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">${h.status_selesai}</span>`;

            html += `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="px-4 py-3 font-mono font-bold">${h.id_siswa}</td>
                    <td class="px-4 py-3 font-bold text-slate-900">${h.nama_siswa}</td>
                    <td class="px-4 py-3 text-blue-800 font-semibold">${h.kelas}</td>
                    <td class="px-4 py-3">${h.mapel}</td>
                    <td class="px-4 py-3 text-center font-bold text-rose-600">${h.jumlah_pelanggaran}</td>
                    <td class="px-4 py-3 text-center font-extrabold text-blue-700">${h.nilai}</td>
                    <td class="px-4 py-3 text-center">${statusBadge}</td>
                    <td class="px-4 py-3 text-right">
                        <button onclick="resetStudentExam('${h.id_siswa}', '${h.mapel}')" class="text-xs font-bold text-rose-600 hover:underline">Reset Ujian</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    // Render Chart.js
    renderAnalyticsCharts(filtered);
}

function renderAnalyticsCharts(data) {
    const selesaiCount = data.filter(d => d.status_selesai.includes('SELESAI')).length;
    const diskualifikasiCount = data.filter(d => d.status_selesai === 'DIDISKUALIFIKASI').length;

    // 1. Chart Status Penyelesaian
    const ctxStatus = document.getElementById('chart-status-ujian');
    if (ctxStatus) {
        if (chartStatusInstance) chartStatusInstance.destroy();
        chartStatusInstance = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Selesai Normal', 'Didiskualifikasi'],
                datasets: [{
                    data: [selesaiCount, diskualifikasiCount],
                    backgroundColor: ['#059669', '#e11d48']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 2. Chart Rata-Rata per Kelas
    const classMap = {};
    data.forEach(d => {
        if (!classMap[d.kelas]) classMap[d.kelas] = { total: 0, count: 0 };
        classMap[d.kelas].total += Number(d.nilai);
        classMap[d.kelas].count += 1;
    });

    const classLabels = Object.keys(classMap);
    const classAverages = classLabels.map(k => (classMap[k].total / classMap[k].count).toFixed(1));

    const ctxProgres = document.getElementById('chart-progres-kelas');
    if (ctxProgres) {
        if (chartProgresInstance) chartProgresInstance.destroy();
        chartProgresInstance = new Chart(ctxProgres, {
            type: 'bar',
            data: {
                labels: classLabels.length > 0 ? classLabels : ['Belum Ada Data'],
                datasets: [{
                    label: 'Rata-Rata Nilai',
                    data: classAverages.length > 0 ? classAverages : [0],
                    backgroundColor: '#1e40af'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }
        });
    }
}

/**
 * Fitur Reset Ujian Siswa (Menghapus hasil di server agar siswa dapat mengulang ujian)
 */
async function resetStudentExam(nisn, mapel) {
    if (!confirm(`Reset hasil ujian siswa ${nisn} untuk mapel ${mapel}? Siswa akan dapat mengerjakan ulang.`)) return;

    try {
        const { error } = await supabaseClient
            .from('hasil_ujian')
            .delete()
            .match({ id_siswa: nisn, mapel: mapel });

        if (error) throw error;
        // Hapus juga progres lokal jika ada
        localStorage.removeItem(`cbt_progress_${nisn}_${mapel}`);
        showToast("Hasil ujian berhasil di-reset.", "success");
        renderRekapDashboard();
    } catch (err) {
        showToast("Gagal mereset ujian: " + err.message, "error");
    }
}

/**
 * Cetak PDF Berita Acara & Rekapitulasi Nilai Resmi dengan Kop Surat Sekolah
 */
async function printOfficialRekapPDF() {
    const hasilData = await fetchAllRows('hasil_ujian', 'hasil');
    if (!hasilData || hasilData.length === 0) {
        alert("Tidak ada data rekapitulasi nilai untuk dicetak.");
        return;
    }

    let rowsHtml = '';
    hasilData.forEach((h, idx) => {
        rowsHtml += `
            <tr>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${h.id_siswa}</td>
                <td style="border: 1px solid #333; padding: 6px;">${h.nama_siswa}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${h.kelas}</td>
                <td style="border: 1px solid #333; padding: 6px;">${h.mapel}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold;">${h.nilai}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${h.status_selesai}</td>
            </tr>
        `;
    });

    const printHtml = `
        <div style="font-family: Arial, sans-serif; padding: 30px; color: #000;">
            <!-- Kop Surat Sekolah -->
            <div style="display: flex; align-items: center; border-bottom: 3px double black; padding-bottom: 12px; margin-bottom: 25px;">
                <div style="width: 70px; height: 70px; background: #ddd; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px;">LOGO</div>
                <div style="flex: 1; text-align: center;">
                    <h3 style="margin: 0; font-size: 16px; font-weight: bold;">PEMERINTAH PROVINSI / DINAS PENDIDIKAN</h3>
                    <h1 style="margin: 3px 0; font-size: 20px; font-weight: bold;">${APP_CONFIG.SCHOOL_NAME}</h1>
                    <p style="margin: 0; font-size: 11px;">Tahun Ajaran: ${APP_CONFIG.ACADEMIC_YEAR}</p>
                </div>
            </div>

            <div style="text-align: center; margin-bottom: 20px;">
                <h3 style="margin: 0; text-transform: uppercase;">BERITA ACARA & REKAPITULASI NILAI UJIAN</h3>
                <p style="margin: 4px 0 0 0; font-size: 13px;">Kegiatan: ${APP_CONFIG.EXAM_TITLE}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 40px;">
                <thead>
                    <tr style="background: #f1f5f9;">
                        <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 40px;">No</th>
                        <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 100px;">NISN</th>
                        <th style="border: 1px solid #333; padding: 8px;">Nama Peserta</th>
                        <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 90px;">Kelas</th>
                        <th style="border: 1px solid #333; padding: 8px;">Mata Pelajaran</th>
                        <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 70px;">Nilai</th>
                        <th style="border: 1px solid #333; padding: 8px; text-align: center; width: 130px;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <!-- Tanda Tangan Kepala Sekolah & Proktor -->
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 40px; page-break-inside: avoid;">
                <div style="text-align: center; width: 250px;">
                    <p>Mengetahui,<br>Kepala Sekolah</p>
                    <br><br><br>
                    <p style="font-weight: bold; text-decoration: underline; margin: 0;">${APP_CONFIG.PRINCIPAL_NAME}</p>
                    <p style="margin: 2px 0 0 0;">NIP. ${APP_CONFIG.PRINCIPAL_NIP}</p>
                </div>
                <div style="text-align: center; width: 250px;">
                    <p>Proktor / Operator CBT,<br> </p>
                    <br><br><br>
                    <p style="font-weight: bold; text-decoration: underline; margin: 0;">___________________________</p>
                    <p style="margin: 2px 0 0 0;">NIP. ........................................</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('print-area').innerHTML = printHtml;
    window.print();
}

window.renderRekapDashboard = renderRekapDashboard;
window.resetStudentExam = resetStudentExam;
window.printOfficialRekapPDF = printOfficialRekapPDF;