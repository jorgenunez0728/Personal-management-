// ============================================================
// WHATSAPP.JS — Links personalizados form.html + Smart Parser
// ============================================================

// --- GENERACIÓN DE LINKS ---

function generateFormLink(memberId) {
    const m = db.members.find(x => x.id === memberId);
    if (!m) return null;
    const tasks = db.tasks
        .filter(t => t.assignee === memberId && t.status !== 'done')
        .sort((a, b) => tS(b) - tS(a))
        .slice(0, 10);
    if (!tasks.length) return null;

    const payload = {
        n: m.name,
        p: m.phone || '',
        j: (db.config && db.config.phone) || '',
        t: tasks.map((t, i) => ({ i: t.id, x: i + 1, l: t.title, s: t.status, d: t.due || '' }))
    };
    const hash = btoa(encodeURIComponent(JSON.stringify(payload)));
    const base = (db.config && db.config.baseUrl)
        || (window.location.origin + window.location.pathname.replace(/[^/]+$/, ''));
    return `${base}form.html#${hash}`;
}

function buildWAMessage(memberId) {
    const m    = db.members.find(x => x.id === memberId);
    if (!m) return '';
    const link = generateFormLink(memberId);
    if (!link) return '';
    const first = m.name.split(' ')[0];
    return `Hola *${first}*! 👋\n\nToca el link para reportar tus pendientes de QA Test:\n${link}\n\n_(O responde directamente: 1A 2B60 3C motivo)_`;
}

// --- ENVIAR ---

function sendLinkWA(memberId) {
    const m = db.members.find(x => x.id === memberId);
    if (!m || !m.phone) { toast('Sin número', 'error'); return; }
    const msg = buildWAMessage(memberId);
    if (!msg) { toast('Sin tareas pendientes', 'error'); return; }
    window.open(`https://wa.me/${m.phone}?text=${encodeURIComponent(msg)}`, '_blank');
    logSent(memberId);
    lg(`📱 WA→${m.name}`);
    toast('📱');
    setTimeout(renderMemberCards, 200);
}

function copyFormLink(memberId) {
    const link = generateFormLink(memberId);
    if (!link) { toast('Sin tareas pendientes', 'error'); return; }
    if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(() => toast('📋 Link copiado'));
    } else {
        _fbCopy(link);
    }
}

function sendAllLinks() {
    const eligible = db.members.filter(m =>
        m.phone && db.tasks.some(t => t.assignee === m.id && t.status !== 'done')
    );
    if (!eligible.length) { toast('Sin miembros con tareas y teléfono', 'error'); return; }
    startRound(eligible.map(m => m.id));
    eligible.forEach((m, i) => {
        const msg = buildWAMessage(m.id);
        if (!msg) return;
        setTimeout(() => {
            window.open(`https://wa.me/${m.phone}?text=${encodeURIComponent(msg)}`, '_blank');
            logSent(m.id);
        }, i * 1500);
    });
    lg(`📱 WA masivo: ${eligible.length} links`);
    toast(`📱 ${eligible.length} ventanas`);
    setTimeout(renderRoundStatus, eligible.length * 1500 + 300);
}

// --- RENDER DEL PANEL ---

function renderWA() {
    // Dropdown "De"
    document.getElementById('waFrom').innerHTML =
        '<option value="">Selecciona...</option>' +
        db.members.map(m =>
            `<option value="${m.id}">${esc(m.name)}${m.phone ? ' 📱' : ''}</option>`
        ).join('');

    // Aviso si falta el teléfono de Jorge
    const warn = document.getElementById('waPhoneWarn');
    if (warn) warn.style.display = (!db.config || !db.config.phone) ? 'block' : 'none';

    renderMemberCards();
    renderRoundStatus();
}

