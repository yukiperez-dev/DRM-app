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
  - **People**: Juanfe (blue) and Yukita (terracotta)
  - **Summary tab**: Shows who owes whom, breakdown by category and by person
- **Planned features**: Chores, Shopping list

### Key files
- `artifacts/home-app/context/ExpensesContext.tsx` — all expense logic, storage, conversion
- `artifacts/home-app/app/(tabs)/index.tsx` — expense list screen
- `artifacts/home-app/app/(tabs)/summary.tsx` — balance & category summary
- `artifacts/home-app/app/add-expense.tsx` — add expense modal
- `artifacts/home-app/components/ExpenseCard.tsx` — expense row component
- `artifacts/home-app/constants/colors.ts` — terracotta/cream palette
