# AeroGuard 2.0 frontend outcomes

## Responsive application shell and navigation
- [x] Deliver a polished, responsive React + TypeScript + Vite application with a dashboard-first experience, a light off-white background, charcoal text, forest-green primary accent, muted teal and gray secondary elements, subtle borders, purposeful icons, consistent spacing, clean typography, compact information panels, restrained hover states, and minimal animation.
- [x] Make Dashboard, Sensor History, AI Insights, Device Information, and Settings navigation work on desktop and mobile with accessible keyboard-friendly controls.

## Honest live status and sensor overview
- [x] Show distinct frontend availability, backend connectivity, ESP32 connectivity, sensor-data availability, and safely formatted last-updated status in the header/status area.
- [x] Show MQ-135 raw ADC and optional ADC voltage with supplied timestamp and recent trend; never label raw ADC as ppm or official AQI and never claim MQ-135 alone measures PM2.5 or PM10.
- [x] Show BME280 temperature in °C, relative humidity in %, and atmospheric pressure in hPa using supplied values and timestamps.
- [x] Handle loading, backend unavailable, no readings, stale readings, missing values, invalid API responses, and unavailable insights without fabricating sensor readings or device details.

## Historical monitoring
- [x] Provide readable, responsive Recharts visualizations for MQ-135 ADC, temperature, humidity, and pressure with units and timestamps.
- [x] Provide 1 hour, 6 hours, 24 hours, and 7 days controls; selecting a supported range requests that range from the backend.
- [x] Show a useful empty state when the backend returns no history.

## Insights and device information
- [x] Prepare the insights view for backend-generated summary, observed trends, potential anomalies, recommendations, and analysis timestamp, with a clean unavailable state and no fake AI content.
- [x] Show only supplied device identifier, status, last reading received, and firmware version in the device view, with explicit missing-value handling.

## Typed API contract and settings
- [x] Centralize typed GET calls for `/api/health`, `/api/latest`, `/api/readings`, `/api/device-status`, and `/api/insights`; keep POST `/api/readings` out of the frontend.
- [x] Configure the backend base URL through `VITE_API_BASE_URL`, include `.env.example`, handle JSON, unsuccessful responses, network failures, timeout, null/missing fields, invalid payloads, and timestamps safely.
- [x] Provide frontend-only settings for backend URL guidance, refresh interval, and display preferences using local storage only.

## Documentation and delivery evidence
- [x] Include a README covering requirements, install, development server, production build, environment configuration, expected endpoints, assumed schemas, demo-vs-live behavior, and limitations.
- [x] Run dependency installation, diagnostics/typecheck, production build, route-manifest verification, and application readiness checks; report actual results without claiming physical ESP32 or backend integration testing.
