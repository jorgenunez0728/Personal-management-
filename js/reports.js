// ============================================================
// REPORTS.JS — Reportes, gráficas y estadísticas
// ============================================================

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

    // Gráfico de velocidad (helper compartido con dashboard)
    const vdata = getVelocityData();
    const avg   = (vdata.reduce((s, w) => s + w.done, 0) / vdata.length).toFixed(1);
    document.getElementById('velocityChart').innerHTML =
        buildVelocityChart(vdata) +
        `<div style="text-align:center;font-size:0.72rem;color:var(--muted);margin-top:14px;">Completadas/semana · Promedio: ${avg}</div>`;
}
