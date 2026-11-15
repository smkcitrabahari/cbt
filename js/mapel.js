/**
 * Manajemen Mata Pelajaran (CRUD)
 */

async function renderMapelList() {
    const listContainer = document.getElementById('mapel-list-container');
    if (!listContainer) return;

    const data = await fetchAllRows('mapel', 'mapel');
    if (!data || data.length === 0) {
        listContainer.innerHTML = `<li class="p-4 text-xs text-slate-500 text-center">Belum ada data mata pelajaran.</li>`;
        return;
    }

    let html = '';
    data.forEach(m => {
        html += `
            <li class="p-3.5 flex items-center justify-between text-sm bg-white hover:bg-slate-50 transition">
                <span class="font-bold text-slate-800">${m.nama_mapel}</span>
                <button onclick="deleteMapel('${m.id}')" class="text-rose-600 hover:text-rose-800 font-bold text-xs">Hapus</button>
            </li>
        `;
    });
    listContainer.innerHTML = html;
}

async function handleAddMapel(event) {
    event.preventDefault();
    const nama = document.getElementById('mapel-nama-input').value.trim();
    if (!nama) return;

    if (!supabaseClient) {
        showToast("Supabase tidak aktif. Simpan mapel memerlukan server.", "error");
        return;
    }

    try {
        const { error } = await supabaseClient.from('mapel').insert([{ nama_mapel: nama }]);
        if (error) throw error;
        document.getElementById('mapel-nama-input').value = '';
        showToast("Mata pelajaran berhasil ditambahkan!", "success");
        renderMapelList();
        loadGlobalMapelOptions();
    } catch (err) {
        showToast("Gagal menyimpan mapel: " + err.message, "error");
    }
}

async function deleteMapel(id) {
    if (!confirm("Hapus mata pelajaran ini?")) return;
    try {
        const { error } = await supabaseClient.from('mapel').delete().eq('id', id);
        if (error) throw error;
        showToast("Mata pelajaran dihapus.", "success");
        renderMapelList();
        loadGlobalMapelOptions();
    } catch (err) {
        showToast("Gagal menghapus: " + err.message, "error");
    }
}

async function loadGlobalMapelOptions() {
    const mapels = await fetchAllRows('mapel', 'mapel');
    const selectors = ['rekap-filter-mapel', 'soal-select-mapel', 'jadwal-mapel', 'edit-guru-mapel'];
    
    selectors.forEach(selId => {
        const el = document.getElementById(selId);
        if (!el) return;
        let html = `<option value="">-- Pilih Mata Pelajaran --</option>`;
        if (selId === 'rekap-filter-mapel') html = `<option value="">Semua Mata Pelajaran</option>`;
        
        mapels.forEach(m => {
            html += `<option value="${m.nama_mapel}">${m.nama_mapel}</option>`;
        });
        el.innerHTML = html;
    });
}

window.renderMapelList = renderMapelList;
window.handleAddMapel = handleAddMapel;
window.deleteMapel = deleteMapel;
window.loadGlobalMapelOptions = loadGlobalMapelOptions;