// ============================================================
// WHATSAPP.JS — Generación de mensajes y parser inteligente
// ============================================================

let waFmt = 'quick';

function setWAFmt(f, btn) {
    waFmt = f;
    document.querySelectorAll('#panel-whatsapp .vt-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    genWA();
}

// --- RENDER DEL PANEL ---

function renderWA() {
    document.getElementById('waTarget').innerHTML = '<option value="all">Todos</option>' +
        db.members.map(m => `<option value="${m.id}">${esc(m.name)}${m.phone ? ' 📱' : ''}</option>`).join('');
    document.getElementById('waFrom').innerHTML = '<option value="">...</option>' +
        db.members.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('');
    genWA();
}

// --- GENERACIÓN DE MENSAJE ---

function genWA() {
    const target = document.getElementById('waTarget').value;
    const incP   = document.getElementById('waP').checked;
    const incI   = document.getElementById('waI').checked;
    const incB   = document.getElementById('waB').checked;
    const members = target === 'all' ? db.members : db.members.filter(m => m.id === target);
    let preview = '';

    members.forEach(m => {
        const tasks = db.tasks.filter(t => t.assignee === m.id && t.status !== 'done');
        let filtered = [];
        if (incP) filtered.push(...tasks.filter(t => t.status === 'pending'));
        if (incI) filtered.push(...tasks.filter(t => t.status === 'progress'));
        if (incB) filtered.push(...tasks.filter(t => t.status === 'blocked' || !depsMet(t)));
        filtered = [...new Set(filtered)];
        if (!filtered.length) return;

        const today = new Date().toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long' });

        if (waFmt === 'quick') {
            preview += `*🔧 QA Test · ${today}*\n*${m.name}*\n\n`;
            filtered.forEach((t, i) => {
                const n    = i + 1;
                const proj = db.projects.find(p => p.id === t.project);
                const sp   = stPct(t);
                const icon = sL(t.status) === 'Bloqueada' ? '🚫' : sL(t.status) === 'En Progreso' ? '🔄' : '⏳';
                preview += `${n}. ${icon} ${t.title}`;
                if (proj)  preview += ` [${proj.name}]`;
                if (t.due) preview += ` · ${fS(t.due)}`;
                if (sp >= 0) preview += `\n   📝 ${t.subtasks.filter(s => s.done).length}/${t.subtasks.length}`;
                if (!depsMet(t)) preview += `\n   🔒 ${unmetDeps(t).map(d => d.title).join(', ')}`;
                preview += '\n';
            });
            preview += `\n─────────────────\n`;
            preview += `*Responde FÁCIL:*\nSolo pon el # y la letra:\n\n`;
            preview += `  *A* = ✅ Listo\n  *B* = 🔄 En progreso (+ % opcional)\n  *C* = 🚫 Bloqueado (+ motivo)\n\n`;
            preview += `*Ejemplo:*\n1A\n2B 70\n3C falta sensor\n\nO simplemente escribe normal 👍\n`;
        } else {
            preview += `*🔧 Pendientes — ${today}*\n*Para: ${m.name}*\n\n`;
            filtered.forEach((t, i) => {
                const proj = db.projects.find(p => p.id === t.project);
                const sp   = stPct(t);
                const icon = sL(t.status) === 'Bloqueada' ? '🚫' : sL(t.status) === 'En Progreso' ? '🔄' : '⏳';
                preview += `${i + 1}. ${icon} ${t.title}`;
                if (proj)  preview += ` [${proj.name}]`;
                if (t.due) preview += ` — ${fS(t.due)}`;
                if (sp >= 0) preview += `\n   📝 ${t.subtasks.filter(s => s.done).length}/${t.subtasks.length} subtareas`;
                if (!depsMet(t)) preview += `\n   🔒 Espera: ${unmetDeps(t).map(d => d.title).join(', ')}`;
                preview += '\n';
            });
            preview += `\n*Responde:*\n`;
            filtered.forEach((_, i) => { preview += `${i + 1}. ✅ / 🔄 __% / 🚫 motivo\n`; });
        }
        preview += '\n---\n\n';
    });

    document.getElementById('waPreview').textContent = preview || 'Sin pendientes.';
}

// --- ENVÍO ---

function sendWA() {
    const target = document.getElementById('waTarget').value;
    const member = target !== 'all'
        ? db.members.find(m => m.id === target)
        : db.members.find(m => m.phone);
    if (!member || !member.phone) { toast('Sin número', 'error'); return; }
    window.open(`https://wa.me/${member.phone}?text=${encodeURIComponent(document.getElementById('waPreview').textContent)}`, '_blank');
    lg(`📱 WA→${member.name}`);
}

function sendAllWA() {
    const withPhone = db.members.filter(m => m.phone);
    if (!withPhone.length) { toast('Sin números', 'error'); return; }
    const origTarget = document.getElementById('waTarget').value;
    let count = 0;
    withPhone.forEach((m, i) => {
        document.getElementById('waTarget').value = m.id;
        genWA();
        const text = document.getElementById('waPreview').textContent;
        if (text && !text.includes('Sin pendientes')) {
            setTimeout(() => { window.open(`https://wa.me/${m.phone}?text=${encodeURIComponent(text)}`, '_blank'); }, i * 1500);
            count++;
        }
    });
    document.getElementById('waTarget').value = origTarget;
    genWA();
    lg(`📱 WA masivo: ${count} mensajes`);
    toast(`📱 ${count} ventanas abiertas`);
}

function copyWA() {
    const t = document.getElementById('waPreview').textContent;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(t).then(() => toast('📋'));
    } else {
        fbCopy(t);
    }
}

