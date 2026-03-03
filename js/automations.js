// ============================================================
// AUTOMATIONS.JS — Motor de automatizaciones, notificaciones,
//                  tareas recurrentes y velocidad semanal
// ============================================================

// --- CONFIGURACIÓN DE AUTOMATIZACIONES ---

function loadAutoConfig() {
    if (!db.autoConfig) return;
    document.getElementById('autoUnblock').checked = db.autoConfig.unblock !== false;
    document.getElementById('autoProgress').checked = db.autoConfig.progress !== false;
    document.getElementById('autoNotify').checked   = db.autoConfig.notify  !== false;
}

function saveAutoConfig() {
    db.autoConfig = {
        unblock:  document.getElementById('autoUnblock').checked,
        progress: document.getElementById('autoProgress').checked,
        notify:   document.getElementById('autoNotify').checked
    };
    saveDB();
    toast('⚡ Config guardada');
}

// --- MOTOR DE DESBLOQUEO AUTOMÁTICO ---

function runAutomations(completedTaskId) {
    if (!db.autoConfig.unblock) return;
    const unblockedTasks = [];

    db.tasks.forEach(t => {
        if (t.status === 'done' || !t.deps || !t.deps.includes(completedTaskId)) return;
        if (depsMet(t)) {
            unblockedTasks.push(t);
            if (db.autoConfig.progress && (t.status === 'blocked' || t.status === 'pending')) {
                const old = t.status;
                t.status = 'progress';
                lg(`⚡ Auto: "${t.title}" ${sL(old)}→En Progreso (desbloqueada)`);
                db.notifications.unshift({
                    id: gid(), key: 'auto_' + t.id + '_' + Date.now(),
                    type: 'auto',
                    msg: `⚡ "${t.title}" desbloqueada y movida a En Progreso`,
                    taskId: t.id, time: new Date().toISOString(), read: false
                });
            } else {
                db.notifications.unshift({
                    id: gid(), key: 'ub_' + t.id + '_' + Date.now(),
                    type: 'unblocked',
                    msg: `🔓 "${t.title}" desbloqueada`,
                    taskId: t.id, time: new Date().toISOString(), read: false
                });
            }
        }
    });

    if (unblockedTasks.length) {
        saveDB();
        toast(`⚡ ${unblockedTasks.length} tarea(s) desbloqueada(s)`);
    }
}

// --- REGISTRO SEMANAL DE VELOCIDAD ---

function logWeekly() {
    // Mantener solo las últimas 12 semanas
    if (db.weeklyLog.length > 12) db.weeklyLog = db.weeklyLog.slice(-12);
    saveDB();
}

function getWeekKey(d) {
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const days  = Math.floor((d - jan1) / 864e5);
    const wn    = Math.ceil((days + jan1.getDay() + 1) / 7);
    return d.getFullYear() + '-W' + String(wn).padStart(2, '0');
}

function getVelocityData() {
    const weeks = [];
    const now   = new Date();
    for (let i = 7; i >= 0; i--) {
        const d  = new Date(now);
        d.setDate(d.getDate() - i * 7);
        const wk = getWeekKey(d);
        const wStart = new Date(d); wStart.setDate(wStart.getDate() - wStart.getDay());
        const wEnd   = new Date(wStart); wEnd.setDate(wEnd.getDate() + 6);
        const done   = db.tasks.filter(t =>
            t.completedAt && new Date(t.completedAt) >= wStart && new Date(t.completedAt) <= wEnd
        ).length;
        weeks.push({ week: wk, label: 'S' + (8 - i), done });
    }
    return weeks;
}

/** Genera el HTML del gráfico de velocidad (reutilizable en dashboard y reportes) */
function buildVelocityChart(data) {
    const max = Math.max(...data.map(d => d.done), 1);
    const bars = data.map(d => {
        const h = Math.max((d.done / max) * 100, 4);
        return `<div class="vel-bar" style="height:${h}%;background:${d.done > 0 ? 'var(--info)' : 'var(--border)'}">
            <span class="vel-val">${d.done}</span>
            <span class="vel-lbl">${d.label}</span>
        </div>`;
    }).join('');
    return `<div class="velocity-chart">${bars}</div>`;
}

