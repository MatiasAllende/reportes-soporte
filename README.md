# Métricas de soporte

Dashboard de métricas semanales de un proyecto de Jira Cloud. La clave del proyecto sale de `.env.local`.

Consume **Jira Cloud** bajo demanda, guarda cierres semanales en **SQLite local** y deja administrar técnicos por CSV.

## Requisitos

- Node.js 20+
- Cuenta de Jira Cloud con API token

## Setup

```bash
npm install
cp .env.example .env.local
```

Completá `.env.local`:

```env
JIRA_BASE_URL=https://TU-EMPRESA.atlassian.net
JIRA_EMAIL=tu-email@empresa.com
JIRA_API_TOKEN=pegar-token-aqui
JIRA_PROJECT_KEY=TU-PROYECTO
JIRA_PROJECT_NAME=Soporte
```

Arranque:

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Rutina semanal

1. En **Admin**, importá el CSV de técnicos (`name,accountId,team,active`). Hay una plantilla en `/technicians.example.csv`.
2. En **Semana**, elegí el período y tocá **Sincronizar semana**.
3. Revisá KPIs, técnicos y tendencias. Exportá CSV si hace falta.

Cada sincronización **sobrescribe** el snapshot de esa semana y deja un historial de sync en la base local (`data/pdse.sqlite`).

## Métricas

| Métrica | Criterio |
| --- | --- |
| Creados | Issues creados en la semana |
| Resueltos | `statusCategory = Done` con `resolved` en la semana |
| Backlog abierto | Creados hasta el fin de semana y no resueltos después de esa fecha |
| Estancados | Abiertos sin actualización hace más de **3 días** |
| Sin asignar | Abiertos sin assignee |
| Reabiertos | Cambio de estado fuera de Done durante la semana (changelog) |

## CSV de técnicos

```csv
name,accountId,team,active
Ana López,557058:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee,N1,true
```

- `accountId` es el ID de Atlassian (lo ves en el perfil del usuario en Jira).
- La importación es **atómica**: si una fila falla, no se guarda ninguna.
- Podés activar/desactivar técnicos desde Admin.

## Scripts

```bash
npm run dev      # desarrollo
npm run build    # build
npm run start    # producción local
npm test         # pruebas unitarias
```

## Seguridad

- No subas `.env.local` ni `data/pdse.sqlite` a Git.
- Si un token se filtró, revocalo en Atlassian y generá uno nuevo.
