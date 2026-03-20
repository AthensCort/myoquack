# MyoQuack EMG Platform (React + TypeScript + Tailwind)

Web app demo para flujo de fisioterapia EMG con medico, pacientes, calibracion, pre-game, placeholder de game y reporte de sesiones.

## Stack
- React 18 + TypeScript
- Vite
- TailwindCSS
- react-router-dom
- react-hook-form + zod
- bcryptjs
- recharts

## Run
```bash
npm install
npm run dev
```

## API Login
- Crear `.env` con `VITE_API_URL=http://localhost:4000`
- El login del front consume `POST /auth/login`
- Si ejecutaste el seed del backend: `DOC001 / 123456`

## Main Workflow
1. Login en `/login`.
2. Redireccion automatica a `/records`.
3. Desde records:
   - seleccionar paciente
   - iniciar nueva sesion (`/calibration`)
   - exportar CSV de pacientes
4. Registrar paciente en `/patients/new`:
   - guarda paciente
   - crea borrador de sesion
   - redirige a `/calibration`
5. Calibracion EMG en `/calibration`:
   - seleccionar musculo
   - iniciar/finalizar calibracion
   - calcula threshold al 70% MVC
   - redirige a `/pre-game`
6. Configuracion pre-game en `/pre-game`:
   - gain, offset, threshold editable, tiempo
   - valida rangos
   - confirma y navega a `/game`
7. `/game` es placeholder:
   - solo muestra resumen
   - boton **Simulate Session End** para generar eventos dummy y enviar a `/results`
8. `/results`:
   - metricas de sesion
   - tabla por contraccion con ordenamiento
   - preview de waveform (Recharts)
   - guardar sesion en memoria
   - descargar JSON y CSV
9. `/reports`:
   - listar sesiones guardadas
   - descargar JSON/CSV nuevamente
   - eliminar sesion con modal de confirmacion

## Data Notes
- El login ya usa el backend.
- El resto del flujo clinico todavia usa `src/services/db.ts` como store local.
- Cambios de pacientes/sesiones se reflejan de inmediato en UI.
- La sesion autenticada se conserva en `localStorage`.

## Project Structure
- `src/models/types.ts`: interfaces tipadas para todas las entidades.
- `src/data/seed.ts`: datos dummy iniciales (doctor + pacientes).
- `src/services/db.ts`: repositorio in-memory con CRUD/simulacion/export.
- `src/context/AuthContext.tsx`: estado de autenticacion + login/logout.
- `src/context/AppStateContext.tsx`: estado global de paciente seleccionado y borrador de sesion.
- `src/pages/*`: paginas del flujo completo.
- `src/components/layout/*`: navbar, sidebar, layouts.
- `src/components/common/*`: card, modal, route guard, toasts.
