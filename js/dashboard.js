// ============================================================
// DASHBOARD.JS — Dashboard con widgets arrastrables
// ============================================================

const DEFAULT_WIDGETS = ['stats','projects','urgent','workload','velocity','predictions','activity','automations'];

function getDashLayout()        { return db.dashLayout || [...DEFAULT_WIDGETS]; }
function saveDashLayout(layout) { db.dashLayout = layout; saveDB(); }
function resetDashLayout()      { db.dashLayout = null; saveDB(); renderDash(); toast('🔄 Layout restaurado'); }

// --- RENDER PRINCIPAL ---

function renderDash() {
    const T = db.tasks, P = db.projects;
    const tot = T.length;
    const done = T.filter(t => t.status === 'done').length;
    const od   = T.filter(t => t.due && t.status !== 'done' && new Date(t.due) < new Date()).length;
    const blk  = T.filter(t => !depsMet(t) && t.status !== 'done').length;
    const pct  = tot ? Math.round(done / tot * 100) : 0;

    document.getElementById('dashStats').innerHTML = `
        <div class="stat-card"><div class="stat-value">${tot}</div><div class="stat-label">Total</div></div>
        <div class="stat-card"><div class="stat-value">${pct}%</div><div class="stat-label">Completado</div></div>
        <div class="stat-card"><div class="stat-value">${od}</div><div class="stat-label">Vencidas</div></div>
        <div class="stat-card"><div class="stat-value">${done}</div><div class="stat-label">Hechas</div></div>
        <div class="stat-card"><div class="stat-value">${blk}</div><div class="stat-label">Bloqueadas</div></div>
        <div class="stat-card"><div class="stat-value">${P.filter(p => p.status === 'active').length}</div><div class="stat-label">Proyectos</div></div>`;

    const layout = getDashLayout();
    const grid   = document.getElementById('dashGrid');
    grid.innerHTML = layout.map(wid => renderWidget(wid)).join('');
    initDashDrag();
}

// --- WIDGETS ---

function renderWidget(wid) {
    const titles = {
        projects:    '🎯 Proyectos Activos',
        urgent:      '🔥 Urgentes',
        workload:    '⚖️ Carga de Trabajo',
        velocity:    '📈 Velocidad Semanal',
        predictions: '🔮 Predicciones',
        activity:    '📋 Actividad',
        automations: '⚡ Automatizaciones'
    };
    const bodies = {
        projects:    renderWProjects,
        urgent:      renderWUrgent,
        workload:    renderWWorkload,
        velocity:    renderWVelocity,
        predictions: renderWPredictions,
        activity:    renderWActivity,
        automations: renderWAutomations
    };
    if (!bodies[wid]) return '';
    return `<div class="dash-widget" data-widget="${wid}">
        <div class="widget-header">
            <span class="wh-title">${titles[wid]}</span>
            <span class="drag-handle">⋮⋮</span>
        </div>
        <div class="widget-body">${bodies[wid]()}</div>
    </div>`;
}

