// ============================================================
// CALENDAR.JS — Vista de calendario mensual
// ============================================================

let currentMonth = new Date();

function chgMo(d) { currentMonth.setMonth(currentMonth.getMonth() + d); renderCal(); }

function renderCal() {
    const y  = currentMonth.getFullYear();
    const mo = currentMonth.getMonth();
    const title = currentMonth.toLocaleDateString('es-MX', { month:'long', year:'numeric' });
    document.getElementById('calTitle').textContent = title.charAt(0).toUpperCase() + title.slice(1);

    const fd  = new Date(y, mo, 1).getDay();
    const dim = new Date(y, mo + 1, 0).getDate();
    const pd  = new Date(y, mo, 0).getDate();
    const today = new Date();

    const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    let h = days.map(d => `<div class="cal-header">${d}</div>`).join('');

    // Días del mes anterior
    for (let i = fd - 1; i >= 0; i--)
        h += `<div class="cal-day other-month"><div class="day-num">${pd - i}</div></div>`;

    // Colores por estado
    const bgCols  = { pending:'#fef3c7', progress:'#dbeafe', review:'#ede9fe', done:'#d1fae5', blocked:'#fee2e2' };
    const txtCols = { pending:'#92400e', progress:'#1e40af', review:'#5b21b6', done:'#065f46', blocked:'#991b1b' };

    // Días del mes
    for (let d = 1; d <= dim; d++) {
        const ds  = `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isT = d === today.getDate() && mo === today.getMonth() && y === today.getFullYear();
        const dt  = db.tasks.filter(t => t.due === ds);
        h += `<div class="cal-day ${isT ? 'today' : ''}">
            <div class="day-num">${d}</div>
            ${dt.slice(0, 3).map(t => `
                <div class="cal-task" style="background:${bgCols[t.status] || '#e5e7eb'};color:${txtCols[t.status] || '#374151'};">
                    ${esc(t.title)}
                </div>`).join('')}
            ${dt.length > 3 ? `<div style="font-size:0.58rem;color:var(--muted);">+${dt.length - 3}</div>` : ''}
        </div>`;
    }

    // Días del mes siguiente
    const rem = (7 - ((fd + dim) % 7)) % 7;
    for (let i = 1; i <= rem; i++)
        h += `<div class="cal-day other-month"><div class="day-num">${i}</div></div>`;

    document.getElementById('calGrid').innerHTML = h;
}
