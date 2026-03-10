// ============================================================
// REPORTS.JS — Reportes, gráficas y estadísticas
// ============================================================

function renderBlockers() {
    const blocked = db.tasks.filter(t => t.status !== 'done' && !depsMet(t));
    if (!blocked.length) return '<p style="color:var(--muted);font-size:0.85rem;">Sin bloqueos activos ✅</p>';
    return blocked.map(t => {
        const blockers = unmetDeps(t).map(b => {
            const m = db.members.find(x => x.id === b.assignee);
            return `<span style="display:inline-block;background:var(--surface-alt);border:1px solid var(--border);border-radius:5px;padding:2px 7px;font-size:0.75rem;margin:2px 2px 2px 0;">
                🔒 ${esc(b.title)}${m ? ` <span style="color:var(--muted);">(${esc(m.name.split(' ')[0])})</span>` : ''}
            </span>`;
        }).join('');
        const ta = db.members.find(x => x.id === t.assignee);
        return `<div style="padding:8px 10px;border-left:3px solid var(--danger);margin-bottom:6px;background:var(--surface);border-radius:0 6px 6px 0;">
            <div style="font-weight:600;font-size:0.85rem;">${esc(t.title)}${ta ? `<span style="font-weight:400;color:var(--muted);font-size:0.78rem;margin-left:6px;">${esc(ta.name.split(' ')[0])}</span>` : ''}</div>
            <div style="margin-top:4px;">${blockers}</div>
        </div>`;
    }).join('');
}

function renderWeeklyLoad() {
    const members = db.members.filter(m => !m.inactive);
    if (!members.length) return '<p style="color:var(--muted);font-size:0.85rem;">Sin miembros</p>';
    const now = new Date();
    const weeks = Array.from({ length: 4 }, (_, i) => {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay() + 1 + i * 7);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end, label: `S${i + 1} ${start.getDate()}/${start.getMonth() + 1}` };
    });
    const activeTasks = db.tasks.filter(t => t.status !== 'done' && t.due);
    const rows = members.map(m => {
        const cells = weeks.map(w => {
            const wt = activeTasks.filter(t => {
                if (t.assignee !== m.id) return false;
                const d = parseDate(t.due);
                return d && d >= w.start && d <= w.end;
            });
            const n = wt.length;
            const bg = n >= 4 ? 'var(--danger)' : n >= 2 ? 'var(--warning)' : n > 0 ? 'var(--success)' : 'var(--border)';
            const titles = wt.map(t => esc(t.title)).join('&#10;');
            return `<td style="text-align:center;padding:5px 3px;" title="${titles}">
                <span style="display:inline-block;min-width:26px;padding:2px 6px;border-radius:12px;background:${bg};color:${n > 0 ? '#fff' : 'var(--muted)'};font-size:0.82rem;font-weight:700;">${n}</span>
            </td>`;
        }).join('');
        return `<tr style="border-bottom:1px solid var(--border);">
            <td style="font-weight:600;padding:6px 8px;white-space:nowrap;font-size:0.82rem;">${esc(m.name.split(' ')[0])}</td>
            ${cells}
        </tr>`;
    }).join('');
    return `<div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:var(--surface-alt);">
                <th style="padding:6px 8px;text-align:left;font-size:0.8rem;">Miembro</th>
                ${weeks.map(w => `<th style="padding:6px 8px;font-size:0.8rem;">${w.label}</th>`).join('')}
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <p style="font-size:0.72rem;color:var(--muted);margin-top:6px;">Tareas con vencimiento en esa semana · hover = títulos</p>
    </div>`;
}

