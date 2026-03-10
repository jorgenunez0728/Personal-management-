// ============================================================
// TEAM.JS — Gestión de miembros del equipo y grupos
// ============================================================

const renderTeamD = debounce(renderTeam, 200);

// --- EQUIPO ---

function renderTeam() {
    const s  = (document.getElementById('teamSearch')?.value || '').toLowerCase();
    const gf = document.getElementById('filterTeamGroup')?.value || '';
    let M = [...db.members];
    if (s)  M = M.filter(m => m.name.toLowerCase().includes(s) || (m.role || '').toLowerCase().includes(s));
    if (gf) M = M.filter(m => m.groups && m.groups.includes(gf));

    document.getElementById('teamGrid').innerHTML = M.map(m => {
        const tasks  = db.tasks.filter(t => t.assignee === m.id);
        const done   = tasks.filter(t => t.status === 'done').length;
        const active = tasks.filter(t => t.status !== 'done').length;
        const p      = mWP(m);
        const c      = p >= 100 ? 'wl-danger' : p >= 70 ? 'wl-warn' : 'wl-ok';
        const col    = p >= 100 ? 'var(--danger)' : p >= 70 ? 'var(--warning)' : 'var(--success)';
        const groups = (m.groups || []).map(gid => {
            const g = db.groups.find(x => x.id === gid);
            return g ? `<span class="group-badge" style="background:${g.color}20;color:${g.color};border:1px solid ${g.color}40;">${esc(g.name)}</span>` : '';
        }).join('');

        const lastSent = (db.waLog || [])
            .filter(l => l.memberId === m.id && l.type === 'sent')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

        return `<div class="team-card">
            <div class="team-avatar" style="background:${m.color}">${ini(m.name)}</div>
            <div class="tc-name">${esc(m.name)}</div>
            <div class="tc-role">${esc(m.role || '')} · ${esc(m.dept || '')}</div>
            ${groups ? `<div style="text-align:center;margin-bottom:4px;">${groups}</div>` : ''}
            ${m.phone ? `<div style="font-size:0.7rem;color:var(--muted);text-align:center;">📱 ${esc(m.phone)}</div>` : ''}
            ${lastSent ? `<div style="font-size:0.68rem;color:var(--muted);text-align:center;">WA hace ${tA(lastSent.timestamp)}</div>` : ''}
            <div class="tc-stats">
                <div><div class="tc-stat-value">${tasks.length}</div><div class="tc-stat-label">Total</div></div>
                <div><div class="tc-stat-value">${active}</div><div class="tc-stat-label">Activas</div></div>
                <div><div class="tc-stat-value">${done}</div><div class="tc-stat-label">Hechas</div></div>
            </div>
            <div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border);">
                <div style="display:flex;justify-content:space-between;font-size:0.72rem;">
                    <span style="font-weight:700;">Carga</span>
                    <span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:${col};">${mWL(m.id)}/${m.capacity || 20}</span>
                </div>
                <div class="workload-bar"><div class="workload-fill ${c}" style="width:${Math.min(p, 100)}%"></div></div>
                ${p >= 100 ? '<div style="text-align:center;font-size:0.68rem;color:var(--danger);font-weight:700;">⚠️ SOBRECARGADO</div>' : ''}
            </div>
            <div style="margin-top:6px;display:flex;gap:4px;justify-content:center;">
                <button class="btn btn-sm btn-secondary" onclick="openMemberModal('${m.id}')">✏️</button>
                ${m.phone ? `<button class="btn btn-sm btn-wa" onclick="window.open('https://wa.me/${esc(m.phone)}','_blank')">📱</button>` : ''}
                <button class="btn btn-sm btn-danger" onclick="delMem('${m.id}')">🗑️</button>
            </div>
        </div>`;
    }).join('') || `<div class="empty-state" style="grid-column:1/-1;">
        <div class="es-icon">👥</div>
        <div class="es-title">Sin miembros</div>
        <div class="es-desc">Agrega los técnicos del laboratorio para asignar tareas</div>
        <button class="btn btn-primary btn-sm" onclick="openMemberModal()">＋ Nuevo miembro</button>
    </div>`;
}

