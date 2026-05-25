# Business Automation Platform

```
├── backend/     # NestJS API (PostgreSQL + Prisma)
└── frontend/    # Next.js App Router
```

## Setup

```bash
npm install
npm install --prefix backend
npm install --prefix frontend

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

cd backend && npm run db:migrate && npm run db:seed
```

## Development

Run both API and web together from the project root:

```bash
npm run dev
```

- **Backend** — port `3000` (`backend/.env` → `PORT`, `FRONTEND_URL` for CORS)  
- **Frontend** — port `3001` (`frontend/.env.local` → `BACKEND_URL`, `API_PREFIX`)  

The frontend starts after the backend is listening on port `3000`.

Or run separately:

```bash
npm run dev:backend
npm run dev:frontend
```
