// ============================================================
// APP.JS — Inicialización principal, navegación inferior y
//          atajos de teclado
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initBottomNav();
    loadAutoConfig();
    checkRecur();
    logWeekly();
    genNotifs();
    refreshAll();
    startClock();
    applyDark();
});

// --- NAVEGACIÓN INFERIOR (mobile) ---

function initBottomNav() {
    const nav = document.getElementById('bottomNav');
    if (!nav) return;
    nav.querySelectorAll('.bn-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            // Sincronizar con tabs superiores
            document.querySelectorAll('.tab,.tab-panel').forEach(e => e.classList.remove('active'));
            const t = document.querySelector(`.tab[data-tab="${tab}"]`);
            if (t) t.classList.add('active');
            const p = document.getElementById('panel-' + tab);
            if (p) p.classList.add('active');
            nav.querySelectorAll('.bn-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            refreshAll();
        });
    });
}

function syncBottomNav(tab) {
    const nav = document.getElementById('bottomNav');
    if (!nav) return;
    nav.querySelectorAll('.bn-item').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tab);
    });
    const badge = nav.querySelector('.bn-badge');
    if (badge) {
        const count = db.tasks.filter(t => t.status !== 'done').length;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

// --- ATAJOS DE TECLADO ---

document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'n') { e.preventDefault(); openTaskModal(); }
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
});

// Cerrar panel de notificaciones al hacer clic fuera
document.addEventListener('click', e => {
    const np = document.getElementById('notifPanel');
    if (np.classList.contains('show') && !np.contains(e.target) && !e.target.closest('.notif-btn'))
        np.classList.remove('show');
});