function openMemberModal(id) {
    clrMem(); rndrMG([]);
    if (id) {
        const m = db.members.find(x => x.id === id);
        if (!m) return;
        document.getElementById('eMemId').value  = m.id;
        document.getElementById('mName').value   = m.name;
        document.getElementById('mRole').value   = m.role  || '';
        document.getElementById('mDept').value   = m.dept  || '';
        document.getElementById('mEmail').value  = m.email || '';
        document.getElementById('mPhone').value  = m.phone || '';
        document.getElementById('mCap').value    = m.capacity || 20;
        document.getElementById('memMT').textContent = 'Editar';
        rndrMG(m.groups || []);
    }
    openModal('memberModal');
}

function rndrMG(sel) {
    document.getElementById('mGroups').innerHTML = db.groups.map(g => `
        <label style="display:flex;align-items:center;gap:3px;padding:3px 8px;border-radius:7px;
                      border:1.5px solid ${sel.includes(g.id) ? g.color : 'var(--border)'};
                      background:${sel.includes(g.id) ? g.color + '15' : 'transparent'};
                      cursor:pointer;font-size:0.8rem;text-transform:none;margin:2px;">
            <input type="checkbox" value="${g.id}" ${sel.includes(g.id) ? 'checked' : ''}
                   style="accent-color:${g.color};min-height:auto;">
            ${esc(g.name)}
        </label>`).join('') || '<span style="font-size:0.8rem;color:var(--muted);">Sin grupos</span>';
}

function saveMem() {
    const id = document.getElementById('eMemId').value;
    const nm = document.getElementById('mName').value.trim();
    if (!nm) { toast('Nombre!', 'error'); return; }
    const groups = [...document.querySelectorAll('#mGroups input:checked')].map(i => i.value);
    const d = {
        name:     nm,
        role:     document.getElementById('mRole').value.trim(),
        dept:     document.getElementById('mDept').value.trim(),
        email:    document.getElementById('mEmail').value.trim(),
        phone:    document.getElementById('mPhone').value.trim(),
        capacity: parseInt(document.getElementById('mCap').value) || 20,
        groups
    };
    if (id) {
        Object.assign(db.members.find(m => m.id === id), d);
        toast('OK');
    } else {
        d.id      = gid();
        d.color   = COLORS[db.members.length % COLORS.length];
        d.created = new Date().toISOString();
        db.members.push(d);
        lg(`👤 ${nm}`);
        toast('+');
    }
    saveDB();
    closeModal('memberModal');
    refreshAll();
}

function delMem(id) {
    const m = db.members.find(x => x.id === id);
    if (!m || !confirm(`¿"${m.name}"?`)) return;
    db.members = db.members.filter(x => x.id !== id);
    saveDB();
    refreshAll();
}

function clrMem() {
    ['eMemId','mName','mRole','mDept','mEmail','mPhone'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('mCap').value = '20';
    document.getElementById('memMT').textContent = 'Agregar Miembro';
}

// --- GRUPOS ---

function openGroupModal() { renderGrps(); openModal('groupModal'); }

function renderGrps() {
    document.getElementById('grpList').innerHTML = db.groups.map(g => {
        const c = db.members.filter(m => m.groups && m.groups.includes(g.id)).length;
        return `<div style="display:flex;align-items:center;gap:6px;padding:7px;background:var(--surface-alt);border-radius:8px;margin-bottom:4px;border-left:4px solid ${g.color};">
            <span style="flex:1;font-weight:700;">${esc(g.name)}</span>
            <span style="font-size:0.75rem;color:var(--muted);">${c}</span>
            <button class="btn btn-sm btn-danger" onclick="delGrp('${g.id}')" style="padding:2px 6px;">✕</button>
        </div>`;
    }).join('') || '<p style="color:var(--muted);">Sin grupos</p>';
}

function addGrp() {
    const n = document.getElementById('newGrp').value.trim();
    if (!n) return;
    db.groups.push({ id: gid(), name: n, color: document.getElementById('grpCol').value });
    saveDB();
    document.getElementById('newGrp').value = '';
    renderGrps();
    refreshAll();
    toast('Grupo creado');
}

function delGrp(id) {
    db.groups = db.groups.filter(x => x.id !== id);
    db.members.forEach(m => { if (m.groups) m.groups = m.groups.filter(x => x !== id); });
    saveDB();
    renderGrps();
    refreshAll();
}
