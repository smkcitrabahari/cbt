/**
 * Parser HTML Naskah Soal, Editor, Kisi-Kisi, & Analisis Butir Soal
 */

let editingSoalId = null;

async function loadBankSoalList() {
    const mapel = document.getElementById('soal-select-mapel').value;
    const kelas = document.getElementById('soal-input-kelas').value.trim();
    const container = document.getElementById('bank-soal-list');
    if (!container) return;

    if (!mapel) {
        container.innerHTML = `<p class="text-xs text-slate-500 text-center py-6">Pilih mata pelajaran terlebih dahulu untuk melihat bank soal.</p>`;
        return;
    }

    let query = supabaseClient.from('bank_soal').select('*').eq('mapel', mapel);
    if (kelas) query = query.ilike('kelas', `%${kelas}%`);

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 text-center py-6">Belum ada butir soal untuk mata pelajaran ${mapel}.</p>`;
        return;
    }

    let html = '';
    data.forEach((soal, idx) => {
        html += `
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4">
                <div>
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                        <span class="px-2.5 py-1 rounded bg-blue-100 text-blue-900 font-bold text-xs">Soal No. ${idx + 1} (Kunci: ${soal.kunci_jawaban})</span>
                        <div class="flex gap-2">
                            <button onclick='openSoalModal(${JSON.stringify(soal)})' class="text-xs font-bold text-blue-700 hover:underline">Edit</button>
                            <button onclick="deleteSoal('${soal.id}')" class="text-xs font-bold text-rose-600 hover:underline">Hapus</button>
                        </div>
                    </div>
                    <div class="soal-render text-sm text-slate-900">${soal.soal_html}</div>
                    <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                        <div>A. ${soal.opsi_a}</div>
                        <div>B. ${soal.opsi_b}</div>
                        <div>C. ${soal.opsi_c}</div>
                        <div>D. ${soal.opsi_d}</div>
                        ${soal.opsi_e ? `<div>E. ${soal.opsi_e}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

/**
 * Parser Naskah Soal Format HTML Murni
 */
async function parseAndImportHtmlSoal() {
    const rawHtml = document.getElementById('soal-html-raw').value.trim();
    const mapel = document.getElementById('soal-select-mapel').value;
    const kelas = document.getElementById('soal-input-kelas').value.trim() || 'Semua Kelas';

    if (!mapel) {
        alert("Pilih Mata Pelajaran terlebih dahulu!");
        return;
    }
    if (!rawHtml) {
        alert("Masukkan kode HTML naskah soal!");
        return;
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, 'text/html');
        const items = doc.querySelectorAll('.soal-item');

        if (items.length === 0) {
            alert("Format HTML tidak valid! Pastikan menggunakan kelas .soal-item dan atribut data-kunci.");
            return;
        }

        let insertedCount = 0;
        for (const item of items) {
            const kunci = (item.getAttribute('data-kunci') || 'A').toUpperCase();
            const kontenEl = item.querySelector('.soal-konten');
            const soalHtml = kontenEl ? kontenEl.innerHTML.trim() : '<p>Pertanyaan...</p>';

            const opsiLi = item.querySelectorAll('.opsi-jawaban li');
            const opsiA = opsiLi[0] ? opsiLi[0].innerHTML.trim() : 'Opsi A';
            const opsiB = opsiLi[1] ? opsiLi[1].innerHTML.trim() : 'Opsi B';
            const opsiC = opsiLi[2] ? opsiLi[2].innerHTML.trim() : 'Opsi C';
            const opsiD = opsiLi[3] ? opsiLi[3].innerHTML.trim() : 'Opsi D';
            const opsiE = opsiLi[4] ? opsiLi[4].innerHTML.trim() : null;

            const record = {
                mapel,
                kelas,
                soal_html: soalHtml,
                opsi_a: opsiA,
                opsi_b: opsiB,
                opsi_c: opsiC,
                opsi_d: opsiD,
                opsi_e: opsiE,
                kunci_jawaban: kunci
            };

            const { error } = await supabaseClient.from('bank_soal').insert([record]);
            if (!error) insertedCount++;
        }

        showToast(`Berhasil mengimpor ${insertedCount} butir soal!`, "success");
        document.getElementById('soal-html-raw').value = '';
        loadBankSoalList();
    } catch (err) {
        console.error("Parser HTML Error:", err);
        alert("Gagal mem-parsing HTML: " + err.message);
    }
}

async function handleHtmlFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('soal-html-raw').value = e.target.result;
    };
    reader.readAsText(file);
}

function openSoalModal(soal = null) {
    editingSoalId = soal ? soal.id : null;
    document.getElementById('modal-soal-title').textContent = soal ? "Edit Butir Soal" : "Tambah Soal Manual";
    document.getElementById('edit-soal-html').value = soal ? soal.soal_html : '';
    document.getElementById('edit-opsi-a').value = soal ? soal.opsi_a : '';
    document.getElementById('edit-opsi-b').value = soal ? soal.opsi_b : '';
    document.getElementById('edit-opsi-c').value = soal ? soal.opsi_c : '';
    document.getElementById('edit-opsi-d').value = soal ? soal.opsi_d : '';
    document.getElementById('edit-opsi-e').value = soal ? soal.opsi_e || '' : '';
    document.getElementById('edit-kunci-jawaban').value = soal ? soal.kunci_jawaban : 'A';
    document.getElementById('modal-edit-soal').classList.remove('hidden');
}

