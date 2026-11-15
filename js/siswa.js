/**
 * Manajemen Data Siswa & Fitur Cetak Kartu Peserta
 */

async function renderSiswaTable() {
    const tbody = document.getElementById('siswa-table-body');
    const countLabel = document.getElementById('siswa-total-label');
    const searchKeyword = (document.getElementById('siswa-search-input')?.value || '').toLowerCase();
    if (!tbody) return;

    const data = await fetchAllRows('siswa', 'siswa');
    const filtered = data.filter(s => 
        s.nisn.toLowerCase().includes(searchKeyword) ||
        s.nama.toLowerCase().includes(searchKeyword) ||
        s.kelas.toLowerCase().includes(searchKeyword)
    );

    if (countLabel) countLabel.textContent = `${filtered.length} Peserta`;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-6 text-center text-slate-500">Tidak ada data siswa ditemukan.</td></tr>`;
        return;
    }

    let html = '';
    filtered.forEach(s => {
        html += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="px-4 py-3 font-mono font-bold text-slate-800">${s.nisn}</td>
                <td class="px-4 py-3 font-bold text-slate-900">${s.nama}</td>
                <td class="px-4 py-3 text-blue-800 font-semibold">${s.kelas}</td>
                <td class="px-4 py-3 font-mono text-slate-600">${s.password}</td>
                <td class="px-4 py-3 text-right">
                    <button onclick="deleteSiswa('${s.id}')" class="text-rose-600 hover:underline font-bold text-xs">Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

async function handleAddSiswa(event) {
    event.preventDefault();
    const nisn = document.getElementById('siswa-nisn').value.trim();
    const nama = document.getElementById('siswa-nama').value.trim();
    const kelas = document.getElementById('siswa-kelas').value.trim();
    const password = document.getElementById('siswa-pass').value.trim();

    if (!supabaseClient) {
        showToast("Supabase tidak aktif.", "error");
        return;
    }

    try {
        const { error } = await supabaseClient.from('siswa').insert([{ nisn, nama, kelas, password }]);
        if (error) throw error;
        
        document.getElementById('siswa-nisn').value = '';
        document.getElementById('siswa-nama').value = '';
        document.getElementById('siswa-kelas').value = '';
        document.getElementById('siswa-pass').value = '';
        
        showToast("Siswa berhasil ditambahkan!", "success");
        renderSiswaTable();
    } catch (err) {
        showToast("Gagal menambah siswa: " + err.message, "error");
    }
}

async function deleteSiswa(id) {
    if (!confirm("Hapus data siswa ini?")) return;
    try {
        const { error } = await supabaseClient.from('siswa').delete().eq('id', id);
        if (error) throw error;
        showToast("Siswa dihapus.", "success");
        renderSiswaTable();
    } catch (err) {
        showToast("Gagal menghapus siswa: " + err.message, "error");
    }
}

function printStudentExamCards() {
    fetchAllRows('siswa', 'siswa').then(students => {
        if (!students || students.length === 0) {
            alert("Tidak ada data siswa untuk dicetak.");
            return;
        }

        let printHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 20px;">
                    <h2>KARTU PESERTA UJIAN CBT</h2>
                    <h3>${APP_CONFIG.SCHOOL_NAME}</h3>
                    <p>${APP_CONFIG.EXAM_TITLE} - Tahun Ajaran ${APP_CONFIG.ACADEMIC_YEAR}</p>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: center;">
        `;

        students.forEach(s => {
            printHtml += `
                <div style="width: 320px; border: 1.5px dashed #333; border-radius: 8px; padding: 15px; box-sizing: border-box; background: #fff;">
                    <div style="font-size: 11px; font-weight: bold; text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 8px;">
                        KARTU LOGIN UJIAN CBT
                    </div>
                    <table style="font-size: 12px; width: 100%;">
                        <tr><td style="width: 80px;">Nama</td><td>: <b>${s.nama}</b></td></tr>
                        <tr><td>NISN</td><td>: <b>${s.nisn}</b></td></tr>
                        <tr><td>Kelas</td><td>: <b>${s.kelas}</b></td></tr>
                        <tr><td>Password</td><td>: <span style="font-family: monospace; background: #eee; padding: 2px 6px; font-weight: bold;">${s.password}</span></td></tr>
                    </table>
                    <div style="font-size: 10px; text-align: center; margin-top: 10px; color: #555;">
                        * Simpan kartu ini dengan baik dan jangan dibagikan ke peserta lain.
                    </div>
                </div>
            `;
        });

        printHtml += `</div></div>`;
        document.getElementById('print-area').innerHTML = printHtml;
        window.print();
    });
}

window.renderSiswaTable = renderSiswaTable;
window.handleAddSiswa = handleAddSiswa;
window.deleteSiswa = deleteSiswa;
window.printStudentExamCards = printStudentExamCards;