// --- NOTIFICACIONES ---

function genNotifs() {
    if (!db.autoConfig.notify) return;
    const td = new Date().toISOString().split('T')[0];
    const nn = [];

    // Vencidas
    db.tasks.filter(t => t.due && t.status !== 'done' && t.due < td).forEach(t => {
        const k = 'od_' + t.id + '_' + td;
        if (!db.notifications.find(n => n.key === k))
            nn.push({ id: gid(), key: k, type: 'overdue', msg: `⚠️ "${t.title}" vencida`, taskId: t.id, time: new Date().toISOString(), read: false });
    });
    // Vencen hoy
    db.tasks.filter(t => t.due === td && t.status !== 'done').forEach(t => {
        const k = 'dt_' + t.id + '_' + td;
        if (!db.notifications.find(n => n.key === k))
            nn.push({ id: gid(), key: k, type: 'today', msg: `📅 "${t.title}" vence HOY`, taskId: t.id, time: new Date().toISOString(), read: false });
    });
    // Sobrecarga de miembros
    db.members.forEach(m => {
        if (mWP(m) >= 100) {
            const k = 'ol_' + m.id + '_' + td;
            if (!db.notifications.find(n => n.key === k))
                nn.push({ id: gid(), key: k, type: 'overload', msg: `⚠️ ${esc(m.name)} SOBRECARGADO`, time: new Date().toISOString(), read: false });
        }
    });

    if (nn.length) {
        db.notifications.unshift(...nn);
        if (db.notifications.length > 100) db.notifications = db.notifications.slice(0, 100);
        saveDB();
    }
}

function toggleNotifPanel() {
    document.getElementById('notifPanel').classList.toggle('show');
    renderNotifList();
}

function renderNotifList() {
    const list = db.notifications.slice(0, 20);
    document.getElementById('notifList').innerHTML = list.length
        ? list.map(n => `
            <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifRead('${n.id}')">
                <div>${esc(n.msg)}</div>
                <div style="font-size:0.65rem;color:var(--muted);font-family:'JetBrains Mono',monospace;">${tA(n.time)}</div>
            </div>`).join('')
        : '<div style="padding:16px;text-align:center;color:var(--muted);">Sin alertas</div>';
}

function markNotifRead(id) {
    const n = db.notifications.find(x => x.id === id);
    if (n) { n.read = true; saveDB(); updateBadges(); renderNotifList(); }
}

function clearNotifs() { db.notifications = []; saveDB(); updateBadges(); renderNotifList(); }

// --- TAREAS RECURRENTES ---

function checkRecur() {
    const td = new Date().toISOString().split('T')[0];
    db.tasks.filter(t => t.recurrence && t.status === 'done' && t.completedAt).forEach(t => {
        const k = 'rec_' + t.id + '_' + td;
        if (db.activity.find(a => a.action && a.action.includes(k))) return;
        const nd = calcNext(t.due || t.completedAt.split('T')[0], t.recurrence);
        if (nd <= td) {
            const nt = { ...t, id: gid(), status: 'pending', created: new Date().toISOString(), completedAt: null, due: nd, comments: [] };
            delete nt.completedAt;
            if (nt.subtasks) nt.subtasks = nt.subtasks.map(s => ({ text: s.text, done: false }));
            db.tasks.push(nt);
            lg(`🔄 Recurrente: "${t.title}" [${k}]`);
        }
    });
    saveDB();
}

function calcNext(from, freq) {
    const d = new Date(from);
    if (freq === 'daily')     d.setDate(d.getDate() + 1);
    else if (freq === 'weekly')    d.setDate(d.getDate() + 7);
    else if (freq === 'biweekly')  d.setDate(d.getDate() + 14);
    else if (freq === 'monthly')   d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
}