function fbCopy(t) {
    const ta = document.createElement('textarea');
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    toast('📋');
}

// --- SMART PARSER v2 ---

function parseWA() {
    const fromId = document.getElementById('waFrom').value;
    if (!fromId) { toast('Miembro!', 'error'); return; }
    const text = document.getElementById('waResp').value;
    if (!text.trim()) { toast('Pega respuesta', 'error'); return; }

    const tasks   = db.tasks.filter(t => t.assignee === fromId && t.status !== 'done').sort((a, b) => tS(b) - tS(a));
    const results = [];

    // Parsear línea por línea
    const lines = text.split('\n').filter(l => l.trim());
    lines.forEach(line => { const parsed = parseLine(line, tasks); if (parsed) results.push(parsed); });

    // Si no hubo resultados, intentar lenguaje natural en el texto completo
    if (!results.length) {
        const nlResults = parseNaturalLang(text, tasks);
        results.push(...nlResults);
    }

    if (!results.length) {
        document.getElementById('waResults').innerHTML = `
            <div style="padding:10px;background:#fefce8;border:1px solid #fde047;border-radius:8px;">
                <div style="font-weight:700;color:#92400e;">No detecté actualizaciones</div>
                <div style="font-size:0.78rem;color:#92400e;margin-top:4px;">Formatos aceptados:<br>
                • <strong>1A</strong> (tarea 1 lista) <strong>2B70</strong> (tarea 2, 70%) <strong>3C motivo</strong> (tarea 3 bloqueada)<br>
                • Emojis: ✅ 🔄 🚫<br>
                • Texto: "la 1 ya está, la 2 va al 70%"</div>
            </div>`;
        return;
    }

    renderParseResults(results);
    window._pr = results;
}

function renderParseResults(results) {
    document.getElementById('waResults').innerHTML =
        `<div style="font-weight:700;margin-bottom:6px;">📋 Detecté ${results.length} actualización(es):</div>` +
        results.map((r, i) => `
            <div class="parsed-result">
                <span style="font-weight:700;flex:1;font-size:0.82rem;">${esc(r.task.title)}</span>
                <span class="status status-${r.newStatus}">${sL(r.newStatus)}</span>
                ${r.pct !== null ? `<span style="font-family:'JetBrains Mono',monospace;font-weight:700;">${r.pct}%</span>` : ''}
                ${r.reason ? `<span style="font-size:0.75rem;color:var(--muted);max-width:120px;overflow:hidden;text-overflow:ellipsis;">${esc(r.reason)}</span>` : ''}
                <button class="btn btn-sm btn-success" onclick="applyP(${i})">✓</button>
            </div>`).join('') +
        `<button class="btn btn-primary btn-block" style="margin-top:6px;" onclick="applyAll()">✅ Aplicar Todo (${results.length})</button>`;
}

