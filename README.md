# AeroGuard 2.0 frontend

AeroGuard 2.0 is a dashboard-first React + TypeScript + Vite frontend for an ESP32 environmental monitoring system using an MQ-135 gas sensor and a BME280 environmental sensor. This repository contains frontend code only. It does not implement the FastAPI backend, database, ESP32 firmware, hardware communication, or AI service.

## Requirements

Use Node.js 18 or newer and npm. The interface is built with React, TypeScript, Vite, Recharts, and Lucide React icons. Install the project dependencies with:

```bash
npm install
```

Start the development server with:

```bash
npm run dev
```

Build the production frontend with:

```bash
npm run build
```

Run the TypeScript check without producing output with:

```bash
npm run typecheck
```

## Backend configuration

Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to the URL provided separately for the FastAPI service. A common local value is `http://127.0.0.1:8000`. Restart Vite after changing environment variables. This value is browser-safe configuration; do not place API keys or secrets in the frontend environment.

The frontend expects these GET endpoints:

| Endpoint | Purpose |
| --- | --- |
| `/api/health` | Backend availability and health status |
| `/api/latest` | Most recent sensor reading |
| `/api/readings?range=1h\|6h\|24h\|7d` | Historical readings for the selected window |
| `/api/device-status` | ESP32 identity and device status |
| `/api/insights` | Optional backend-generated environmental analysis |

The frontend intentionally does not implement `POST /api/readings`; the ESP32 is expected to send readings directly to the backend.

## Assumed response schema

The exact backend schema was not supplied, so the API client normalizes the following assumed shapes. Responses may be wrapped in `data` or `result`.

A reading is an object with a required ISO-compatible `timestamp` (or `recorded_at`/`created_at`) and optional numeric fields: `mq135RawAdc` / `mq135_raw_adc`, `mq135Voltage` / `mq135_voltage`, `temperatureC` / `temperature_c`, `humidityPct` / `humidity_pct`, and `pressureHpa` / `pressure_hpa`. The readings endpoint can return a bare array or `{ "readings": [...] }`.

Health can return `{ "ok": true, "status": "healthy" }` or a compatible status string. Device status can return `deviceId` / `device_id`, `status`, boolean `online`, `lastReadingAt` / `last_reading_at`, and `firmwareVersion` / `firmware_version`. Insights can return `summary`, `observedTrends`, `potentialAnomalies`, `recommendations`, and `analyzedAt`; list-like fields may be arrays or strings.

The UI treats missing, malformed, or invalid values as unavailable. Raw MQ-135 ADC is shown as ADC only. It is never labeled as ppm or official AQI, and the UI does not claim that MQ-135 alone measures PM2.5 or PM10.

## Live data versus demo data

The dashboard does not generate random sample readings and does not ship demo sensor values. When `VITE_API_BASE_URL` is not configured or the backend has no records, the interface says that live data is unavailable. The small `LIVE DATA ONLY` marker makes that behavior explicit. Any future fixture work should be labeled `DEMO DATA` and must not be presented as physical hardware output.

## Frontend behavior and limitations

Frontend availability, backend connectivity, ESP32 status, and sensor-data availability are represented separately. Device online state comes from `/api/device-status` and is not inferred only from a successful health response. A timestamp older than 15 minutes is surfaced as stale. Automatic refresh, compact panel density, and the backend setup guidance are local browser preferences; no backend settings are stored.

The frontend has not been connected to the physical ESP32 or verified against the separately implemented FastAPI backend in this project. That integration, exact schema confirmation, and hardware behavior remain follow-up work for the backend/firmware implementation.

## Validation performed

The completed validation for this frontend is:

- `npm install` completed successfully with 64 packages added and 0 reported vulnerabilities.
- `npm run typecheck` passed with no TypeScript errors.
- `npm run build` passed and produced the `dist/` static output. Vite emitted only its standard advisory that the single JavaScript bundle is larger than 500 kB because of chart/icon dependencies.
- `GET /manus-routes.json` returned HTTP 200 with the five declared page routes.
- Managed Preview renders were visually checked at desktop and mobile sizes for `/`, `/history`, and `/settings`; the fixed desktop navigation rail was also checked in a non-full viewport capture. Direct route rendering and empty/error states were visible.

This validation does not claim that the frontend is connected to a physical ESP32 or verified against the separately implemented FastAPI backend. Those integration tests remain outside this frontend-only project.
