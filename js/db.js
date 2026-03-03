// ============================================================
// DB.JS — Constantes, modelo de datos, funciones utilitarias
// ============================================================

const DB_KEY = 'jm_taskboard_v4';
const COLORS = ['#e8364e','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16'];

let db = JSON.parse(localStorage.getItem(DB_KEY)) || {
    tasks: [], members: [], projects: [], groups: [],
    categories: ['General','Emisiones','Mantenimiento','Calidad','Seguridad','Administrativo'],
    templates: [], notes: [], activity: [], notifications: [], weeklyLog: [],
    dashLayout: null,
    autoConfig: { unblock: true, progress: true, notify: true }
};

// Compatibilidad con versiones anteriores: inicializar campos que puedan faltar
['projects','groups','templates','notifications','weeklyLog','notes','activity'].forEach(k => {
    if (!db[k]) db[k] = [];
});
if (!db.autoConfig) db.autoConfig = { unblock: true, progress: true, notify: true };
if (!db.categories) db.categories = ['General','Emisiones','Mantenimiento','Calidad','Seguridad','Administrativo'];

// Datos iniciales si la BD está vacía
if (!db.members.length) {
    db.groups = [
        { id: gid(), name: 'Emisiones Lab', color: '#3b82f6' },
        { id: gid(), name: 'Calidad', color: '#10b981' }
    ];
    const g1 = db.groups[0].id;
    db.members = [
        { id: gid(), name: 'Jorge Nuñez',  role: 'Líder de Laboratorio', dept: 'Emisiones', email: '', phone: '', color: '#e8364e', capacity: 30, groups: [g1], created: new Date().toISOString() },
        { id: gid(), name: 'Técnico 1',    role: 'Técnico', dept: 'Emisiones', email: '', phone: '', color: '#3b82f6', capacity: 20, groups: [g1], created: new Date().toISOString() },
        { id: gid(), name: 'Técnico 2',    role: 'Técnico', dept: 'Emisiones', email: '', phone: '', color: '#10b981', capacity: 20, groups: [g1], created: new Date().toISOString() },
        { id: gid(), name: 'Técnico 3',    role: 'Técnico', dept: 'Emisiones', email: '', phone: '', color: '#f59e0b', capacity: 20, groups: [g1], created: new Date().toISOString() },
        { id: gid(), name: 'Técnico 4',    role: 'Técnico', dept: 'Emisiones', email: '', phone: '', color: '#8b5cf6', capacity: 20, groups: [g1], created: new Date().toISOString() }
    ];
    saveDB();
}

// --- CORE ---

function gid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }

function esc(s) {
    return s ? String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;') : '';
}

function parseDate(s) { return s ? new Date(s + 'T00:00:00') : null; }

function saveDB() { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

/** Retorna una versión con retardo de la función fn */
function debounce(fn, ms) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}

// --- ETIQUETAS ---

function sL(s) { return { pending:'Pendiente', progress:'En Progreso', review:'En Revisión', done:'Completada', blocked:'Bloqueada' }[s] || s; }
function pL(p) { return { critical:'Crítica', high:'Alta', medium:'Media', low:'Baja' }[p] || p; }
function pI(p) { return { critical:'🔴', high:'🟠', medium:'🟡', low:'🟢' }[p] || ''; }
function pW(p) { return { critical:4, high:3, medium:2, low:1 }[p] || 0; }
function uL(u) { return { 4:'🔥 Inmediata', 3:'🟠 Urgente', 2:'🟡 Normal', 1:'🟢 Espera' }[u] || 'Normal'; }
function uC(u) { return { 4:'urg-fire', 3:'urg-hot', 2:'urg-warm', 1:'urg-cool' }[u] || 'urg-warm'; }
function uI(u) { return { 4:'🔥', 3:'🟠', 2:'🟡', 1:'🟢' }[u] || '🟡'; }

// --- FORMATEO ---

function ini(n) {
    if (!n) return '??';
    return n.split(' ').filter(w => w).map(w => w[0] || '').join('').substring(0, 2).toUpperCase() || '?';
}
function fD(d) { return d ? new Date(d).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' }) : ''; }
function fS(d) { return d ? new Date(d).toLocaleDateString('es-MX', { day:'numeric', month:'short' }) : ''; }
function tA(iso) {
    const d = (new Date() - new Date(iso)) / 1000;
    if (d < 60) return 'Ahora';
    if (d < 3600) return `${Math.floor(d / 60)}m`;
    if (d < 86400) return `${Math.floor(d / 3600)}h`;
    return `${Math.floor(d / 86400)}d`;
}
function dBt(a, b) { return Math.round((new Date(b) - new Date(a)) / 864e5); }

// --- SCORING ---

function tS(t) { return (t.urgency || 2) * (t.complexity || 3) * pW(t.priority); }
function sCC(s) { return s >= 24 ? 'score-high' : s >= 12 ? 'score-med' : 'score-low'; }

// --- DEPENDENCIAS ---

function depsMet(t) {
    if (!t.deps || !t.deps.length) return true;
    return t.deps.every(d => { const x = db.tasks.find(z => z.id === d); return x && x.status === 'done'; });
}
function unmetDeps(t) {
    if (!t.deps) return [];
    return t.deps
        .filter(d => { const x = db.tasks.find(z => z.id === d); return !x || x.status !== 'done'; })
        .map(d => db.tasks.find(z => z.id === d))
        .filter(Boolean);
}

// --- CARGA DE TRABAJO ---

function mWL(mid) { return db.tasks.filter(t => t.assignee === mid && t.status !== 'done').reduce((s, t) => s + (t.complexity || 3), 0); }
function mWP(m)   { return Math.min(Math.round((mWL(m.id) / (m.capacity || 20)) * 100), 150); }
function stPct(t) {
    if (!t.subtasks || !t.subtasks.length) return -1;
    return Math.round(t.subtasks.filter(s => s.done).length / t.subtasks.length * 100);
}
