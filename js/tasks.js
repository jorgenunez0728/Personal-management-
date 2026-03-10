// ============================================================
// TASKS.JS — Gestión de tareas: kanban, lista, CRUD, detalle
// ============================================================

let currentView   = 'kanban';
let currentFilter = 'all';
let tmpDeps = [];
let tmpST   = [];

// --- MULTI-SELECCIÓN ---
let multiSelectMode = false;
let selectedTasks   = new Set();

function toggleMultiSelect() {
    multiSelectMode = !multiSelectMode;
    if (!multiSelectMode) selectedTasks.clear();
    const btn = document.getElementById('btnMultiSel');
    if (btn) btn.classList.toggle('active', multiSelectMode);
    renderTasks();
    renderBulkToolbar();
}

function toggleTaskSelect(id, e) {
    e.stopPropagation();
    if (selectedTasks.has(id)) selectedTasks.delete(id);
    else                       selectedTasks.add(id);
    const chk = document.querySelector(`[data-task-chk="${id}"]`);
    if (chk) chk.checked = selectedTasks.has(id);
    renderBulkToolbar();
}

function clearSelection() {
    selectedTasks.clear();
    multiSelectMode = false;
    const btn = document.getElementById('btnMultiSel');
    if (btn) btn.classList.remove('active');
    renderTasks();
    renderBulkToolbar();
}

function renderBulkToolbar() {
    const tb = document.getElementById('bulkToolbar');
    if (!tb) return;
    const n = selectedTasks.size;
    tb.style.display = (multiSelectMode && n > 0) ? 'flex' : 'none';
    const cnt = document.getElementById('bulkCount');
    if (cnt) cnt.textContent = `${n} seleccionada${n !== 1 ? 's' : ''}`;
}

function openBulkStatusPicker() {
    document.getElementById('bulkBody').innerHTML =
        ['pending','progress','review','done','blocked'].map(s =>
            `<button class="btn btn-secondary" style="width:100%;text-align:left;margin-bottom:4px;"
                     onclick="bulkSetStatus('${s}');closeModal('bulkModal')">${sL(s)}</button>`
        ).join('');
    openModal('bulkModal');
}

function bulkSetStatus(status) {
    selectedTasks.forEach(id => {
        const t = db.tasks.find(x => x.id === id);
        if (!t) return;
        t.status = status;
        if (status === 'done') { t.completedAt = new Date().toISOString(); runAutomations(t.id); }
    });
    saveDB();
    lg(`📋 Lote: ${selectedTasks.size} → ${sL(status)}`);
    toast(`✅ ${selectedTasks.size} tarea${selectedTasks.size !== 1 ? 's' : ''} → ${sL(status)}`);
    clearSelection();
    refreshAll();
}

function openBulkAssignPicker() {
    document.getElementById('bulkBody').innerHTML =
        `<div style="font-size:0.88rem;font-weight:700;margin-bottom:8px;">Reasignar a:</div>` +
        db.members.map(m =>
            `<button class="btn btn-secondary" style="width:100%;text-align:left;margin-bottom:4px;"
                     onclick="bulkAssign('${m.id}')">${esc(m.name)}</button>`
        ).join('');
    openModal('bulkModal');
}

function bulkAssign(memberId) {
    const m = db.members.find(x => x.id === memberId);
    selectedTasks.forEach(id => {
        const t = db.tasks.find(x => x.id === id);
        if (t) t.assignee = memberId;
    });
    saveDB();
    toast(`✅ ${selectedTasks.size} tarea${selectedTasks.size !== 1 ? 's' : ''} → ${m ? esc(m.name) : '?'}`);
    closeModal('bulkModal');
    clearSelection();
    refreshAll();
}

function bulkDelete() {
    const ids   = [...selectedTasks];
    const count = ids.length;
    if (!db.trash) db.trash = [];
    ids.forEach(id => {
        const t = db.tasks.find(x => x.id === id);
        if (!t) return;
        db.tasks.forEach(x => { if (x.deps) x.deps = x.deps.filter(d => d !== id); });
        db.tasks = db.tasks.filter(x => x.id !== id);
        db.trash.unshift({ ...t, deletedAt: new Date().toISOString() });
    });
    const cut = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    db.trash = db.trash.filter(x => x.deletedAt > cut);
    saveDB();
    clearSelection();
    refreshAll();
    toastUndo(`${count} tarea${count !== 1 ? 's' : ''} eliminada${count !== 1 ? 's' : ''}`, () => {
        ids.forEach(id => restoreTask(id));
    });
}

