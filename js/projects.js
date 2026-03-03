// ============================================================
// PROJECTS.JS — Gestión de proyectos y plantillas
// ============================================================

const renderProjectsD = debounce(renderProjects, 200);

// --- RENDER ---

function renderProjects() {
    const s = (document.getElementById('projectSearch')?.value || '').toLowerCase();
    let P = [...db.projects];
    if (s) P = P.filter(p => p.name.toLowerCase().includes(s));

    document.getElementById('projectGrid').innerHTML = P.length
        ? P.map(p => {
            const pt = db.tasks.filter(t => t.project === p.id);
            const pd = pt.filter(t => t.status === 'done').length;
            const pp = pt.length ? Math.round(pd / pt.length * 100) : 0;
            const stCls = p.status === 'active' ? 'progress' : p.status === 'done' ? 'done' : 'pending';
            const stLbl = p.status === 'active' ? 'Activo'   : p.status === 'done' ? '✅'   : '⏸';
            return `<div class="project-card" style="border-left-color:${p.color || 'var(--info)'};" onclick="showProjDet('${p.id}')">
                <div style="display:flex;justify-content:space-between;">
                    <div class="pc-title">${esc(p.name)}</div>
                    <span class="status status-${stCls}">${stLbl}</span>
                </div>
                <div class="pc-desc">${esc(p.desc || '')}</div>
                <div class="pc-stats"><span><strong>${pd}</strong>/${pt.length}</span></div>
                <div class="project-progress">
                    <div class="project-progress-fill" style="width:${pp}%;background:${p.color || 'var(--info)'}"></div>
                </div>
                <div style="text-align:center;font-size:0.72rem;font-weight:800;margin-top:2px;">${pp}%</div>
            </div>`;
        }).join('')
        : '<p style="color:var(--muted);text-align:center;grid-column:1/-1;">Sin proyectos</p>';
}

// --- MODAL PROYECTO ---

function openProjectModal(id) {
    clrProj();
    if (id) {
        const p = db.projects.find(x => x.id === id);
        if (!p) return;
        document.getElementById('eProjId').value    = p.id;
        document.getElementById('projName').value   = p.name;
        document.getElementById('projDesc').value   = p.desc || '';
        document.getElementById('projStart').value  = p.start || '';
        document.getElementById('projEnd').value    = p.end || '';
        document.getElementById('projStatus').value = p.status || 'active';
        document.getElementById('projMT').textContent = 'Editar';
        rndrCP(p.color);
    } else {
        rndrCP(null);
    }
    openModal('projectModal');
}

function rndrCP(sel) {
    document.getElementById('projColors').innerHTML = COLORS.map(c => `
        <div onclick="this.parentNode.querySelectorAll('div').forEach(d=>d.classList.remove('sel'));this.classList.add('sel');"
             data-color="${c}" class="cp-swatch${c === sel ? ' sel' : ''}"
             style="width:22px;height:22px;border-radius:7px;background:${c};cursor:pointer;"></div>`).join('');
}

function saveProj() {
    const id = document.getElementById('eProjId').value;
    const nm = document.getElementById('projName').value.trim();
    if (!nm) { toast('Nombre!', 'error'); return; }
    const ce = document.querySelector('#projColors .cp-swatch.sel');
    const d  = {
        name:   nm,
        desc:   document.getElementById('projDesc').value.trim(),
        start:  document.getElementById('projStart').value,
        end:    document.getElementById('projEnd').value,
        status: document.getElementById('projStatus').value,
        color:  ce ? ce.dataset.color : COLORS[db.projects.length % COLORS.length]
    };
    if (id) {
        Object.assign(db.projects.find(p => p.id === id), d);
        lg(`✏️ Proyecto: "${nm}"`);
        toast('OK');
    } else {
        d.id      = gid();
        d.created = new Date().toISOString();
        db.projects.push(d);
        lg(`🎯 "${nm}"`);
        toast('Creado');
    }
    saveDB();
    closeModal('projectModal');
    refreshAll();
}

