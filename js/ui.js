// ============================================================
// UI.JS — Utilidades de interfaz: toast, modal, tabs, reloj,
//         badges, filtros, log de actividad
// ============================================================

// --- NOTIFICACIONES TOAST ---

function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

function toastUndo(msg, undoFn) {
    const el = document.createElement('div');
    el.className = 'toast toast-success';
    el.style.cssText = 'display:flex;align-items:center;gap:8px;';
    el.innerHTML = `<span style="flex:1;">${msg}</span>
        <button style="background:rgba(255,255,255,.25);border:none;border-radius:6px;
                       padding:2px 10px;cursor:pointer;color:#fff;font-weight:700;white-space:nowrap;">
            Deshacer
        </button>`;
    let done = false;
    el.querySelector('button').addEventListener('click', () => {
        if (!done) { done = true; undoFn(); }
        el.remove();
    });
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 5000);
}

// --- MODALES ---

function openModal(id)  { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

// --- LOG DE ACTIVIDAD ---

function lg(action) {
    db.activity.unshift({ action, time: new Date().toISOString() });
    if (db.activity.length > 200) db.activity = db.activity.slice(0, 200);
    saveDB();
}

// --- RELOJ ---

function startClock() {
    const update = () => {
        const n = new Date();
        document.getElementById('clock').textContent =
            n.toLocaleDateString('es-MX', { weekday:'short', day:'numeric', month:'short' })
            + ' ' + n.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });
    };
    update();
    setInterval(update, 60000);
}

// --- TABS ---

function initTabs() {
    document.querySelectorAll('.tab').forEach(t => {
        t.addEventListener('click', () => {
            document.querySelectorAll('.tab,.tab-panel').forEach(e => e.classList.remove('active'));
            t.classList.add('active');
            document.getElementById('panel-' + t.dataset.tab).classList.add('active');
            syncBottomNav(t.dataset.tab);
            refreshAll();
        });
    });
}

// --- RENDER PRINCIPAL ---

function refreshAll() {
    updateBadges();
    popFilters();
    const activeTab = document.querySelector('.tab.active');
    const panel = activeTab ? activeTab.dataset.tab : 'dashboard';
    syncBottomNav(panel);
    const renderMap = {
        dashboard: renderDash,
        projects:  renderProjects,
        tasks:     renderTasks,
        gantt:     renderGantt,
        team:      renderTeam,
        whatsapp:  renderWA,
        calendar:  renderCal,
        reports:   renderReports,
        settings:  renderSettings
    };
    if (renderMap[panel]) renderMap[panel]();
}

// --- BADGES ---

function updateBadges() {
    document.getElementById('tasksBadge').textContent = db.tasks.filter(t => t.status !== 'done').length;
    const nc = db.notifications.filter(n => !n.read).length;
    const el = document.getElementById('notifCount');
    el.textContent = nc;
    el.style.display = nc > 0 ? '' : 'none';
}

// --- FILTROS GLOBALES (selects de proyecto y grupo) ---

function popFilters() {
    const po = '<option value="">Todos</option>' +
        db.projects.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
    ['filterProject','ganttProject'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { const v = el.value; el.innerHTML = po; el.value = v; }
    });

    const go = '<option value="">Grupos</option>' +
        db.groups.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('');
    ['filterGroup','filterTeamGroup'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { const v = el.value; el.innerHTML = go; el.value = v; }
    });
}
