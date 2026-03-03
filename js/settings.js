// ============================================================
// SETTINGS.JS — Configuración, respaldo y notas
// ============================================================

function renderSettings() {
    loadAutoConfig();

    // Config WA
    if (document.getElementById('cfgPhone'))
        document.getElementById('cfgPhone').value = (db.config && db.config.phone) || '';
    if (document.getElementById('cfgBase'))
        document.getElementById('cfgBase').value = (db.config && db.config.baseUrl) || '';

    // Categorías
    document.getElementById('catList').innerHTML = db.categories.map((c, i) => `
        <div style="display:flex;justify-content:space-between;padding:5px 8px;background:var(--surface-alt);border-radius:7px;margin-bottom:3px;">
            <span style="font-weight:600;">${esc(c)}</span>
            <button class="btn btn-sm btn-danger" onclick="delCat(${i})" style="padding:1px 6px;">✕</button>
        </div>`).join('');

    // Plantillas
    document.getElementById('tplList').innerHTML = db.templates.map((t, i) => `
        <div style="display:flex;justify-content:space-between;padding:6px 8px;background:var(--surface-alt);border-radius:7px;margin-bottom:3px;">
            <span><strong>${esc(t.name)}</strong> <span style="font-size:0.75rem;color:var(--muted);">${t.tasks.length} tareas</span></span>
            <button class="btn btn-sm btn-danger" onclick="delTpl(${i})" style="padding:1px 6px;">✕</button>
        </div>`).join('') || '<p style="font-size:0.8rem;color:var(--muted);">—</p>';

    // Notas
    document.getElementById('noteList').innerHTML = (db.notes || []).map((n, i) => `
        <div class="note-card">
            <div style="display:flex;justify-content:space-between;">
                <span style="font-size:0.65rem;color:var(--muted);font-family:'JetBrains Mono',monospace;">${fD(n.time)}</span>
                <button class="btn btn-sm btn-danger" onclick="delNote(${i})" style="padding:1px 5px;min-height:auto;">✕</button>
            </div>
            <div style="margin-top:2px;font-size:0.82rem;">${esc(n.text)}</div>
        </div>`).join('');
}

// --- CATEGORÍAS ---

function addCat() {
    const i = document.getElementById('newCat');
    const v = i.value.trim();
    if (!v || db.categories.includes(v)) return;
    db.categories.push(v);
    i.value = '';
    saveDB();
    renderSettings();
}

function delCat(idx) {
    db.categories.splice(idx, 1);
    saveDB();
    renderSettings();
}

// --- PLANTILLAS ---

function delTpl(idx) {
    db.templates.splice(idx, 1);
    saveDB();
    renderSettings();
}

// --- NOTAS ---

function addNote() {
    const i = document.getElementById('qNote');
    const v = i.value.trim();
    if (!v) return;
    if (!db.notes) db.notes = [];
    db.notes.unshift({ text: v, time: new Date().toISOString() });
    i.value = '';
    saveDB();
    renderSettings();
}

function delNote(idx) {
    db.notes.splice(idx, 1);
    saveDB();
    renderSettings();
}

// --- RESPALDO ---

function exportDB() {
    const b = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href  = URL.createObjectURL(b);
    a.download = `taskboard_v4_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast('📥');
}

function saveConfig() {
    if (!db.config) db.config = { phone: '', baseUrl: '' };
    db.config.phone   = (document.getElementById('cfgPhone').value || '').trim().replace(/[^\d+]/g, '');
    db.config.baseUrl = (document.getElementById('cfgBase').value  || '').trim();
    if (db.config.baseUrl && !db.config.baseUrl.endsWith('/')) db.config.baseUrl += '/';
    saveDB();
    toast('✅ Guardado');
}

function importDB(e) {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
        try {
            const d = JSON.parse(ev.target.result);
            if (d.tasks && d.members) {
                db = d;
                ['projects','groups','templates','notifications','weeklyLog','notes','activity','waLog','waRounds'].forEach(k => {
                    if (!db[k]) db[k] = [];
                });
                if (!db.autoConfig) db.autoConfig = { unblock: true, progress: true, notify: true };
                if (!db.categories) db.categories = ['General','Emisiones','Mantenimiento','Calidad','Seguridad','Administrativo'];
                if (!db.config) db.config = { phone: '', baseUrl: '' };
                saveDB();
                refreshAll();
                toast('📤 OK');
            }
        } catch {
            toast('Error', 'error');
        }
    };
    r.readAsText(f);
    e.target.value = '';
}