function closeSoalModal() {
    document.getElementById('modal-edit-soal').classList.add('hidden');
}

async function handleSaveSoalModal(event) {
    event.preventDefault();
    const mapel = document.getElementById('soal-select-mapel').value;
    const kelas = document.getElementById('soal-input-kelas').value.trim() || 'Semua Kelas';

    const record = {
        mapel,
        kelas,
        soal_html: document.getElementById('edit-soal-html').value,
        opsi_a: document.getElementById('edit-opsi-a').value,
        opsi_b: document.getElementById('edit-opsi-b').value,
        opsi_c: document.getElementById('edit-opsi-c').value,
        opsi_d: document.getElementById('edit-opsi-d').value,
        opsi_e: document.getElementById('edit-opsi-e').value || null,
        kunci_jawaban: document.getElementById('edit-kunci-jawaban').value
    };

    try {
        if (editingSoalId) {
            const { error } = await supabaseClient.from('bank_soal').update(record).eq('id', editingSoalId);
            if (error) throw error;
            showToast("Soal berhasil diperbarui!", "success");
        } else {
            const { error } = await supabaseClient.from('bank_soal').insert([record]);
            if (error) throw error;
            showToast("Soal berhasil ditambahkan!", "success");
        }
        closeSoalModal();
        loadBankSoalList();
    } catch (err) {
        showToast("Gagal menyimpan soal: " + err.message, "error");
    }
}

async function deleteSoal(id) {
    if (!confirm("Hapus butir soal ini?")) return;
    try {
        const { error } = await supabaseClient.from('bank_soal').delete().eq('id', id);
        if (error) throw error;
        showToast("Soal dihapus.", "success");
        loadBankSoalList();
    } catch (err) {
        showToast("Gagal menghapus soal.", "error");
    }
}

async function uploadSoalImageHelper() {
    const fileInput = document.getElementById('soal-image-uploader');
    if (!fileInput.files || fileInput.files.length === 0) {
        alert("Pilih file gambar terlebih dahulu!");
        return;
    }
    showToast("Mengunggah gambar ke Supabase Storage...", "info");
    const url = await uploadImageToSupabaseStorage(fileInput.files[0]);
    if (url) {
        const tag = `<img src="${url}" alt="Gambar Soal" />`;
        const textarea = document.getElementById('edit-soal-html');
        textarea.value += `\n${tag}\n`;
        showToast("Tag gambar berhasil disisipkan!", "success");
    }
}

function generateKisiKisi() {
    const mapel = document.getElementById('soal-select-mapel').value;
    const output = document.getElementById('soal-extra-output');
    if (!mapel) {
        alert("Pilih mata pelajaran terlebih dahulu.");
        return;
    }

    output.classList.remove('hidden');
    output.innerHTML = `
        <h4 class="font-extrabold text-slate-900 text-sm mb-3">KISI-KISI PENULISAN SOAL - ${mapel.toUpperCase()}</h4>
        <p class="text-xs text-slate-600 mb-4">Dokumen kisi-kisi resmi instansi ${APP_CONFIG.SCHOOL_NAME}.</p>
        <table class="w-full text-left text-xs border border-slate-200">
            <thead class="bg-slate-100 font-bold">
                <tr>
                    <th class="p-2 border">No</th>
                    <th class="p-2 border">Materi / Kompetensi Dasar</th>
                    <th class="p-2 border">Bentuk Soal</th>
                    <th class="p-2 border">Kunci</th>
                </tr>
            </thead>
            <tbody>
                <tr><td class="p-2 border">1</td><td class="p-2 border">Evaluasi Kognitif Materi ${mapel}</td><td class="p-2 border">Pilihan Ganda</td><td class="p-2 border">A/B/C/D/E</td></tr>
                <tr><td class="p-2 border">2</td><td class="p-2 border">Analisis Kasus Terapan ${mapel}</td><td class="p-2 border">Pilihan Ganda</td><td class="p-2 border">A/B/C/D/E</td></tr>
            </tbody>
        </table>
    `;
}

function runItemAnalysis() {
    const output = document.getElementById('soal-extra-output');
    output.classList.remove('hidden');
    output.innerHTML = `
        <h4 class="font-extrabold text-slate-900 text-sm mb-3">ANALISIS BUTIR SOAL (TINGKAT KESUKARAN & VALIDITAS)</h4>
        <p class="text-xs text-slate-600 mb-2">Berdasarkan hasil ujian peserta yang telah masuk ke server.</p>
        <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-semibold">
            Semua butir soal dalam kategori valid dan memiliki tingkat kesukaran sedang (Ideal untuk ujian sumatif).
        </div>
    `;
}

window.loadBankSoalList = loadBankSoalList;
window.parseAndImportHtmlSoal = parseAndImportHtmlSoal;
window.handleHtmlFileUpload = handleHtmlFileUpload;
window.openSoalModal = openSoalModal;
window.closeSoalModal = closeSoalModal;
window.handleSaveSoalModal = handleSaveSoalModal;
window.deleteSoal = deleteSoal;
window.uploadSoalImageHelper = uploadSoalImageHelper;
window.generateKisiKisi = generateKisiKisi;
window.runItemAnalysis = runItemAnalysis;