function renderReports() {
    const T    = db.tasks;
    const tot  = T.length;
    const done = T.filter(t => t.status === 'done').length;
    const tEff = T.reduce((s, t) => s + (t.effort || 0), 0);
    const tSc  = T.filter(t => t.status !== 'done').reduce((s, t) => s + tS(t), 0);
    const pct  = tot ? Math.round(done / tot * 100) : 0;

    document.getElementById('rptStats').innerHTML = `
        <div class="stat-card"><div class="stat-value">${tot}</div><div class="stat-label">Total</div></div>
        <div class="stat-card"><div class="stat-value">${pct}%</div><div class="stat-label">Completado</div></div>
        <div class="stat-card"><div class="stat-value">${tEff}h</div><div class="stat-label">Hrs Est.</div></div>
        <div class="stat-card"><div class="stat-value">${tSc}</div><div class="stat-label">Score Activo</div></div>
        <div class="stat-card"><div class="stat-value">${T.filter(t => t.due && t.status !== 'done' && new Date(t.due) < new Date()).length}</div><div class="stat-label">Vencidas</div></div>`;

    // Carga ponderada por miembro
    const mxL = Math.max(...db.members.map(m => mWL(m.id)), 1);
    document.getElementById('chWL').innerHTML = db.members.map(m => {
        const l  = mWL(m.id);
        const p  = mWP(m);
        const c  = p >= 100 ? 'var(--danger)' : p >= 70 ? 'var(--warning)' : 'var(--success)';
        return `<div class="bar-row">
            <div class="bar-label">${esc(m.name.split(' ')[0])}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${(l / Math.max(mxL, m.capacity || 20)) * 100}%;background:${c};">${l}/${m.capacity || 20}</div></div>
            <div class="bar-value" style="color:${c};">${p}%</div>
        </div>`;
    }).join('');

    // Por prioridad
    const pris  = ['critical','high','medium','low'];
    const pCols = { critical:'var(--danger)', high:'#f97316', medium:'var(--warning)', low:'var(--success)' };
    const mxP   = Math.max(...pris.map(p => T.filter(t => t.priority === p).length), 1);
    document.getElementById('chPri').innerHTML = pris.map(p => {
        const c = T.filter(t => t.priority === p).length;
        return `<div class="bar-row">
            <div class="bar-label">${pL(p)}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${(c / mxP) * 100}%;background:${pCols[p]};">${c}</div></div>
            <div class="bar-value">${c}</div>
        </div>`;
    }).join('');

    // Por urgencia
    const urgs  = [4, 3, 2, 1];
    const uCols = { 4:'var(--danger)', 3:'#f97316', 2:'var(--warning)', 1:'var(--success)' };
    const mxU   = Math.max(...urgs.map(u => T.filter(t => (t.urgency || 2) === u).length), 1);
    document.getElementById('chUrg').innerHTML = urgs.map(u => {
        const c = T.filter(t => (t.urgency || 2) === u).length;
        return `<div class="bar-row">
            <div class="bar-label">${uL(u)}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${(c / mxU) * 100}%;background:${uCols[u]};">${c}</div></div>
            <div class="bar-value">${c}</div>
        </div>`;
    }).join('');

    // Por proyecto
    document.getElementById('chProj').innerHTML = db.projects.map(p => {
        const pt = db.tasks.filter(t => t.project === p.id);
        const pd = pt.filter(t => t.status === 'done').length;
        const pp = pt.length ? Math.round(pd / pt.length * 100) : 0;
        return `<div class="bar-row">
            <div class="bar-label">${esc(p.name)}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${pp}%;background:${p.color || 'var(--info)'};">${pp}%</div></div>
            <div class="bar-value">${pd}/${pt.length}</div>
        </div>`;
    }).join('') || '<p style="color:var(--muted);text-align:center;">—</p>';

    // Bloqueos activos
    document.getElementById('chBlockers').innerHTML = renderBlockers();

    // Carga semanal del equipo
    document.getElementById('chWeekly').innerHTML = renderWeeklyLoad();

    // Gráfico de velocidad (helper compartido con dashboard)
    const vdata = getVelocityData();
    const avg   = (vdata.reduce((s, w) => s + w.done, 0) / vdata.length).toFixed(1);
    document.getElementById('velocityChart').innerHTML =
        buildVelocityChart(vdata) +
        `<div style="text-align:center;font-size:0.72rem;color:var(--muted);margin-top:14px;">Completadas/semana · Promedio: ${avg}</div>`;
}
