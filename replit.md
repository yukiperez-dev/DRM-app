# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### home-app (Expo Mobile App)
- **Path**: `artifacts/home-app/`
- **Purpose**: Juanfe & Yukita household management app
- **Storage**: AsyncStorage (no backend)
- **Current features**:
  - **Expenses section**: Track shared expenses with categories, who paid, split type
  - **Dual currency**: COP and EUR, always shown side by side (conversion rate: 1 EUR = 4348 COP)
  - **Categories**: Groceries, Rent & Utilities, Dining Out, Transport, Health, Entertainment, Travel, Shopping, Home, Other
  - **People**: Juanfe (orange #E07A2F) and Yukita (blue #3A7EC0)
  - **Date format**: European dd/mm/yyyy everywhere (dd/mm short on cards, full date in detail view)
  - **Summary tab**: Shows who owes whom, breakdown by category and by person, monthly bar chart
  - **Budgets**: Per-category monthly budgets stored in DB; set by tapping any category row in Summary; shows progress bar, remaining/over-budget status badge
  - **Recurring expenses tab**: Define recurring monthly expenses (Rent, WiFi, Phone, Health Insurance pre-seeded). Generate them with one tap per month; skips duplicates automatically. CRUD for custom recurring entries.
- **Planned features**: Chores, Shopping list

### Key files
- `artifacts/home-app/context/ExpensesContext.tsx` — all expense logic, storage, conversion, date helpers (formatDateEU, formatDateEUShort)
- `artifacts/home-app/context/BudgetsContext.tsx` — per-category monthly budget CRUD (backed by API)
- `artifacts/home-app/context/RecurringExpensesContext.tsx` — recurring expense CRUD + generate
- `artifacts/home-app/app/(tabs)/index.tsx` — expense list screen
- `artifacts/home-app/app/(tabs)/recurring.tsx` — recurring expenses list + generate button
- `artifacts/home-app/app/(tabs)/summary.tsx` — balance & category summary
- `artifacts/home-app/app/add-expense.tsx` — add expense modal
- `artifacts/home-app/app/add-recurring.tsx` — add/edit recurring expense modal
- `artifacts/home-app/components/ExpenseCard.tsx` — expense row component
- `artifacts/home-app/constants/colors.ts` — terracotta/cream palette

### Database tables
- `expenses` — all expense entries (has `recurring_expense_id` FK for generated expenses)
- `recurring_expenses` — templates for recurring expenses (seeded with Rent, WiFi, Phone, Health Insurance)

### API routes
- `GET/POST/PUT/DELETE /api/recurring-expenses` — CRUD for recurring templates
- `POST /api/recurring-expenses/generate` — generates expenses for a given `{year, month}`; skips already-generated ones
