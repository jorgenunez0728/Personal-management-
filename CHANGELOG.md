# Changelog

All notable changes to QA Test Planning.

## [4.1.0] - 2025-02-19

### Added
- WhatsApp Smart Parser v2 with three detection levels (quick codes, emojis, natural language)
- Quick Reply format: technicians respond with simple A/B/C codes
- Bulk WhatsApp send to all team members
- Cheat sheet integrated in WhatsApp panel

### Changed
- Mobile CSS fully optimized for 6.7" screens (OnePlus 11)
- Touch targets increased to 44px minimum
- Modals now 98% width on mobile
- Team grid 2-column on mobile

### Fixed
- WhatsApp panel stacks vertically on mobile (was overlapping)

## [4.0.0] - 2025-02-19

### Added
- Draggable dashboard widgets (mouse + touch support)
- Persistent dashboard layout saved to localStorage
- Automation engine: auto-unblock dependencies on task completion
- Auto-move unblocked tasks to "In Progress"
- Team velocity chart (8-week rolling window)
- Project completion predictions based on actual velocity
- Automation configuration panel (on/off toggles)
- Automation activity widget in dashboard

## [3.0.0] - 2025-02-19

### Added
- Subtasks/checklists with progress tracking
- Comment threads per task
- Project templates (save and reuse)
- Recurring tasks (daily, weekly, biweekly, monthly)
- Notification system (overdue, due today, overloaded, unblocked)
- Work groups (assign members to multiple groups)
- WhatsApp message generator with response template
- WhatsApp response parser (emoji detection)
- Phone/WhatsApp field in member profiles

## [2.0.0] - 2025-02-18

### Added
- Projects as task containers with color coding
- Task dependencies with visual blocking
- Gantt Chart with day/week zoom
- 4-level urgency system
- Complexity points (1-8 Fibonacci-style)
- Weighted scoring formula
- Workload analysis per team member

## [1.0.0] - 2025-02-18

### Added
- Initial release
- Kanban board with drag-and-drop
- Task and member CRUD
- Dashboard with statistics
- List view with sorting
- Monthly calendar view
- JSON export/import
- Category management
