/**
 * Manajemen Jadwal Ujian Multi-Kelas
 */

async function renderJadwalManagement() {
    const tbody = document.getElementById('jadwal-table-body');
    const checkboxContainer = document.getElementById('jadwal-kelas-checkboxes');
    if (!tbody || !checkboxContainer) return;

    // Ambil daftar kelas unik dari tabel siswa
    const siswaData = await fetchAllRows('siswa', 'siswa');
    const kelasSet = [...new Set(siswaData.map(s => s.kelas))].sort();

    let cbHtml = '';
    if (kelasSet.length === 0) {
        cbHtml = `<span class="text-xs text-slate-500">Belum ada data kelas. Tambahkan siswa terlebih dahulu.</span>`;
    } else {
        kelasSet.forEach(k => {
            cbHtml += `
                <label class="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input type="checkbox" name="jadwal_kelas_target" value="${k}" class="w-4 h-4 text-blue-600 accent-blue-600" />
                    <span>${k}</span>
                </label>
            `;
        });
    }
    checkboxContainer.innerHTML = cbHtml;

    // Ambil daftar jadwal
    const schedules = await fetchAllRows('jadwal_ujian', 'jadwal');
    if (schedules.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-6 text-center text-slate-500">Belum ada jadwal ujian diaktifkan.</td></tr>`;
        return;
    }

    let html = '';
    schedules.forEach(sch => {
        html += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="px-4 py-3 font-bold text-slate-900">${sch.mapel}</td>
                <td class="px-4 py-3 text-blue-800 font-semibold">${sch.kelas}</td>
                <td class="px-4 py-3">${sch.tanggal}</td>
                <td class="px-4 py-3">${sch.jam_mulai} - ${sch.jam_selesai}</td>
                <td class="px-4 py-3 font-bold">${sch.durasi} Menit</td>
                <td class="px-4 py-3 text-right">
                    <button onclick="deleteJadwal('${sch.id}')" class="text-rose-600 hover:underline font-bold text-xs">Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

async function handleSaveJadwal(event) {
    event.preventDefault();
    const mapel = document.getElementById('jadwal-mapel').value;
    const tanggal = document.getElementById('jadwal-tanggal').value;
    const jamMulai = document.getElementById('jadwal-mulai').value;
    const jamSelesai = document.getElementById('jadwal-selesai').value;
    const durasi = parseInt(document.getElementById('jadwal-durasi').value) || 90;

    const selectedKelas = Array.from(document.querySelectorAll('input[name="jadwal_kelas_target"]:checked')).map(el => el.value);

    if (selectedKelas.length === 0) {
        alert("Pilih minimal satu kelas target ujian!");
        return;
    }

    if (!supabaseClient) {
        showToast("Supabase tidak aktif.", "error");
        return;
    }

    try {
        const insertPayload = selectedKelas.map(k => ({
            mapel,
            kelas: k,
            tanggal,
            jam_mulai: jamMulai,
            jam_selesai: jamSelesai,
            durasi
        }));

        const { error } = await supabaseClient.from('jadwal_ujian').insert(insertPayload);
        if (error) throw error;

        showToast("Jadwal ujian berhasil diaktifkan!", "success");
        renderJadwalManagement();
    } catch (err) {
        showToast("Gagal menyimpan jadwal: " + err.message, "error");
    }
}

async function deleteJadwal(id) {
    if (!confirm("Hapus jadwal ujian ini?")) return;
    try {
        const { error } = await supabaseClient.from('jadwal_ujian').delete().eq('id', id);
        if (error) throw error;
        showToast("Jadwal berhasil dihapus.", "success");
        renderJadwalManagement();
    } catch (err) {
        showToast("Gagal menghapus jadwal.", "error");
    }
}

window.renderJadwalManagement = renderJadwalManagement;
window.handleSaveJadwal = handleSaveJadwal;
window.deleteJadwal = deleteJadwal;