function renderMemberCards() {
    const container = document.getElementById('waMemberCards');
    if (!container) return;

    if (!db.members.length) {
        container.innerHTML = '<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:20px;">Sin miembros</p>';
        return;
    }

    container.innerHTML = db.members.map(m => {
        const pending  = db.tasks.filter(t => t.assignee === m.id && t.status !== 'done').length;
        const lastSent = (db.waLog || [])
            .filter(l => l.memberId === m.id && l.type === 'sent')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        const lastLbl  = lastSent ? `hace ${tA(lastSent.timestamp)}` : 'nunca';
        const hasPhone = !!m.phone;

        return `<div style="background:var(--surface-alt);border-radius:12px;padding:12px;border:1px solid var(--border);display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:36px;height:36px;border-radius:50%;background:${m.color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.88rem;flex-shrink:0;">${ini(m.name)}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(m.name.split(' ')[0])}</div>
                    <div style="font-size:0.68rem;color:var(--muted);">${pending > 0 ? `${pending} pendiente${pending > 1 ? 's' : ''}` : '✅ Al día'}</div>
                </div>
                ${pending > 0 ? `<span style="background:var(--danger);color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:800;flex-shrink:0;">${pending}</span>` : ''}
            </div>
            <div style="font-size:0.68rem;color:var(--muted);">📱 ${lastLbl}</div>
            ${hasPhone && pending > 0
                ? `<div style="display:flex;gap:6px;">
                    <button class="btn btn-sm btn-secondary" style="flex:1;font-size:0.72rem;" onclick="copyFormLink('${m.id}')">🔗 Copiar</button>
                    <button class="btn btn-sm btn-wa"        style="flex:1;font-size:0.72rem;" onclick="sendLinkWA('${m.id}')">📱 Enviar</button>
                   </div>`
                : !hasPhone
                    ? `<div style="font-size:0.68rem;color:var(--muted);">🚫 Sin teléfono</div>`
                    : ''}
        </div>`;
    }).join('');

    // Actualizar botón Enviar a Todos
    const btn   = document.getElementById('waSendAllBtn');
    const count = db.members.filter(m =>
        m.phone && db.tasks.some(t => t.assignee === m.id && t.status !== 'done')
    ).length;
    if (btn) {
        btn.textContent = count > 0 ? `🚀 Enviar link a todos (${count} personas)` : '🚀 Enviar a todos';
        btn.disabled    = count === 0;
    }
}

// --- ROUND TRACKING ---

function startRound(memberIds) {
    if (!db.waRounds) db.waRounds = [];
    const round = {
        id:        gid(),
        timestamp: new Date().toISOString(),
        members:   memberIds.map(id => ({ id, sent: false, responded: false, respondedAt: null }))
    };
    db.waRounds.unshift(round);
    saveDB();
    return round;
}

function logSent(memberId) {
    if (!db.waLog) db.waLog = [];
    db.waLog.unshift({ id: gid(), memberId, type: 'sent', timestamp: new Date().toISOString() });
    const round = getActiveRound();
    if (round) {
        const entry = round.members.find(x => x.id === memberId);
        if (entry) entry.sent = true;
    }
    saveDB();
}

function logReceived(memberId) {
    if (!db.waLog) db.waLog = [];
    db.waLog.unshift({ id: gid(), memberId, type: 'received', timestamp: new Date().toISOString() });
    const round = getActiveRound();
    if (round) {
        const entry = round.members.find(x => x.id === memberId);
        if (entry) { entry.responded = true; entry.respondedAt = new Date().toISOString(); }
    }
    saveDB();
}

function getActiveRound() {
    if (!db.waRounds || !db.waRounds.length) return null;
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return db.waRounds.find(r => new Date(r.timestamp).getTime() > cutoff) || null;
}

// --- WIDGET RONDA WA (usado también en Dashboard) ---

