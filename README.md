# PDSE · Métricas de Soporte (prototipo)

Dashboard interno de demostración para presentar métricas simplificadas del proyecto Jira **PDSE**.

Usa **datos de ejemplo** (`data/demo.json`). No conecta a Jira todavía.

## Correr en localhost

```bash
cd pdse-dashboard
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Qué incluye

- **Semana** — KPIs, gráfico por técnico, señales operativas, tabla
- **Técnicos** — carga, resueltos, tiempo medio de resolución
- **Tendencias** — serie de las últimas semanas
- **Exportar CSV** — descarga del período seleccionado

Sin login. Sin Git remoto. Sin base de datos.

## Fase 2 (cuando quieran datos reales)

1. Revocar cualquier API token que se haya compartido por chat y generar uno nuevo
2. Crear un archivo `.env.local` (no subir a Git):

```env
JIRA_BASE_URL=https://TU-EMPRESA.atlassian.net
JIRA_EMAIL=tu-email@empresa.com
JIRA_API_TOKEN=pegar-token-nuevo-aqui
JIRA_PROJECT_KEY=PDSE
```

3. Reemplazar la lectura de `data/demo.json` por llamadas a la API de Jira

## Editar la demo

Los números y nombres de técnicos se cambian en [`data/demo.json`](data/demo.json).
