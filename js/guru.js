/**
 * Manajemen Akun Guru Pengampu & Pengawas Ruang
 */

let editingGuruId = null;

async function renderGuruTable() {
    const tbody = document.getElementById('guru-table-body');
    if (!tbody) return;

    const data = await fetchAllRows('guru', 'guru');
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-6 text-center text-slate-500">Belum ada data guru terdaftar.</td></tr>`;
        return;
    }

    let html = '';
    data.forEach(g => {
        html += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="px-4 py-3">
                    <div class="font-bold text-slate-900">${g.nama_guru}</div>
                    <div class="text-xs text-slate-500 font-mono">NIP: ${g.nip}</div>
                </td>
                <td class="px-4 py-3 text-blue-800 font-semibold">${g.mapel || '-'}</td>
                <td class="px-4 py-3">${g.jabatan}</td>
                <td class="px-4 py-3 font-semibold">${g.kelas || '-'}</td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-bold">${g.status}</span></td>
                <td class="px-4 py-3 text-right">
                    <button onclick='openGuruModal(${JSON.stringify(g)})' class="text-blue-700 hover:underline font-bold text-xs mr-2">Edit</button>
                    <button onclick="deleteGuru('${g.id}')" class="text-rose-600 hover:underline font-bold text-xs">Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function openGuruModal(guru = null) {
    editingGuruId = guru ? guru.id : null;
    document.getElementById('modal-guru-title').textContent = guru ? "Edit Data Guru" : "Tambah Guru Baru";
    document.getElementById('edit-guru-nama').value = guru ? guru.nama_guru : '';
    document.getElementById('edit-guru-nip').value = guru ? guru.nip : '';
    document.getElementById('edit-guru-hp').value = guru ? guru.no_hp || '' : '';
    document.getElementById('edit-guru-pass').value = guru ? guru.password : '';
    document.getElementById('edit-guru-kelas').value = guru ? guru.kelas || '' : '';
    document.getElementById('edit-guru-jabatan').value = guru ? guru.jabatan : 'Guru Mapel';
    document.getElementById('edit-guru-kepegawaian').value = guru ? guru.status_kepegawaian || 'PNS' : 'PNS';
    document.getElementById('edit-guru-status').value = guru ? guru.status || 'Aktif' : 'Aktif';

    // Set mapel dropdown
    loadGlobalMapelOptions().then(() => {
        if (guru && guru.mapel) {
            document.getElementById('edit-guru-mapel').value = guru.mapel;
        }
    });

    document.getElementById('modal-edit-guru').classList.remove('hidden');
}

function closeGuruModal() {
    document.getElementById('modal-edit-guru').classList.add('hidden');
}

async function handleSaveGuruModal(event) {
    event.preventDefault();
    const record = {
        nama_guru: document.getElementById('edit-guru-nama').value.trim(),
        nip: document.getElementById('edit-guru-nip').value.trim(),
        no_hp: document.getElementById('edit-guru-hp').value.trim(),
        password: document.getElementById('edit-guru-pass').value.trim(),
        mapel: document.getElementById('edit-guru-mapel').value,
        kelas: document.getElementById('edit-guru-kelas').value.trim(),
        jabatan: document.getElementById('edit-guru-jabatan').value,
        status_kepegawaian: document.getElementById('edit-guru-kepegawaian').value,
        status: document.getElementById('edit-guru-status').value
    };

    try {
        if (editingGuruId) {
            const { error } = await supabaseClient.from('guru').update(record).eq('id', editingGuruId);
            if (error) throw error;
            showToast("Data guru berhasil diperbarui!", "success");
        } else {
            const { error } = await supabaseClient.from('guru').insert([record]);
            if (error) throw error;
            showToast("Guru berhasil ditambahkan!", "success");
        }
        closeGuruModal();
        renderGuruTable();
    } catch (err) {
        showToast("Gagal menyimpan guru: " + err.message, "error");
    }
}

async function deleteGuru(id) {
    if (!confirm("Hapus akun guru ini?")) return;
    try {
        const { error } = await supabaseClient.from('guru').delete().eq('id', id);
        if (error) throw error;
        showToast("Guru dihapus.", "success");
        renderGuruTable();
    } catch (err) {
        showToast("Gagal menghapus guru.", "error");
    }
}

window.renderGuruTable = renderGuruTable;
window.openGuruModal = openGuruModal;
window.closeGuruModal = closeGuruModal;
window.handleSaveGuruModal = handleSaveGuruModal;
window.deleteGuru = deleteGuru;