function parseLine(line, tasks) {
    // Formato rápido: "1A" "2B70" "2B 70" "3C falta sensor"
    const qm = line.match(/^(\d+)\s*([ABC])\s*(\d*)\s*(.*)/i);
    if (qm) {
        const idx  = parseInt(qm[1]) - 1;
        if (idx < 0 || idx >= tasks.length) return null;
        const code   = qm[2].toUpperCase();
        const pct    = qm[3] ? parseInt(qm[3]) : null;
        const reason = qm[4] ? qm[4].trim() : '';
        if (code === 'A') return { task: tasks[idx], newStatus: 'done',    pct: null, reason: '' };
        if (code === 'B') return { task: tasks[idx], newStatus: 'progress', pct,      reason: '' };
        if (code === 'C') return { task: tasks[idx], newStatus: 'blocked',  pct: null, reason };
        return null;
    }

    // Línea numerada con emoji o palabras clave
    const nm = line.match(/^(\d+)[\.\)\-\s]/);
    if (!nm) return null;
    const idx = parseInt(nm[1]) - 1;
    if (idx < 0 || idx >= tasks.length) return null;
    const task = tasks[idx];
    let newStatus = null, pct = null, reason = '';

    // Emojis primero
    if (line.includes('✅'))      newStatus = 'done';
    else if (line.includes('🚫')) newStatus = 'blocked';
    else if (line.includes('🔄')) newStatus = 'progress';

    // Palabras clave
    if (!newStatus) {
        if (/\b(listo|lista|hecho|hecha|terminé|terminad|completad|completo|ya\s+(está|estuvo|quedó|lo hice))\b/i.test(line))
            newStatus = 'done';
        else if (/\b(bloq|no\s+pued|falta|parad|deteni|no\s+hay|sin\s+material|sin\s+equipo|esperando|atorad)\b/i.test(line)) {
            newStatus = 'blocked';
            const rm = line.match(/(?:bloq|falta|no\s+pued|parad|deteni|esperando|atorad)\w*\s*(.*)/i);
            if (rm) reason = rm[1].trim().substring(0, 100);
        } else if (/\b(avance|avancé|progres|va\s+(al|como|en)|medio|mitad|empec|inici)\b/i.test(line) || line.match(/\d+\s*%/))
            newStatus = 'progress';
    }

    // Porcentaje
    if (!pct) {
        const pm = line.match(/(\d+)\s*%/);
        if (pm) pct = parseInt(pm[1]);
        if (!pct && /\b(medio|mitad)\b/i.test(line))        pct = 50;
        if (!pct && /\b(casi|por\s+terminar)\b/i.test(line)) pct = 90;
        if (!pct && /\b(empec|inici|poco)\b/i.test(line))    pct = 10;
    }

    // Motivo del bloqueo
    if (newStatus === 'blocked' && !reason) {
        const rm = line.match(/(?:porque|por|falta|no\s+hay)\s+(.*)/i);
        if (rm) reason = rm[1].trim().substring(0, 100);
    }

    if (newStatus) return { task, newStatus, pct, reason };
    return null;
}

function parseNaturalLang(text, tasks) {
    const results = [];
    const lower   = text.toLowerCase();
    tasks.forEach((t, idx) => {
        const n = idx + 1;
        const patterns = [
            new RegExp(`\\bla\\s+${n}\\b[^\\d]*`, 'i'),
            new RegExp(`\\b${n}[°ª]?\\s*[:\\-]?\\s*`, 'i'),
            new RegExp(`\\btarea\\s+${n}\\b`, 'i'),
        ];
        for (const pat of patterns) {
            const m = lower.match(pat);
            if (!m) continue;
            const chunk = lower.substring(m.index, m.index + 100);
            let newStatus = null, pct = null, reason = '';
            if (/\b(list|hech|termin|completad|ya\s+está|ya\s+quedó)\b/.test(chunk))
                newStatus = 'done';
            else if (/\b(bloq|no\s+pued|falta|parad|deteni|atorad)\b/.test(chunk)) {
                newStatus = 'blocked';
                const rm = chunk.match(/(?:porque|por|falta|no\s+hay)\s+([^,\.]+)/i);
                if (rm) reason = rm[1].trim();
            } else if (/\b(va|avance|progress|medio|empec|inici)\b/.test(chunk) || chunk.match(/\d+\s*%/)) {
                newStatus = 'progress';
                const pm = chunk.match(/(\d+)\s*%/);
                if (pm) pct = parseInt(pm[1]);
                if (!pct && /medio|mitad/.test(chunk)) pct = 50;
            }
            if (newStatus && !results.find(r => r.task.id === t.id)) {
                results.push({ task: t, newStatus, pct, reason });
                break;
            }
        }
    });
    return results;
}

function applyP(i) {
    const r = window._pr[i];
    if (!r) return;
    r.task.status = r.newStatus;
    if (r.newStatus === 'done') { r.task.completedAt = new Date().toISOString(); runAutomations(r.task.id); }
    if (r.reason) {
        if (!r.task.comments) r.task.comments = [];
        r.task.comments.push({ author: 'WhatsApp', text: '🚫 ' + r.reason, time: new Date().toISOString() });
    }
    saveDB();
    lg(`📱 "${r.task.title}"→${sL(r.newStatus)}`);
    window._pr.splice(i, 1);
    if (window._pr.length) renderParseResults(window._pr);
    else document.getElementById('waResults').innerHTML = '<p style="color:var(--success);font-weight:700;">✅ Listo</p>';
    genNotifs();
    refreshAll();
    toast('OK');
}

function applyAll() {
    if (!window._pr || !window._pr.length) return;
    window._pr.forEach(r => {
        r.task.status = r.newStatus;
        if (r.newStatus === 'done') { r.task.completedAt = new Date().toISOString(); runAutomations(r.task.id); }
        if (r.reason) {
            if (!r.task.comments) r.task.comments = [];
            r.task.comments.push({ author: 'WhatsApp', text: '🚫 ' + r.reason, time: new Date().toISOString() });
        }
        lg(`📱 "${r.task.title}"→${sL(r.newStatus)}`);
    });
    saveDB();
    window._pr = [];
    document.getElementById('waResults').innerHTML = '<p style="color:var(--success);font-weight:700;">✅ Todas aplicadas</p>';
    genNotifs();
    refreshAll();
    toast('✅ Todas');
}