function clrProj() {
    ['eProjId','projName','projDesc','projStart','projEnd'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('projStatus').value = 'active';
    document.getElementById('projMT').textContent = 'Nuevo Proyecto';
}

// --- DETALLE DE PROYECTO ---

function showProjDet(id) {
    const p = db.projects.find(x => x.id === id);
    if (!p) return;
    const pt = db.tasks.filter(t => t.project === p.id);
    const pd = pt.filter(t => t.status === 'done').length;
    const pp = pt.length ? Math.round(pd / pt.length * 100) : 0;

    document.getElementById('pdT').textContent = p.name;
    document.getElementById('pdB').innerHTML = `
        <span class="status status-${p.status === 'active' ? 'progress' : p.status === 'done' ? 'done' : 'pending'}">
            ${p.status === 'active' ? 'Activo' : p.status === 'done' ? '✅' : '⏸'}
        </span>
        <p style="color:var(--muted);margin:8px 0;">${esc(p.desc || '')}</p>
        <div class="form-grid" style="gap:6px;margin-bottom:12px;">
            <div><label>Inicio</label><div style="font-weight:600;">${p.start ? fD(p.start) : '—'}</div></div>
            <div><label>Límite</label><div style="font-weight:600;">${p.end ? fD(p.end) : '—'}</div></div>
            <div><label>Prog.</label><div style="font-weight:600;">${pp}%</div></div>
        </div>
        <div class="card-title">Tareas</div>
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr><th>Tarea</th><th>Estado</th><th>Score</th><th>Quien</th></tr></thead>
                <tbody>${pt.map(t => {
                    const m = db.members.find(x => x.id === t.assignee);
                    return `<tr>
                        <td>${!depsMet(t) ? '🔒 ' : ''}${esc(t.title)}</td>
                        <td><span class="status status-${t.status}">${sL(t.status)}</span></td>
                        <td><span class="score-pill ${sCC(tS(t))}">${tS(t)}</span></td>
                        <td>${m ? esc(m.name) : '—'}</td>
                    </tr>`;
                }).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--muted);">—</td></tr>'}</tbody>
            </table>
        </div>`;

    document.getElementById('pdF').innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal('projDetModal')">Cerrar</button>
        <button class="btn btn-primary"   onclick="closeModal('projDetModal');openProjectModal('${p.id}')">✏️</button>
        <button class="btn btn-danger"    onclick="delProj('${p.id}')">🗑️</button>`;
    openModal('projDetModal');
}

function delProj(id) {
    const p = db.projects.find(x => x.id === id);
    if (!p || !confirm(`¿"${p.name}"?`)) return;
    db.tasks.forEach(t => { if (t.project === id) t.project = ''; });
    db.projects = db.projects.filter(x => x.id !== id);
    saveDB();
    closeModal('projDetModal');
    lg(`🗑️ "${p.name}"`);
    refreshAll();
}

// --- PLANTILLAS ---

function saveAsTpl() {
    const nm = document.getElementById('projName').value.trim();
    if (!nm) { toast('Nombre!', 'error'); return; }
    const pid   = document.getElementById('eProjId').value;
    const tasks = pid
        ? db.tasks.filter(t => t.project === pid).map(t => ({
            title:      t.title, desc: t.desc, priority: t.priority, urgency: t.urgency,
            complexity: t.complexity, category: t.category, recurrence: t.recurrence,
            subtasks:   t.subtasks ? t.subtasks.map(s => ({ text: s.text, done: false })) : []
          }))
        : [];
    db.templates.push({ id: gid(), name: nm, desc: document.getElementById('projDesc').value.trim(), tasks, created: new Date().toISOString() });
    saveDB();
    toast('📋 Guardada');
    renderSettings();
}

function openTemplateModal() {
    document.getElementById('tplBody').innerHTML = db.templates.length
        ? db.templates.map(t => `
            <div style="padding:10px;border:1.5px solid var(--border);border-radius:10px;margin-bottom:6px;cursor:pointer;"
                 onmouseover="this.style.borderColor='var(--accent)'"
                 onmouseout="this.style.borderColor='var(--border)'"
                 onclick="createFromTpl('${t.id}')">
                <strong>${esc(t.name)}</strong>
                <span style="font-size:0.78rem;color:var(--muted);margin-left:6px;">${t.tasks.length} tareas</span>
            </div>`).join('')
        : '<p style="color:var(--muted);text-align:center;padding:16px;">Sin plantillas</p>';
    openModal('tplModal');
}

function createFromTpl(tid) {
    const tpl  = db.templates.find(t => t.id === tid);
    if (!tpl) return;
    const proj = {
        id:      gid(),
        name:    tpl.name + ' (copia)',
        desc:    tpl.desc,
        start:   '', end: '',
        status:  'active',
        color:   COLORS[db.projects.length % COLORS.length],
        created: new Date().toISOString()
    };
    db.projects.push(proj);
    tpl.tasks.forEach(tt => {
        db.tasks.push({
            id: gid(), title: tt.title, desc: tt.desc || '', project: proj.id,
            status: 'pending', priority: tt.priority || 'medium', urgency: tt.urgency || 2,
            complexity: tt.complexity || 3, category: tt.category || '', recurrence: tt.recurrence || '',
            assignee: '', start: '', due: '', effort: 0,
            deps: [], subtasks: tt.subtasks || [], comments: [],
            created: new Date().toISOString()
        });
    });
    saveDB();
    closeModal('tplModal');
    lg(`📋 "${proj.name}"`);
    refreshAll();
    toast('Creado');
}
