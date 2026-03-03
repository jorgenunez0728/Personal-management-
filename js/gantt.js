// ============================================================
// GANTT.JS — Vista de diagrama de Gantt
// ============================================================

let gFilter = 'all';
let gZoom   = 'day';

function setGF(f, btn) {
    gFilter = f;
    document.querySelectorAll('#panel-gantt .filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGantt();
}

function setGZ(z, btn) {
    gZoom = z;
    document.querySelectorAll('#panel-gantt .vt-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGantt();
}

function renderGantt() {
    let T = db.tasks.filter(t => t.start || t.due);
    const pf = document.getElementById('ganttProject')?.value || '';
    if (pf)              T = T.filter(t => t.project === pf);
    if (gFilter === 'active')   T = T.filter(t => t.status !== 'done');
    if (gFilter === 'critical') T = T.filter(t => t.priority === 'critical' || t.priority === 'high');

    if (!T.length) {
        document.getElementById('ganttChart').innerHTML = '<p style="text-align:center;color:var(--muted);padding:24px;">Sin tareas con fechas</p>';
        return;
    }

    const allD = [];
    T.forEach(t => { if (t.start) allD.push(new Date(t.start)); if (t.due) allD.push(new Date(t.due)); });
    let minD = new Date(Math.min(...allD));
    let maxD = new Date(Math.max(...allD));
    minD.setDate(minD.getDate() - 2);
    maxD.setDate(maxD.getDate() + 3);
    const totalD = dBt(minD.toISOString(), maxD.toISOString()) + 1;
    const today  = new Date(); today.setHours(0, 0, 0, 0);
    const cw     = gZoom === 'day' ? 32 : 16;

    // Agrupar por proyecto
    const grouped = [];
    const wp = T.filter(t => t.project);
    const np = T.filter(t => !t.project);
    [...new Set(wp.map(t => t.project))].forEach(pid => {
        const p = db.projects.find(x => x.id === pid);
        grouped.push({ type: 'p', name: p ? p.name : '?', color: p ? p.color : 'var(--info)' });
        wp.filter(t => t.project === pid).sort((a, b) => new Date(a.start || a.due) - new Date(b.start || b.due))
          .forEach(t => grouped.push({ type: 't', task: t }));
    });
    if (np.length) {
        grouped.push({ type: 'p', name: 'Sin Proyecto', color: 'var(--muted)' });
        np.sort((a, b) => new Date(a.start || a.due) - new Date(b.start || b.due))
          .forEach(t => grouped.push({ type: 't', task: t }));
    }

    // Encabezado de fechas
    let hH = '<th class="gantt-task-name">Tarea</th>';
    const dH = [];
    for (let i = 0; i < totalD; i++) {
        const d  = new Date(minD); d.setDate(d.getDate() + i);
        dH.push(d);
        const iw = d.getDay() === 0 || d.getDay() === 6;
        const it = d.toDateString() === today.toDateString();
        if (gZoom === 'day')
            hH += `<th style="min-width:${cw}px;font-size:0.6rem;${iw ? 'background:#1e293b;' : ''}${it ? 'background:var(--accent);' : ''}">${d.getDate()}</th>`;
        else if (d.getDay() === 1 || i === 0)
            hH += `<th style="min-width:${cw * 7}px;font-size:0.65rem;" colspan="7">${d.getDate()} ${d.toLocaleDateString('es-MX', { month:'short' })}</th>`;
    }

    // Filas
    const sColors = { pending:'#f59e0b', progress:'#3b82f6', review:'#8b5cf6', done:'#10b981', blocked:'#ef4444' };
    let bH = '';
    grouped.forEach(item => {
        if (item.type === 'p') {
            bH += `<tr style="background:var(--surface-alt);">
                <td class="gantt-task-name" style="font-weight:800;color:${item.color};font-size:0.8rem;">🎯 ${esc(item.name)}</td>
                ${'<td class="gantt-cell"></td>'.repeat(totalD)}
            </tr>`;
            return;
        }
        const t   = item.task;
        const sd  = t.start ? new Date(t.start) : new Date(t.due);
        const ed  = t.due   ? new Date(t.due)   : new Date(t.start);
        const si  = dBt(minD.toISOString(), sd.toISOString());
        const dur = Math.max(1, dBt(sd.toISOString(), ed.toISOString()) + 1);
        const m   = db.members.find(x => x.id === t.assignee);
        const met = depsMet(t);

        bH += `<tr>
            <td class="gantt-task-name">
                <div style="display:flex;align-items:center;gap:3px;">${!met ? '🔒' : ''}<span style="font-size:0.78rem;">${esc(t.title)}</span></div>
                <div style="font-size:0.62rem;color:var(--muted);">${m ? esc(m.name.split(' ')[0]) : '—'} ${pI(t.priority)}</div>
            </td>`;
        for (let i = 0; i < totalD; i++) {
            const d  = dH[i];
            const iw = d.getDay() === 0 || d.getDay() === 6;
            const it = d.toDateString() === today.toDateString();
            let cc = '';
            if (i === si)
                cc = `<div class="gantt-bar" style="left:1px;width:${dur * cw - 2}px;background:${sColors[t.status] || '#94a3b8'};${!met ? 'opacity:0.4;border:2px dashed var(--danger);' : ''}" title="${esc(t.title)}">${dur > 2 ? t.title.substring(0, dur * 3) : ''}</div>`;
            bH += `<td class="gantt-cell" style="min-width:${cw}px;${iw ? 'background:#f8fafc;' : ''}${it ? 'background:var(--accent-light);' : ''}">${cc}</td>`;
        }
        bH += '</tr>';
    });

    document.getElementById('ganttChart').innerHTML = `
        <div class="gantt-container">
            <table class="gantt-table">
                <thead><tr>${hH}</tr></thead>
                <tbody>${bH}</tbody>
            </table>
        </div>`;
}