function renderWRound() {
    const round = getActiveRound();
    if (!round) {
        return `<div style="text-align:center;padding:16px;color:var(--muted);">
            <div style="font-size:2rem;margin-bottom:8px;">📱</div>
            <div style="font-size:0.82rem;">Sin ronda activa.<br>Usa <strong>Enviar a todos</strong> para iniciar una.</div>
        </div>`;
    }
    const total     = round.members.length;
    const responded = round.members.filter(r => r.responded).length;
    const pct       = total ? Math.round(responded / total * 100) : 0;
    const pending   = round.members.filter(r => !r.responded);

    const pills = round.members.map(r => {
        const m    = db.members.find(x => x.id === r.id);
        const name = m ? esc(m.name.split(' ')[0]) : '?';
        const icon = r.responded ? '✅' : r.sent ? '⏳' : '❌';
        return `<span style="font-size:0.72rem;padding:2px 8px;border-radius:20px;background:var(--surface-alt);border:1px solid var(--border);">${icon} ${name}</span>`;
    }).join('');

    return `<div style="margin-bottom:10px;">
        <div style="font-weight:700;font-size:0.88rem;margin-bottom:6px;">${responded}/${total} respondieron (${pct}%)</div>
        <div class="workload-bar"><div class="workload-fill wl-ok" style="width:${pct}%"></div></div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">${pills}</div>
    <div style="font-size:0.65rem;color:var(--muted);">Iniciada ${tA(round.timestamp)}</div>
    ${pending.length
        ? `<button class="btn btn-sm btn-wa" style="margin-top:10px;width:100%;" onclick="remindPending()">
               🔔 Recordar a pendientes (${pending.length})
           </button>`
        : ''}`;
}

function renderRoundStatus() {
    const section = document.getElementById('waRoundSection');
    if (!section) return;
    const round = getActiveRound();
    section.style.display = round ? 'block' : 'none';
    if (round) document.getElementById('waRoundStatus').innerHTML = renderWRound();
}

function remindPending() {
    const round = getActiveRound();
    if (!round) return;
    const pending = round.members.filter(r => !r.responded);
    let count = 0;
    pending.forEach((r, i) => {
        const m = db.members.find(x => x.id === r.id);
        if (!m || !m.phone) return;
        const link = generateFormLink(m.id);
        if (!link) return;
        const msg = `Hola *${m.name.split(' ')[0]}*! 👋 Recordatorio: aún falta tu reporte.\n\n${link}`;
        setTimeout(() => window.open(`https://wa.me/${m.phone}?text=${encodeURIComponent(msg)}`, '_blank'), i * 1500);
        count++;
    });
    toast(`🔔 ${count} recordatorios`);
}

// --- AUTO-DETECT EMISOR ---

function autoDetectSender(text) {
    const det = document.getElementById('waFromDetect');
    if (!text.trim()) {
        if (det) det.style.display = 'none';
        return;
    }
    const lower = text.toLowerCase();
    for (const m of db.members) {
        const words = m.name.toLowerCase().split(' ').filter(w => w.length > 2);
        for (const word of words) {
            if (lower.includes(word)) {
                document.getElementById('waFrom').value = m.id;
                if (det) {
                    det.textContent  = `Detecté: ${m.name.split(' ')[0]} →`;
                    det.style.display = 'inline';
                }
                return;
            }
        }
    }
    if (det) det.style.display = 'none';
}

// --- SMART PARSER ---

function parseWA() {
    const fromId = document.getElementById('waFrom').value;
    if (!fromId) { toast('Selecciona el miembro', 'error'); return; }
    const text = document.getElementById('waResp').value;
    if (!text.trim()) { toast('Pega una respuesta', 'error'); return; }

    const tasks   = db.tasks
        .filter(t => t.assignee === fromId && t.status !== 'done')
        .sort((a, b) => tS(b) - tS(a));
    const results = [];

    text.split('\n').filter(l => l.trim()).forEach(line => {
        const parsed = parseLine(line, tasks);
        if (parsed) results.push(parsed);
    });

    if (!results.length) {
        results.push(...parseNaturalLang(text, tasks));
    }

    if (!results.length) {
        document.getElementById('waResults').innerHTML = `
            <div style="padding:10px;background:#fefce8;border:1px solid #fde047;border-radius:8px;">
                <div style="font-weight:700;color:#92400e;">No detecté actualizaciones</div>
                <div style="font-size:0.78rem;color:#92400e;margin-top:4px;">
                    Formatos aceptados:<br>
                    • <strong>1A</strong> (lista) &nbsp;<strong>2B70</strong> (progreso 70%) &nbsp;<strong>3C motivo</strong> (bloqueada)<br>
                    • Texto libre: "la 1 ya está, la 2 va al 70%"
                </div>
            </div>`;
        return;
    }

    window._pr       = results;
    window._prFromId = fromId;
    renderParseResults(results);
}

