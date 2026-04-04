# UI Improvements — Projetista.Ai

## Framework Choice: Tailwind CSS v4

Tailwind v4 was already installed and partially configured (`tailwindcss@4`, `@tailwindcss/postcss@4`). The previous code used inline styles everywhere, making the design hard to maintain and impossible to refactor globally.

**Why not shadcn/ui or Headless UI?** The screens were already structurally complete. Adding a component library would mean wrapping everything in new components with little benefit. Tailwind CSS component classes defined in `globals.css` provide the same consistency with zero new dependencies.

---

## Color System

All colors are defined as CSS custom properties in `src/app/globals.css` and exposed as Tailwind theme tokens via `@theme inline`.

### Brand
| Token | Value | Use |
|---|---|---|
| `--brand-orange` | `#B95B37` | Primary CTA, active nav, accents |
| `--brand-orange-dark` | `#A04E2E` | Button hover |
| `--brand-orange-bg` | `#FDF0EB` | Soft orange backgrounds |
| `--brand-black` | `#010205` | Sidebar, headings |

### Neutrals
| Token | Value | Use |
|---|---|---|
| `--color-surface` | `#ffffff` | Cards |
| `--color-surface-2` | `#F3F3F3` | Page background |
| `--color-surface-3` | `#FAFAFA` | Subtle backgrounds, note cards |
| `--color-border` | `#e5e7eb` | Input borders, dividers |
| `--color-border-subtle` | `#f3f3f3` | Table row separators |
| `--color-text-primary` | `#010205` | Headings, data |
| `--color-text-secondary` | `#878C91` | Labels, captions |

### Status Colors
Status colors appear as both text and background pairs. Each status uses a consistent pair across badges, kanban cards, and document checklist indicators.

| Status | Color | Background |
|---|---|---|
| Rascunho | `#878C91` | `#F3F3F3` |
| Docs Pendentes | `#d97706` | `#fffbeb` |
| Em Análise | `#2563eb` | `#eff6ff` |
| Formulário Gerado | `#7c3aed` | `#f5f3ff` |
| Enviado | `#B95B37` | `#FDF0EB` |
| Aprovado | `#16a34a` | `#f0fdf4` |

To add a new status: add `--status-X-color` and `--status-X-bg` in `:root`, add a `.badge-X` class in `globals.css`, and add an entry to `STATUS_CFG` in the relevant page.

---

## Shared Component Classes (`globals.css`)

| Class | Purpose |
|---|---|
| `.card` | White rounded card with subtle shadow |
| `.card-hover` | Adds hover shadow lift (combine with `.card`) |
| `.page-title` | Display heading (Manrope 800, 26px) |
| `.page-subtitle` | Muted body text below headings |
| `.section-title` | Heading inside cards (Manrope 700, 15px) |
| `.breadcrumb` | Breadcrumb nav with hover states |
| `.btn-primary` | Orange CTA button |
| `.btn-secondary` | Black secondary button |
| `.badge` | Base pill badge (combine with `.badge-{status}`) |
| `.input-field` | Styled text input with orange focus ring |
| `.avatar` | Round initials avatar in orange |

---

## Navigation Improvements

- **Active state**: Left border accent (`3px solid --brand-orange`) + subtle orange background, replacing the flat background-only indicator. The border gives the eye a clear anchor point for current location.
- **Hover states**: Nav items get a subtle color lift on hover.
- **Typography**: Sidebar subheading (`PLATAFORMA`) reduced to uppercase label style, reducing visual noise.

---

## Dashboard Improvements

- **Stat cards**: Added a colored left-border accent that visually ties each metric to its status color. Added an icon per card for quick scanning.
- **Quick actions row**: Two shortcut buttons (`+ Novo Cliente`, `Consultar Assistente IA`) placed directly below stats to reduce navigation steps for the most common actions.
- **Pipeline header**: Added a total application count. Column count indicators are now colored badges (not just gray numbers).
- **Kanban cards**: Added hover lift (`translateY(-1px)` + shadow) to reinforce clickability.

---

## Key Decisions

1. **CSS variables over Tailwind arbitrary values** — Using `var(--brand-orange)` in inline styles keeps the design system single-sourced. A token change in `:root` propagates everywhere.

2. **Inline styles for dynamic values** — Hover effects that depend on state (dragging, active) stay inline. Static structural styles use component classes.

3. **Status color consistency** — The same color pair is used for badges in the CRM table, kanban column headers, and document checklist — no one-off overrides.

4. **Tabular nums on CPF and dates** — `fontVariantNumeric: 'tabular-nums'` in the CRM table prevents columns from jittering as data changes.

5. **Desktop-first** — Sidebar is fixed at 220px; the main content area has `marginLeft: 220px`. For mobile/tablet support, a collapsible sidebar would need to be added in `app/layout.tsx`.