function restoreTask(id) {
    if (!db.trash) return;
    const idx = db.trash.findIndex(x => x.id === id);
    if (idx === -1) return;
    const t = { ...db.trash[idx] };
    delete t.deletedAt;
    db.tasks.push(t);
    db.trash.splice(idx, 1);
    saveDB();
    refreshAll();
    toast('↩️ Restaurada');
}

// Versiones con debounce para el buscador
const renderTasksD = debounce(renderTasks, 200);

// --- VISTAS ---

function setView(v, btn) {
    currentView = v;
    document.querySelectorAll('#panel-tasks .vt-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('kanbanView').style.display = v === 'kanban' ? '' : 'none';
    document.getElementById('listView').style.display   = v === 'list'   ? '' : 'none';
    renderTasks();
}

function filterTasks(f, btn) {
    currentFilter = f;
    document.querySelectorAll('#panel-tasks .filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTasks();
}

// --- FILTRADO ---

function getFT() {
    let T = [...db.tasks];
    const s  = (document.getElementById('taskSearch')?.value  || '').toLowerCase();
    const pf = document.getElementById('filterProject')?.value || '';
    const gf = document.getElementById('filterGroup')?.value   || '';

    const cf = document.getElementById('filterCat')?.value || '';
    if (s)  T = T.filter(t => t.title.toLowerCase().includes(s) || (t.desc || '').toLowerCase().includes(s));
    if (pf) T = T.filter(t => t.project === pf);
    if (gf) {
        const gM = db.members.filter(m => m.groups && m.groups.includes(gf)).map(m => m.id);
        T = T.filter(t => gM.includes(t.assignee));
    }
    if (cf) T = T.filter(t => t.category === cf);
    if (currentFilter === 'blocked') T = T.filter(t => !depsMet(t) && t.status !== 'done');
    if (currentFilter === 'overdue') T = T.filter(t => t.due && t.status !== 'done' && parseDate(t.due) < new Date());
    if (currentFilter === 'urgent')  T = T.filter(t => t.status !== 'done' && (t.urgency || 2) >= 3);
    return T;
}

function renderTasks() { const T = getFT(); renderKB(T); renderTL(T); }

// --- KANBAN ---

function renderKB(tasks) {
    const sts = ['pending','progress','review','done','blocked'];
    const lb  = { pending:'⏳ Pend', progress:'🔄 Prog', review:'👁️ Rev', done:'✅ Hecha', blocked:'🚫 Bloq' };
    const cl  = { pending:'kh-pending', progress:'kh-progress', review:'kh-review', done:'kh-done', blocked:'kh-blocked' };

    document.getElementById('kanbanBoard').innerHTML = sts.map(s => {
        const col = s === 'blocked'
            ? tasks.filter(t => t.status === 'blocked' || (!depsMet(t) && t.status !== 'done'))
            : tasks.filter(t => t.status === s && (s === 'done' || depsMet(t)));
        return `<div class="kanban-column">
            <div class="kanban-header ${cl[s]}">${lb[s]} <span class="count">${col.length}</span></div>
            <div class="kanban-cards" data-status="${s}"
                ondragover="event.preventDefault();this.style.background='var(--accent-light)'"
                ondragleave="this.style.background=''"
                ondrop="dropT(event,'${s}');this.style.background=''">
                ${col.sort((a, b) => tS(b) - tS(a)).map(t => kcCard(t)).join('')}
            </div>
        </div>`;
    }).join('');
}

function kcCard(t) {
    const m    = db.members.find(x => x.id === t.assignee);
    const isOD = t.due && t.status !== 'done' && parseDate(t.due) < new Date();
    const met  = depsMet(t);
    const proj = db.projects.find(p => p.id === t.project);
    const sc   = tS(t);
    const sp   = stPct(t);

    const chkHtml = multiSelectMode
        ? `<input type="checkbox" data-task-chk="${t.id}"
                  ${selectedTasks.has(t.id) ? 'checked' : ''}
                  onclick="toggleTaskSelect('${t.id}',event)"
                  style="position:absolute;top:8px;right:8px;width:16px;height:16px;cursor:pointer;z-index:2;">`
        : '';
    const onclk = multiSelectMode ? `toggleTaskSelect('${t.id}',event)` : `showDet('${t.id}')`;

    return `<div class="kanban-card ${!met ? 'blocked-card' : ''}"
        style="position:relative;"
        draggable="${!multiSelectMode && (met || t.status === 'done')}"
        ondragstart="event.dataTransfer.setData('text/plain','${t.id}')"
        onclick="${onclk}">
        ${chkHtml}
        <div class="kc-priority-bar kc-bar-${t.priority}"></div>
        ${proj ? `<span class="project-tag" style="background:${proj.color}20;color:${proj.color};border:1px solid ${proj.color}40;">${esc(proj.name)}</span>` : ''}
        <div class="kc-title" style="margin-top:${proj ? '3px' : '0'}">${esc(t.title)}</div>
        <div style="display:flex;gap:2px;flex-wrap:wrap;margin:2px 0;">
            <span class="score-pill ${sCC(sc)}">${sc}</span>
            <span class="urgency-tag ${uC(t.urgency || 2)}" style="font-size:0.62rem;">${uI(t.urgency || 2)}</span>
            ${t.recurrence ? '<span class="recur-badge">🔄</span>' : ''}
        </div>
        ${sp >= 0 ? `<div class="subtask-bar"><div class="subtask-fill" style="width:${sp}%"></div></div>
            <div style="font-size:0.62rem;color:var(--muted);">${t.subtasks.filter(s => s.done).length}/${t.subtasks.length}</div>` : ''}
        ${!met ? `<div class="dep-lock">🔒 ${esc(unmetDeps(t).map(d => d.title).join(', '))}</div>` : ''}
        <div class="kc-meta" style="margin-top:3px;">
            <div style="display:flex;align-items:center;gap:3px;">
                ${m ? `<div class="avatar" style="background:${m.color}">${ini(m.name)}</div><span>${esc(m.name.split(' ')[0])}</span>` : '—'}
            </div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:0.65rem;${isOD ? 'color:var(--danger);font-weight:700;' : ''}">${t.due ? fS(t.due) : ''}</div>
        </div>
    </div>`;
}

function dropT(e, ns) {
    e.preventDefault();
    const tid = e.dataTransfer.getData('text/plain');
    const t   = db.tasks.find(x => x.id === tid);
    if (!t) return;
    if (!depsMet(t) && ns !== 'blocked' && ns !== 'pending') { toast('🔒 Deps!', 'error'); return; }
    if (t.status !== ns) {
        const old = t.status;
        t.status = ns;
        if (ns === 'done') { t.completedAt = new Date().toISOString(); checkRecur(); runAutomations(t.id); }
        saveDB();
        lg(`📋 "${t.title}": ${sL(old)}→${sL(ns)}`);
        genNotifs();
        refreshAll();
        toast(`→ ${sL(ns)}`);
    }
}

// --- LISTA ---

function renderTL(tasks) {
    // Rebuild thead to include/exclude checkbox column
    const listThead = document.querySelector('#listView .data-table thead tr');
    if (listThead) {
        const chkTh = multiSelectMode ? '<th style="width:32px;"></th>' : '';
        listThead.innerHTML = `${chkTh}<th>Tarea</th><th>Proy</th><th>Estado</th><th>Urg</th><th>Cx</th><th>Score</th><th>Quien</th><th>Límite</th><th>Sub</th><th></th>`;
    }
    const colspan = multiSelectMode ? 11 : 10;
    document.getElementById('taskListBody').innerHTML = tasks.sort((a, b) => tS(b) - tS(a)).map(t => {
        const m    = db.members.find(x => x.id === t.assignee);
        const proj = db.projects.find(p => p.id === t.project);
        const isOD = t.due && t.status !== 'done' && parseDate(t.due) < new Date();
        const sc   = tS(t);
        const sp   = stPct(t);
        const chkCell = multiSelectMode
            ? `<td><input type="checkbox" data-task-chk="${t.id}" ${selectedTasks.has(t.id) ? 'checked' : ''}
                   onclick="toggleTaskSelect('${t.id}',event)" style="cursor:pointer;"></td>`
            : '';
        return `<tr>
            ${chkCell}
            <td><strong style="cursor:pointer;" onclick="showDet('${t.id}')">${!depsMet(t) ? '🔒 ' : ''}${esc(t.title)}</strong>${t.recurrence ? '<span class="recur-badge" style="margin-left:3px;">🔄</span>' : ''}</td>
            <td>${proj ? `<span class="project-tag" style="background:${proj.color}20;color:${proj.color};border:1px solid ${proj.color}40;">${esc(proj.name)}</span>` : '—'}</td>
            <td><span class="status status-${t.status}">${sL(t.status)}</span></td>
            <td><span class="urgency-tag ${uC(t.urgency || 2)}">${uI(t.urgency || 2)}</span></td>
            <td>${t.complexity || 3}</td>
            <td><span class="score-pill ${sCC(sc)}">${sc}</span></td>
            <td>${m ? esc(m.name.split(' ')[0]) : '—'}</td>
            <td style="${isOD ? 'color:var(--danger);font-weight:700;' : ''}">${t.due ? fS(t.due) : '—'}</td>
            <td>${sp >= 0 ? sp + '%' : '—'}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();openTaskModal('${t.id}')">✏️</button>
                <button class="btn btn-sm btn-danger"    onclick="event.stopPropagation();delTask('${t.id}')">🗑️</button>
            </td>
        </tr>`;
    }).join('') || `<tr><td colspan="${colspan}" style="text-align:center;color:var(--muted);">—</td></tr>`;
}

// --- MODAL DE TAREA ---

function openTaskModal(id) {
    clrTask(); popTS();
    if (id) {
        const t = db.tasks.find(x => x.id === id);
        if (!t) return;
        document.getElementById('eTaskId').value  = t.id;
        document.getElementById('tTitle').value   = t.title;
        document.getElementById('tDesc').value    = t.desc || '';
        document.getElementById('tStatus').value  = t.status;
        document.getElementById('tPri').value     = t.priority;
        document.getElementById('tUrg').value     = t.urgency || 2;
        document.getElementById('tCx').value      = t.complexity || 3;
        document.getElementById('tStart').value   = t.start || '';
        document.getElementById('tDue').value     = t.due || '';
        document.getElementById('tEff').value     = t.effort || 0;
        document.getElementById('tRecur').value   = t.recurrence || '';
        document.getElementById('taskMT').textContent = 'Editar';
        tmpDeps = [...(t.deps || [])];
        tmpST   = [...(t.subtasks || []).map(s => ({ ...s }))];
        setTimeout(() => {
            document.getElementById('tProj').value   = t.project  || '';
            document.getElementById('tAssign').value = t.assignee || '';
            document.getElementById('tCat').value    = t.category || '';
            rndrDep(t.id);
            rndrST();
        }, 50);
    } else {
        tmpDeps = []; tmpST = [];
        rndrDep(null); rndrST();
    }
    openModal('taskModal');
}

function popTS() {
    document.getElementById('tAssign').innerHTML = '<option value="">—</option>' +
        db.members.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('');
    document.getElementById('tCat').innerHTML = '<option value="">—</option>' +
        db.categories.map(c => `<option value="${c}">${esc(c)}</option>`).join('');
    document.getElementById('tProj').innerHTML = '<option value="">—</option>' +
        db.projects.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
}

function rndrDep(cid) {
    const av = db.tasks.filter(t => t.id !== cid);
    document.getElementById('depSel').innerHTML = tmpDeps.map(d => {
        const x = db.tasks.find(t => t.id === d);
        if (!x) return '';
        return `<span class="dep-chip">
            <span class="dep-status ${x.status === 'done' ? 'dep-met' : 'dep-unmet'}"></span>
            ${esc(x.title)}
            <span style="cursor:pointer;margin-left:2px;" onclick="rmDep('${d}')">✕</span>
        </span>`;
    }).join('');
    document.getElementById('addDep').innerHTML = '<option value="">+ Dep...</option>' +
        av.filter(t => !tmpDeps.includes(t.id)).map(t => `<option value="${t.id}">${esc(t.title)}</option>`).join('');
}

function addDepFn(d) {
    if (!d || tmpDeps.includes(d)) return;
    tmpDeps.push(d);
    rndrDep(document.getElementById('eTaskId').value || null);
}

function rmDep(d) {
    tmpDeps = tmpDeps.filter(x => x !== d);
    rndrDep(document.getElementById('eTaskId').value || null);
}

function rndrST() {
    document.getElementById('stEdit').innerHTML = tmpST.map((s, i) => `
        <div class="subtask-item">
            <input type="checkbox" ${s.done ? 'checked' : ''} onchange="tmpST[${i}].done=this.checked;rndrST()" style="min-height:auto;">
            <span class="st-text ${s.done ? 'done' : ''}">${esc(s.text)}</span>
            <button class="btn btn-sm btn-danger" onclick="tmpST.splice(${i},1);rndrST()" style="padding:1px 5px;min-height:auto;">✕</button>
        </div>`).join('');
}

function addST() {
    const i = document.getElementById('newST');
    const v = i.value.trim();
    if (!v) return;
    tmpST.push({ text: v, done: false });
    i.value = '';
    rndrST();
}

function saveTask() {
    const id    = document.getElementById('eTaskId').value;
    const title = document.getElementById('tTitle').value.trim();
    if (!title) { toast('Título!', 'error'); return; }

    const d = {
        title,
        desc:       document.getElementById('tDesc').value.trim(),
        project:    document.getElementById('tProj').value,
        status:     document.getElementById('tStatus').value,
        priority:   document.getElementById('tPri').value,
        urgency:    parseInt(document.getElementById('tUrg').value) || 2,
        complexity: Math.min(8, Math.max(1, parseInt(document.getElementById('tCx').value) || 3)),
        assignee:   document.getElementById('tAssign').value,
        category:   document.getElementById('tCat').value,
        start:      document.getElementById('tStart').value,
        due:        document.getElementById('tDue').value,
        effort:     parseFloat(document.getElementById('tEff').value) || 0,
        recurrence: document.getElementById('tRecur').value,
        deps:       [...tmpDeps],
        subtasks:   [...tmpST]
    };

    if (id) {
        const t = db.tasks.find(x => x.id === id);
        if (!t.comments) t.comments = [];
        const wasDone = t.status === 'done';
        Object.assign(t, d);
        t.updated = new Date().toISOString();
        if (d.status === 'done' && !wasDone) {
            t.completedAt = new Date().toISOString();
            checkRecur();
            runAutomations(t.id);
        }
        lgT(`✏️ Editada`, t.id);
        toast('OK');
    } else {
        d.id       = gid();
        d.created  = new Date().toISOString();
        d.comments = [];
        db.tasks.push(d);
        lgT(`✅ Creada`, d.id);
        toast('Creada');
    }
    saveDB();
    closeModal('taskModal');
    genNotifs();
    refreshAll();
}

function delTask(id) {
    const t = db.tasks.find(x => x.id === id);
    if (!t) return;
    db.tasks.forEach(x => { if (x.deps) x.deps = x.deps.filter(d => d !== id); });
    db.tasks = db.tasks.filter(x => x.id !== id);
    if (!db.trash) db.trash = [];
    db.trash.unshift({ ...t, deletedAt: new Date().toISOString() });
    const cut = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    db.trash = db.trash.filter(x => x.deletedAt > cut);
    saveDB();
    lgT(`🗑️ Eliminada`, t.id);
    refreshAll();
    toastUndo(`"${t.title.substring(0, 30)}" eliminada`, () => restoreTask(id));
}

function clrTask() {
    ['eTaskId','tTitle','tDesc','tStart','tDue'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('tStatus').value = 'pending';
    document.getElementById('tPri').value    = 'medium';
    document.getElementById('tUrg').value    = '2';
    document.getElementById('tCx').value     = '3';
    document.getElementById('tEff').value    = '0';
    document.getElementById('tRecur').value  = '';
    document.getElementById('taskMT').textContent = 'Nueva Tarea';
    tmpDeps = []; tmpST = [];
}

// --- DETALLE DE TAREA ---

function showDet(id) {
    const t = db.tasks.find(x => x.id === id);
    if (!t) return;
    if (!t.comments) t.comments = [];
    if (!t.subtasks) t.subtasks = [];
    const m    = db.members.find(x => x.id === t.assignee);
    const proj = db.projects.find(p => p.id === t.project);
    const isOD = t.due && t.status !== 'done' && new Date(t.due) < new Date();
    const met  = depsMet(t);
    const sc   = tS(t);
    const sp   = stPct(t);

    document.getElementById('detBody').innerHTML = `
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
            <span class="status status-${t.status}">${sL(t.status)}</span>
            <span style="font-size:0.75rem;">${pI(t.priority)} ${pL(t.priority)}</span>
            <span class="urgency-tag ${uC(t.urgency || 2)}">${uL(t.urgency || 2)}</span>
            <span class="score-pill ${sCC(sc)}">Score:${sc}</span>
            ${proj ? `<span class="project-tag" style="background:${proj.color}20;color:${proj.color};border:1px solid ${proj.color}40;">🎯 ${esc(proj.name)}</span>` : ''}
            ${t.recurrence ? `<span class="recur-badge">🔄 ${t.recurrence}</span>` : ''}
        </div>
        <h2 style="font-weight:800;font-size:1.05rem;margin-bottom:4px;">${esc(t.title)}</h2>
        <p style="color:var(--muted);margin-bottom:10px;">${esc(t.desc || '')}</p>
        <div class="form-grid" style="gap:6px;">
            <div><label>Quien</label><div style="font-weight:600;">${m ? esc(m.name) : '—'}</div></div>
            <div><label>Cx</label><div>${Array.from({length:8},(_,i)=>`<span class="cdot ${i<(t.complexity||3)?'filled':''}"></span>`).join('')} <strong>${t.complexity || 3}/8</strong></div></div>
            <div><label>Límite</label><div style="font-weight:600;${isOD?'color:var(--danger);':''}">${t.due ? fD(t.due) + (isOD ? ' ⚠️' : '') : '—'}</div></div>
            <div><label>Hrs</label><div style="font-weight:600;">${t.effort ? t.effort + 'h' : '—'}</div></div>
        </div>
        ${t.deps && t.deps.length ? `<div style="margin-top:10px;"><label>🔗 Deps</label><div style="margin-top:2px;">${
            t.deps.map(d => { const x = db.tasks.find(z => z.id === d); if (!x) return ''; return `<span class="dep-chip"><span class="dep-status ${x.status==='done'?'dep-met':'dep-unmet'}"></span>${esc(x.title)}</span>`; }).join('')
        }</div>${!met ? '<div style="margin-top:4px;padding:6px;background:#fef2f2;border-radius:8px;font-size:0.78rem;color:var(--danger);font-weight:600;">🔒 Pendientes</div>' : ''}</div>` : ''}
        <div style="margin-top:12px;">
            <label>📝 Subtareas ${sp >= 0 ? `(${sp}%)` : '(0)'}</label>
            ${sp >= 0 ? `<div class="subtask-bar" style="margin:4px 0;"><div class="subtask-fill" style="width:${sp}%"></div></div>` : ''}
            <div>${t.subtasks.map((s, i) => `
                <div class="subtask-item">
                    <input type="checkbox" ${s.done ? 'checked' : ''} onchange="togST('${t.id}',${i})" style="min-height:auto;">
                    <span class="st-text ${s.done ? 'done' : ''}">${esc(s.text)}</span>
                </div>`).join('') || '<span style="font-size:0.8rem;color:var(--muted);">—</span>'}
            </div>
        </div>
        <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px;">
            <label>💬 Comentarios (${t.comments.length})</label>
            <div style="margin-top:6px;">${t.comments.map(c => `
                <div class="comment">
                    <div style="display:flex;justify-content:space-between;">
                        <span class="c-author">${esc(c.author)}</span>
                        <span class="c-time">${tA(c.time)}</span>
                    </div>
                    <div class="c-text">${esc(c.text)}</div>
                </div>`).join('') || '<span style="font-size:0.8rem;color:var(--muted);">—</span>'}
            </div>
            <div style="display:flex;gap:5px;margin-top:6px;">
                <input type="text" id="newCom" placeholder="Comentario..." style="flex:1;" onkeydown="if(event.key==='Enter')addCom('${t.id}')">
                <button class="btn btn-sm btn-primary" onclick="addCom('${t.id}')">Enviar</button>
            </div>
        </div>
        <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px;">
            <label>📋 Historial</label>
            <div style="margin-top:6px;">${
                (() => {
                    const hist = db.activity.filter(a => a.taskId === t.id).slice(0, 10);
                    return hist.length
                        ? hist.map(a => `<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid var(--border);font-size:0.78rem;">
                            <span style="color:var(--muted);white-space:nowrap;">${fD(a.time)}</span>
                            <span>${esc(a.action)}</span>
                          </div>`).join('')
                        : '<span style="font-size:0.8rem;color:var(--muted);">Sin historial aún</span>';
                })()
            }</div>
        </div>`;

    document.getElementById('detFoot').innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal('detailModal')">Cerrar</button>
        <button class="btn btn-primary"   onclick="closeModal('detailModal');openTaskModal('${t.id}')">✏️</button>`;
    openModal('detailModal');
}

function togST(tid, idx) {
    const t = db.tasks.find(x => x.id === tid);
    t.subtasks[idx].done = !t.subtasks[idx].done;
    saveDB();
    showDet(tid);
    refreshAll();
}

function addCom(tid) {
    const el = document.getElementById('newCom');
    const tx = el.value.trim();
    if (!tx) return;
    const t = db.tasks.find(x => x.id === tid);
    if (!t.comments) t.comments = [];
    t.comments.push({ author: 'Jorge N.', text: tx, time: new Date().toISOString() });
    saveDB();
    lg(`💬 "${t.title}"`);
    showDet(tid);
}