function renderParseResults(results) {
    document.getElementById('waResults').innerHTML =
        `<div style="font-weight:700;margin-bottom:8px;font-size:0.88rem;">📋 ${results.length} actualización(es) detectada(s):</div>` +
        results.map((r, i) => `
            <div class="parsed-result">
                <input type="checkbox" checked id="pr-check-${i}" style="min-height:auto;width:16px;height:16px;flex-shrink:0;">
                <span style="font-weight:700;flex:1;font-size:0.82rem;">${esc(r.task.title)}</span>
                <span class="status status-${r.newStatus}">${sL(r.newStatus)}</span>
                ${r.pct !== null ? `<span style="font-family:'JetBrains Mono',monospace;font-weight:700;">${r.pct}%</span>` : ''}
                ${r.reason ? `<span style="font-size:0.72rem;color:var(--muted);max-width:90px;overflow:hidden;text-overflow:ellipsis;" title="${esc(r.reason)}">${esc(r.reason)}</span>` : ''}
            </div>`).join('') +
        `<div style="display:flex;gap:6px;margin-top:8px;">
            <button class="btn btn-success" style="flex:1;" onclick="applyAll()">✅ Aplicar todo</button>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('waResults').innerHTML='';window._pr=[];">✕</button>
         </div>`;
}

function parseLine(line, tasks) {
    // Formato rápido: "1A" "2B70" "2B 70" "3C falta sensor"
    const qm = line.match(/^(\d+)\s*([ABC])\s*(\d*)\s*(.*)/i);
    if (qm) {
        const idx    = parseInt(qm[1]) - 1;
        if (idx < 0 || idx >= tasks.length) return null;
        const code   = qm[2].toUpperCase();
        const pct    = qm[3] ? parseInt(qm[3]) : null;
        const reason = qm[4] ? qm[4].trim() : '';
        if (code === 'A') return { task: tasks[idx], newStatus: 'done',     pct: null, reason: '' };
        if (code === 'B') return { task: tasks[idx], newStatus: 'progress', pct,       reason: '' };
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

    if (line.includes('✅'))      newStatus = 'done';
    else if (line.includes('🚫')) newStatus = 'blocked';
    else if (line.includes('🔄')) newStatus = 'progress';

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

    if (!pct) {
        const pm = line.match(/(\d+)\s*%/);
        if (pm) pct = parseInt(pm[1]);
        if (!pct && /\b(medio|mitad)\b/i.test(line))         pct = 50;
        if (!pct && /\b(casi|por\s+terminar)\b/i.test(line)) pct = 90;
        if (!pct && /\b(empec|inici|poco)\b/i.test(line))    pct = 10;
    }

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

function applyAll() {
    if (!window._pr || !window._pr.length) return;

    // Apply only checked items
    const toApply = window._pr.filter((_, i) => {
        const chk = document.getElementById('pr-check-' + i);
        return !chk || chk.checked;
    });

    toApply.forEach(r => {
        r.task.status = r.newStatus;
        if (r.newStatus === 'done') {
            r.task.completedAt = new Date().toISOString();
            runAutomations(r.task.id);
        }
        if (r.reason) {
            if (!r.task.comments) r.task.comments = [];
            r.task.comments.push({ author: 'WhatsApp', text: '🚫 ' + r.reason, time: new Date().toISOString() });
        }
        lg(`📱 "${r.task.title}"→${sL(r.newStatus)}`);
    });

    if (window._prFromId) logReceived(window._prFromId);

    saveDB();
    window._pr       = [];
    window._prFromId = null;
    document.getElementById('waResults').innerHTML =
        `<p style="color:var(--success);font-weight:700;">✅ ${toApply.length} actualización${toApply.length > 1 ? 'es' : ''} aplicada${toApply.length > 1 ? 's' : ''}</p>`;
    genNotifs();
    refreshAll();
    toast(`✅ ${toApply.length} aplicadas`);
}

function _fbCopy(t) {
    const ta = document.createElement('textarea');
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    toast('📋');
}