function renderWProjects() {
    const ap = db.projects.filter(p => p.status === 'active').slice(0, 5);
    if (!ap.length) return '<p style="color:var(--muted);text-align:center;padding:12px;">Sin proyectos</p>';
    return ap.map(p => {
        const pt = db.tasks.filter(t => t.project === p.id);
        const pd = pt.filter(t => t.status === 'done').length;
        const pp = pt.length ? Math.round(pd / pt.length * 100) : 0;
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);">
            <div style="width:4px;height:32px;border-radius:2px;background:${p.color || 'var(--info)'}"></div>
            <div style="flex:1;">
                <div style="font-weight:700;font-size:0.88rem;">${esc(p.name)}</div>
                <div style="font-size:0.72rem;color:var(--muted);">${pd}/${pt.length}</div>
            </div>
            <div style="width:60px;">
                <div class="project-progress"><div class="project-progress-fill" style="width:${pp}%;background:${p.color}"></div></div>
                <div style="font-size:0.65rem;text-align:center;font-weight:700;">${pp}%</div>
            </div>
        </div>`;
    }).join('');
}

function renderWUrgent() {
    const urg = db.tasks.filter(t => t.status !== 'done').sort((a, b) => tS(b) - tS(a)).slice(0, 6);
    if (!urg.length) return '<p style="color:var(--muted);text-align:center;padding:12px;">👍 OK</p>';
    return urg.map(t => {
        const m  = db.members.find(x => x.id === t.assignee);
        const sc = tS(t);
        return `<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--border);">
            <span class="score-pill ${sCC(sc)}">${sc}</span>
            <div style="flex:1;">
                <div style="font-weight:700;font-size:0.82rem;">${!depsMet(t) ? '🔒 ' : ''}${esc(t.title)}</div>
                <div style="font-size:0.68rem;color:var(--muted);">${m ? esc(m.name) : '—'}</div>
            </div>
            <span class="urgency-tag ${uC(t.urgency || 2)}">${uI(t.urgency || 2)}</span>
        </div>`;
    }).join('');
}

function renderWWorkload() {
    return db.members.map(m => {
        const p = mWP(m);
        const c = p >= 100 ? 'wl-danger' : p >= 70 ? 'wl-warn' : 'wl-ok';
        const col = p >= 100 ? 'var(--danger)' : p >= 70 ? 'var(--warning)' : 'var(--success)';
        return `<div style="margin-bottom:6px;">
            <div style="display:flex;justify-content:space-between;font-size:0.78rem;">
                <span style="font-weight:700;">${esc(m.name.split(' ')[0])}</span>
                <span style="font-family:'JetBrains Mono',monospace;font-weight:700;color:${col};">${mWL(m.id)}/${m.capacity || 20}</span>
            </div>
            <div class="workload-bar"><div class="workload-fill ${c}" style="width:${Math.min(p, 100)}%"></div></div>
            ${p >= 100 ? '<div style="text-align:center;font-size:0.68rem;color:var(--danger);font-weight:700;">⚠️ SOBRECARGADO</div>' : ''}
        </div>`;
    }).join('');
}

function renderWVelocity() {
    const data = getVelocityData();
    return buildVelocityChart(data) +
        '<div style="text-align:center;font-size:0.75rem;color:var(--muted);margin-top:16px;">Tareas completadas por semana</div>';
}

function renderWPredictions() {
    const vel  = getVelocityData();
    const avg  = vel.reduce((s, w) => s + w.done, 0) / Math.max(vel.length, 1);
    const remaining = db.tasks.filter(t => t.status !== 'done').length;
    const weeksNeeded = avg > 0 ? Math.ceil(remaining / avg) : 0;
    const predictDate = new Date();
    predictDate.setDate(predictDate.getDate() + weeksNeeded * 7);

    const projPreds = db.projects.filter(p => p.status === 'active').map(p => {
        const pt  = db.tasks.filter(t => t.project === p.id);
        const rem = pt.filter(t => t.status !== 'done').length;
        const wk  = avg > 0 ? Math.ceil(rem / avg) : 0;
        const d   = new Date(); d.setDate(d.getDate() + wk * 7);
        return { name: p.name, color: p.color, rem, wk, date: d, end: p.end };
    });

    let html = `<div class="prediction-card" style="margin-bottom:8px;">
        <div class="pred-title">Velocidad Promedio</div>
        <div class="pred-value">${avg.toFixed(1)} tareas/semana</div>
    </div>
    <div class="prediction-card" style="margin-bottom:8px;">
        <div class="pred-title">Todas las tareas</div>
        <div class="pred-value">${remaining} pendientes</div>
        <div class="pred-sub">${avg > 0 ? `~${weeksNeeded} semanas → ${fS(predictDate.toISOString())}` : 'Sin datos de velocidad'}</div>
    </div>`;

    projPreds.forEach(p => {
        const isLate = p.end && p.date > parseDate(p.end);
        html += `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);">
            <div style="width:4px;height:28px;border-radius:2px;background:${p.color}"></div>
            <div style="flex:1;">
                <div style="font-weight:700;font-size:0.82rem;">${esc(p.name)}</div>
                <div style="font-size:0.72rem;color:var(--muted);">${p.rem} pendientes · ~${p.wk} sem</div>
            </div>
            <div style="font-size:0.78rem;font-weight:700;${isLate ? 'color:var(--danger);' : 'color:var(--success);'}">${isLate ? '⚠️ Tarde' : '✅ A tiempo'}</div>
        </div>`;
    });
    return html;
}

function renderWActivity() {
    return db.activity.slice(0, 10).map(a => `
        <div style="padding:4px 0;border-bottom:1px solid var(--border);font-size:0.75rem;">
            ${esc(a.action)}
            <div style="font-size:0.62rem;color:var(--muted);font-family:'JetBrains Mono',monospace;">${tA(a.time)}</div>
        </div>`).join('') || '<p style="color:var(--muted);text-align:center;">—</p>';
}

function renderWAutomations() {
    const recent = db.activity.filter(a => a.action && a.action.includes('⚡')).slice(0, 5);
    const items  = recent.length
        ? recent.map(a => `
            <div class="auto-log-item">
                <div class="auto-icon" style="background:var(--accent-light);">⚡</div>
                <div style="flex:1;">
                    <div style="font-size:0.8rem;">${esc(a.action)}</div>
                    <div style="font-size:0.62rem;color:var(--muted);font-family:'JetBrains Mono',monospace;">${tA(a.time)}</div>
                </div>
            </div>`).join('')
        : '<p style="color:var(--muted);text-align:center;padding:10px;font-size:0.82rem;">Sin automatizaciones recientes.<br>Completa una tarea con dependientes para verlas en acción.</p>';

    return items + `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:0.78rem;color:var(--muted);">
        <strong>Activas:</strong>
        ${db.autoConfig.unblock  ? '✅ Auto-desbloqueo' : '❌ Desbloqueo'} ·
        ${db.autoConfig.progress ? '✅ Auto-progreso'   : '❌ Progreso'} ·
        ${db.autoConfig.notify   ? '✅ Alertas'         : '❌ Alertas'}
    </div>`;
}

// --- DRAG & DROP DE WIDGETS (mouse + touch) ---

function initDashDrag() {
    const grid    = document.getElementById('dashGrid');
    const widgets = grid.querySelectorAll('.dash-widget');
    let dragEl = null, placeholder = null;

    widgets.forEach(w => {
        const handle = w.querySelector('.widget-header');
        handle.addEventListener('mousedown', e => {
            if (e.target.tagName === 'BUTTON') return;
            e.preventDefault();
            startDrag(w, e.clientX, e.clientY);
        });
        handle.addEventListener('touchstart', e => {
            if (e.target.tagName === 'BUTTON') return;
            const t = e.touches[0];
            startDrag(w, t.clientX, t.clientY);
        }, { passive: true });
    });

    function startDrag(el, x, y) {
        dragEl = el;
        dragEl.classList.add('dragging');
        placeholder = document.createElement('div');
        placeholder.className = 'dash-placeholder';
        placeholder.style.height = dragEl.offsetHeight + 'px';
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    }

    function onMove(e)      { doMove(e.clientX, e.clientY); }
    function onTouchMove(e) { e.preventDefault(); const t = e.touches[0]; doMove(t.clientX, t.clientY); }

    function doMove(x, y) {
        if (!dragEl) return;
        const target = getWidgetAt(x, y);
        if (target && target !== dragEl && target !== placeholder) {
            const rect = target.getBoundingClientRect();
            if (y < rect.top + rect.height / 2) target.before(placeholder);
            else target.after(placeholder);
        }
    }

    function onEnd() {
        if (!dragEl) return;
        dragEl.classList.remove('dragging');
        if (placeholder && placeholder.parentNode) placeholder.replaceWith(dragEl);
        if (placeholder && placeholder.parentNode) placeholder.remove();
        const newLayout = [...grid.querySelectorAll('.dash-widget')].map(w => w.dataset.widget).filter(Boolean);
        if (newLayout.length) saveDashLayout(newLayout);
        dragEl = null; placeholder = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onEnd);
    }

    function getWidgetAt(x, y) {
        for (const el of grid.querySelectorAll('.dash-widget:not(.dragging)')) {
            const r = el.getBoundingClientRect();
            if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return el;
        }
        return null;
    }
}
