# 🧪 QA Test Planning v4.1

**Sistema integral de gestión de tareas y equipos para laboratorios de pruebas QA — single-file, zero-dependency, offline-first.**

Diseñado para líderes de equipo y supervisores en entornos de pruebas automotrices/industriales que necesitan coordinar técnicos, proyectos y flujos de trabajo sin depender de infraestructura IT ni licencias de software.

![HTML5](https://img.shields.io/badge/HTML5-Single_File-E34F26?logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-blue)
![Storage](https://img.shields.io/badge/Storage-localStorage-green)
![Responsive](https://img.shields.io/badge/Mobile-Optimized-purple)

---

## ✨ Demo Rápida

Descarga `QA-Test-Planning-v4.1.html`, ábrelo en tu navegador. Listo. Sin instalación, sin servidor, sin dependencias.

---

## 🎯 ¿Para quién es?

- Líderes de laboratorio / supervisores técnicos
- Gestores de equipos pequeños-medianos (4-20 personas)
- Entornos donde los técnicos usan celular como herramienta principal
- Equipos que coordinan vía WhatsApp
- Organizaciones donde IT no aprueba herramientas externas fácilmente

---

## 🚀 Features

### Gestión de Proyectos y Tareas
- **Kanban Board** con drag-and-drop entre columnas (Pendiente → Progreso → Revisión → Completada)
- **Sistema de prioridad triple**: Prioridad (4 niveles) × Urgencia (4 niveles) × Complejidad (1-8 puntos)
- **Score ponderado automático**: `Score = Urgencia × Complejidad × Peso_Prioridad` para ordenamiento inteligente
- **Dependencias entre tareas** con bloqueo visual y auto-desbloqueo
- **Subtareas/Checklists** con barra de progreso
- **Tareas recurrentes** (diaria, semanal, quincenal, mensual)
- **Comentarios/hilo** por tarea
- **Plantillas de proyecto** reutilizables

### Dashboard Interactivo
- **Widgets arrastrables** — reorganiza el dashboard a tu gusto con drag & drop (mouse y touch)
- **Layout persistente** — tu configuración se guarda automáticamente
- **Velocidad del equipo** — gráfica de tareas completadas por semana
- **Predicciones** — estimación de fecha de completado por proyecto basada en velocidad real
- **Alertas inteligentes** — vencimientos, sobrecarga de personal, tareas desbloqueadas

### Gestión de Personal
- **Subgrupos de trabajo** — organiza personal en múltiples grupos (un miembro puede pertenecer a varios)
- **Perfil completo** — nombre, puesto, departamento, email, WhatsApp, capacidad
- **Análisis de carga** — puntos asignados vs capacidad con alertas de sobrecarga
- **Filtro por grupo** en todas las vistas

### Integración WhatsApp
- **Generador de mensajes** con dos formatos:
  - 🎯 **Respuesta Rápida**: Los técnicos responden con códigos simples (`1A`, `2B70`, `3C motivo`)
  - 📝 **Clásico**: Formato con emojis (✅, 🔄, 🚫)
- **Parser inteligente v2** que interpreta:
  - Formato rápido: `1A 2B70 3C falta sensor`
  - Emojis: `1. ✅  2. 🔄 60%  3. 🚫 bloqueado`
  - Lenguaje natural: `"la 1 ya está, la 2 va como al 70%, la 3 no puedo porque falta el sensor"`
- **Envío masivo** — abre WhatsApp secuencialmente para cada miembro del equipo
- **Aplicar actualizaciones** con un clic directo al tablero

### Motor de Automatizaciones
- Al completar tarea → desbloquea dependientes automáticamente
- Al desbloquear → mueve a "En Progreso" sin intervención manual
- Alertas automáticas de vencimiento y sobrecarga
- Configurable on/off desde ajustes

### Vistas Múltiples
- **Kanban** — tablero visual con columnas de estado
- **Lista** — tabla ordenable con todos los campos
- **Gantt** — línea de tiempo con barras por tarea, agrupadas por proyecto
- **Calendario** — vista mensual con tareas por fecha límite
- **Reportes** — gráficas de carga, prioridad, urgencia, velocidad y progreso por proyecto

---

## 📱 Optimización Móvil

Diseñado para uso real en smartphones (testado en OnePlus 11 / pantallas 6.7"):

- Touch targets de 44px mínimo
- Tabs compactos con scroll horizontal
- Kanban en 2 columnas (tablet) o 1 columna (phone)
- Modales full-width en mobile
- Dashboard en columna única
- WhatsApp con botones grandes para interacción rápida

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────┐
│     QA-Test-Planning-v4.1.html  │  ← Single file (~119KB)
├─────────────────────────────────┤
│  CSS (embedded)                 │  ← Responsive, mobile-first
│  HTML (semantic)                │  ← 9 tabs + 6 modales
│  JavaScript (vanilla)           │  ← 124 funciones, 0 dependencias
├─────────────────────────────────┤
│  localStorage                   │  ← Persistencia automática
│  key: jm_taskboard_v4           │
└─────────────────────────────────┘
```

**Zero dependencies**. Sin frameworks, sin build step, sin npm, sin servidor. Un archivo HTML que abre en cualquier navegador.

---

## 📦 Instalación

```bash
# Opción 1: Descarga directa
# Descarga QA-Test-Planning-v4.1.html y ábrelo en Chrome/Edge/Firefox

# Opción 2: Clona el repo
git clone https://github.com/tu-usuario/qa-test-planning.git
cd qa-test-planning
# Abre index.html en tu navegador
```

---

## 💾 Datos y Respaldo

Los datos se almacenan en `localStorage` del navegador. Esto significa:

- ✅ Funciona 100% offline
- ✅ Los datos persisten entre sesiones
- ⚠️ Los datos son locales al navegador/dispositivo
- ⚠️ Limpiar datos del navegador borra el tablero

**Para respaldar**: ⚙️ Config → 📥 Exportar (genera archivo `.json`)

**Para restaurar**: ⚙️ Config → 📤 Importar (carga archivo `.json`)

**Para migrar entre dispositivos**: Exporta en uno, importa en otro.

---

## 📋 Modelo de Datos

```javascript
{
  tasks: [{
    id, title, desc, project, status, priority,
    urgency,       // 1-4
    complexity,    // 1-8 (Fibonacci-style)
    assignee, category, start, due, effort,
    recurrence,    // daily|weekly|biweekly|monthly
    deps: [],      // task IDs
    subtasks: [{text, done}],
    comments: [{author, text, time}],
    completedAt
  }],
  members: [{
    id, name, role, dept, email, phone,
    color, capacity, groups: []
  }],
  projects: [{ id, name, desc, start, end, status, color }],
  groups: [{ id, name, color }],
  autoConfig: { unblock, progress, notify },
  dashLayout: [],   // widget order (user-customizable)
  weeklyLog: [],    // velocity tracking
  templates: [],    // project templates
  notifications: [] // alert queue
}
```

---

## 🤝 Flujo de Trabajo Típico

```
 Lunes AM                    Durante la semana              Viernes PM
┌──────────┐   WhatsApp    ┌──────────────┐   WhatsApp    ┌──────────┐
│ Planear   │──────────────→│  Técnicos    │──────────────→│ Revisar  │
│ semana    │   📤 Enviar   │  responden   │   📥 Parsear  │ reportes │
│ Asignar   │   pendientes  │  1A 2B70     │   aplicar     │ velocity │
│ tareas    │               │  3C motivo   │   updates     │ predict  │
└──────────┘               └──────────────┘               └──────────┘
```

---

## 🔮 Roadmap

| Versión | Feature | Status |
|---------|---------|--------|
| v4.0 | Dashboard draggable, automatizaciones, velocity | ✅ Done |
| v4.1 | WhatsApp v2, mobile optimization, smart parser | ✅ Done |
| v4.2 | Firebase backend — vista de técnico en celular | 🔜 Planned |
| v4.3 | Claude API — parseo NLP avanzado, resúmenes semanales | 🔜 Planned |
| v5.0 | Multi-user real-time, roles, offline sync | 📋 Backlog |

---

## 🛠️ Desarrollo

### Historial de Versiones

**v4.1** — WhatsApp Smart Parser, Mobile Optimization
- Sistema de respuesta rápida A/B/C para técnicos
- Parser de lenguaje natural (español)
- Envío masivo a todo el equipo
- CSS optimizado para pantallas 6.7" (OnePlus 11)
- Touch targets 44px+, modales full-width mobile

**v4.0** — Automatizaciones e Inteligencia
- Dashboard con widgets arrastrables (touch + mouse)
- Motor de auto-desbloqueo de dependencias
- Gráfica de velocidad del equipo (8 semanas)
- Predicciones de completado por proyecto
- Configuración de automatizaciones on/off

**v3.0** — Colaboración y Profundidad
- Subtareas/checklists con progreso
- Comentarios/hilo por tarea
- Plantillas de proyecto reutilizables
- Tareas recurrentes (diaria a mensual)
- Panel de notificaciones inteligentes
- Subgrupos de trabajo
- WhatsApp integration (generador + parser básico)

**v2.0** — Gestión Avanzada
- Proyectos como contenedores de tareas
- Dependencias con bloqueo visual
- Gantt Chart con zoom día/semana
- Sistema urgencia 4 niveles
- Complejidad 1-8 puntos (Fibonacci)
- Score ponderado automático
- Análisis de carga por miembro

**v1.0** — Base
- Kanban Board con drag-and-drop
- CRUD de tareas y miembros
- Vista lista y dashboard
- Calendario mensual
- Export/Import JSON

### Contribuir

1. Fork el repositorio
2. Crea tu feature branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Add: nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 📄 Licencia

MIT License — úsalo, modifícalo, distribúyelo libremente.

---

## 👤 Autor

**Jorge Nuñez** — QA Test Laboratory, Automotive Industry

Construido desde cero para resolver problemas reales de coordinación de equipos técnicos en entornos industriales donde las herramientas empresariales no llegan.

---

> *"La mejor herramienta es la que tu equipo realmente usa."*
