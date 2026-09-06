# ⚡ Tietar - Tesla Local Stats for iOS (castor_tech)

<p align="center">
  <img src="public/logo.png" alt="castor_tech Logo" width="140" />
</p>

<p align="center">
  <b>Local-first Tesla Vehicle Telemetry, Diagnostics & Analytics for Apple iOS (iPhone & iPad)</b><br>
  <i>A 100% private, client-side iOS alternative to Stats for Tesla, Tessie, and TeslaMate — with zero middleman tracking servers, subscription-free OpenStreetMap navigation, and automated continuous .ipa packaging via GitHub Actions.</i>
</p>

<p align="center">
  <a href="#-english-documentation"><b>🇬🇧 English Documentation</b></a> • 
  <a href="#-documentación-en-español"><b>🇪🇸 Documentación en Español</b></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-iOS%2016%2B%20%7C%20iPadOS-black?logo=apple" alt="iOS" />
  <img src="https://img.shields.io/badge/Capacitor-v7.1-blue?logo=capacitor" alt="Capacitor" />
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Database-Dexie%20IndexedDB-brightgreen" alt="Dexie IndexedDB" />
  <img src="https://img.shields.io/badge/Maps-OpenStreetMap%20%2B%20Leaflet-brightgreen?logo=openstreetmap" alt="OpenStreetMap" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub%20Actions%20macOS--14-blue?logo=githubactions" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/Brand-castor__tech-emerald" alt="castor_tech" />
</p>

---

# 🇬🇧 English Documentation

## 🌟 Overview & Philosophy

**Tietar** is a next-generation, local-first Tesla telemetry logger, analytics platform, and vehicle controller tailored for Apple iOS and iPadOS. 

Commercial alternatives like *Tessie*, *Stats for Tesla*, or cloud-hosted *TeslaMate* require your sensitive Tesla Fleet API tokens to route through their remote cloud servers, recurring monthly subscriptions, or complex self-hosted server deployments (Docker, VPS, PostgreSQL, Grafana).

**Tietar changes this paradigm:**
- **Zero Cloud Middlemen:** All communications happen directly between your iPhone and the official Tesla Fleet API (or the built-in simulator).
- **100% Private Local Storage:** Telemetry points, GPS logs, charging sessions, and degradation records are stored directly on your iPhone using **IndexedDB (via Dexie.js)**.
- **Vampire Drain Watchdog:** Smart sleep detection guarantees that your car enters deep sleep mode without constant wake-up polling.
- **Cost-Free Dynamic Maps:** High-resolution OpenStreetMap, CartoDB Dark Matter, and Esri Satellite layers with zero API keys or billing required.
- **Automated `.ipa` Compilation:** You do not need a Mac to build the app! GitHub Actions builds the iOS binary on Apple Silicon runners automatically on every push.

---

## 📱 Key Features

| Feature | Description |
| :--- | :--- |
| **🔋 Battery & Sleep Watchdog** | Real-time State of Charge (SOC %), estimated vs. rated range, usable capacity, battery temperature, and an automatic sleep watchdog that prevents phantom vampire drain. |
| **⚡ Charging Analytics** | Automated Supercharger vs. AC (Home / Public) detection, real-time power curves (kW, V, A), session energy added (kWh), and automated charging cost calculation in euros (€). |
| **🧭 Drives & Free Maps** | Complete trip logger displaying distance, duration, average speed, net kWh consumed, and Wh/km efficiency. Features Leaflet maps with acceleration/regenerative braking color gradient lines and OpenStreetMap / Satellite layers. |
| **🎛️ Vehicle Remote Commands** | Send vehicle instructions: lock/unlock doors, pre-condition climate to 21°C, flash headlights, honk horn, pop front trunk (frunk), open rear trunk, and toggle Sentry Mode. |
| **📊 Battery Health & Degradation** | Track battery cell degradation over time and mileage (odometer). Compare nominal full pack capacity against factory capacity with projected degradation curves. |
| **🔖 Saved Routes & GPS Recorder** | Real-time GPS breadcrumb recorder to log custom road trips, mountain passes, or daily commutes, complete with elevation and power draw statistics. |
| **☁️ Google Drive Backup & "Free Up Space"** | Export full local database backups to Google Drive. Includes a smart **"Free Up Space"** feature that archives historical GPS coordinate points to the cloud while keeping trip summaries locally on the phone. |
| **📥 Universal CSV Exporter** | One-click export conforming to RFC 4180 with UTF-8 BOM encoding, fully compatible with Microsoft Excel, Apple Numbers, and Google Sheets. |
| **🧪 Realistic Tesla Simulator** | Instant out-of-the-box demo mode with simulated driving, charging, and vehicle states. Test all features without needing a Tesla account or car. |

---

## 📦 Download the Pre-compiled `.ipa` (GitHub Actions CI/CD)

Thanks to the automated continuous integration workflow running on Apple Silicon macOS runners (`macos-14`), an iOS `.ipa` package is automatically built on every commit:

1. Navigate to the **[Actions Tab in this GitHub repository](https://github.com/cast0rtech/Tietar/actions)**.
2. Select the latest run of the workflow named **"Build iOS IPA (Tesla Local Stats)"**.
3. Scroll down to the **Artifacts** section at the bottom of the summary page.
4. Download the artifact:
   ```text
   TeslaLocalStats_castor_tech-IPA.zip
   ```
5. Extract the zip archive to obtain `TeslaLocalStats_castor_tech.ipa`.

---

## 📲 How to Install the `.ipa` on iPhone & iPad

You can sideload and install the `.ipa` using any standard iOS sideloading utility:

### Option A: Sideloadly (Recommended for Windows & macOS)
1. Download and install [Sideloadly](https://sideloadly.io/).
2. Connect your iPhone or iPad to your PC or Mac via USB (or Wi-Fi).
3. Drag and drop `TeslaLocalStats_castor_tech.ipa` into Sideloadly.
4. Enter your Apple ID (used strictly for signing the free personal developer certificate).
5. Click **Start** to sign and install the app onto your device.
6. On your iPhone, go to **Settings > General > VPN & Device Management**, tap your Apple ID, and select **Trust**.

### Option B: AltStore (Windows & macOS)
1. Install [AltServer](https://altstore.io/) on your computer.
2. Transfer `TeslaLocalStats_castor_tech.ipa` to your iPhone (via AirDrop, iCloud Drive, or Files).
3. Open the `.ipa` with **AltStore** to install.

### Option C: TrollStore (Jailbroken or CoreTrust-compatible devices)
1. Transfer the `.ipa` directly to your device.
2. Open with TrollStore for permanent, certificate-free installation.

### Option D: Apple Developer Account / TestFlight
1. Open `ios/App/App.xcworkspace` in Xcode on macOS.
2. Configure your signing team in **Signing & Capabilities**.
3. Archive and deploy directly to your physical device or upload to App Store Connect / TestFlight.

---

## 🛠️ Local Development & Manual Build

If you want to modify the code or compile manually with Xcode:

### Prerequisites
- **Node.js**: v20 or newer
- **npm**: v10 or newer
- **Xcode** (optional, only for native macOS compilation): v15 or v16
- **CocoaPods**: `sudo gem install cocoapods` (for iOS native pods)

### Step-by-Step Setup

```bash
# 1. Clone this repository
git clone https://github.com/cast0rtech/Tietar.git
cd Tietar

# 2. Install dependencies
npm install

# 3. Start local development server (with Hot Module Replacement)
npm run dev

# 4. Build web production bundle (Vite + React 19 + TypeScript)
npm run build

# 5. Synchronize web assets with Capacitor iOS project
npx cap sync ios

# 6. Open the native workspace in Xcode (macOS only)
npx cap open ios
```

Inside Xcode:
1. Select the **App** scheme and select your connected iPhone or an iOS Simulator.
2. Go to **Signing & Capabilities** and choose your Apple Developer Team.
3. Press **⌘ + R** (Run) to compile and test on your device.

---

## 🏗️ Architecture & Technology Stack

```
┌────────────────────────────────────────────────────────┐
│                   Tietar iOS App                       │
│        (Capacitor 7.1 Native iOS Container)            │
├────────────────────────────────────────────────────────┤
│                      UI Layer                          │
│   React 19 • TypeScript • TailwindCSS v4 • Lucide      │
├────────────────────────────────────────────────────────┤
│                 Interactive Mapping                    │
│   Leaflet.js • OpenStreetMap • CartoDB • Esri Sat      │
├────────────────────────────────────────────────────────┤
│                 Storage & Services                     │
│   Dexie.js (IndexedDB) • Sleep Watchdog • Background   │
│   CSV Exporter (RFC 4180) • Google Drive Cloud Sync    │
├──────────────────────────┬─────────────────────────────┤
│      Tesla Fleet API     │    Built-in Simulator       │
│  (Direct Token Request)  │   (Full Offline Telemetry)  │
└──────────────────────────┴─────────────────────────────┘
```

- **Frontend Framework:** React 19 with TypeScript and Vite 6.
- **Styling & Design System:** TailwindCSS v4 with dark automotive UI aesthetics, glassmorphic panels, and glowing gauges.
- **Native Bridge:** Capacitor 7 (`@capacitor/ios`, `@capacitor/core`).
- **Client Database:** Dexie.js (high-performance wrapper for IndexedDB).
- **Maps:** Leaflet with tile layers from OpenStreetMap, CartoDB Positron/Dark Matter, and Esri World Imagery (satellite).

---

## 📂 Project Structure

```text
Tietar/
├── .github/
│   └── workflows/
│       └── build-ipa.yml        # Automated macOS-14 GitHub Actions IPA builder
├── ios/                         # Native Xcode project and CocoaPods configuration
│   └── App/
│       ├── App/                 # AppDelegate, Assets, LaunchScreen, Info.plist
│       ├── Podfile              # Capacitor CocoaPods specifications
│       └── App.xcworkspace      # Xcode workspace
├── public/                      # Static assets and icons
│   └── logo.png                 # castor_tech official branding logo
├── src/
│   ├── components/              # UI views and modular sections
│   │   ├── BatteryHealthSection.tsx
│   │   ├── BatterySection.tsx
│   │   ├── ChargingSection.tsx
│   │   ├── CsvExportModal.tsx
│   │   ├── DrivesSection.tsx
│   │   ├── GoogleDriveModal.tsx
│   │   ├── Header.tsx
│   │   ├── LeafletMapView.tsx
│   │   ├── MainMenuGrid.tsx
│   │   ├── SavedRoutesSection.tsx
│   │   ├── SettingsModal.tsx
│   │   └── VehicleCommands.tsx
│   ├── db/                      # Local IndexedDB persistence
│   │   ├── database.ts          # Dexie schema definition
│   │   └── seedData.ts          # Initial telemetry and demo dataset
│   ├── services/                # Business logic and background services
│   │   ├── backgroundSync.ts    # Polling coordinator
│   │   ├── csvExporter.ts       # RFC 4180 CSV export engine
│   │   ├── googleDrive.ts       # Cloud backup and space optimization
│   │   ├── simulator.ts         # Offline Tesla driving & charging simulator
│   │   ├── sleepWatchdog.ts     # Vampire drain protection logic
│   │   └── teslaApi.ts          # Direct Tesla Fleet API connector
│   ├── styles/
│   │   └── index.css            # Global CSS & TailwindCSS v4 configuration
│   ├── types/
│   │   └── tesla.ts             # Telemetry, vehicle, and trip TypeScript interfaces
│   ├── App.tsx                  # Main application orchestrator
│   └── main.tsx                 # React entry point
├── capacitor.config.ts          # Capacitor iOS app configuration
├── package.json                 # Node.js project manifest & dependencies
├── tsconfig.json                # TypeScript compiler configuration
└── vite.config.ts               # Vite bundler configuration
```

---

<br/>

---

# 🇪🇸 Documentación en Español

## 🌟 Visión General y Filosofía

**Tietar** es una plataforma de telemetría, analítica avanzada y control de vehículos Tesla diseñada específicamente para Apple iOS y iPadOS, con una filosofía **100% local y orientada a la privacidad**.

Las aplicaciones comerciales como *Tessie*, *Stats for Tesla* o implementaciones en servidor como *TeslaMate* exigen que tus claves de acceso y coordenadas GPS pasen por servidores en la nube de terceros, requieren suscripciones mensuales recurrentes o precisan de infraestructuras complejas autohospedadas (Docker, VPS, bases de datos SQL).

**Tietar transforma esta experiencia:**
- **Sin Servidores Intermediarios:** La comunicación se establece de forma directa entre tu iPhone y la API oficial de Tesla (o mediante el simulador integrado).
- **Almacenamiento 100% Local:** Todos los trayectos, sesiones de carga, puntos GPS y registros de degradación se almacenan en la memoria interna de tu dispositivo mediante **IndexedDB (con Dexie.js)**.
- **Vigilante contra Drenaje Fantasma (*Sleep Watchdog*):** Algoritmo inteligente que detecta la inactividad del vehículo y suspende las peticiones para permitir que el coche entre en modo de reposo profundo (*Deep Sleep*).
- **Mapas Gratuitos sin Claves de API:** Integración con OpenStreetMap, CartoDB Dark Matter y Satélite Esri de alta definición sin costes por uso ni límites de peticiones.
- **Compilación Automatizada de `.ipa`:** ¡No necesitas tener un Mac! GitHub Actions compila y empaqueta el archivo `.ipa` en servidores Apple Silicon oficiales de forma automática con cada actualización.

---

## 📱 Funcionalidades Principales

| Módulo | Descripción |
| :--- | :--- |
| **🔋 Batería y Vigilante de Reposo** | Nivel de carga en vivo (SOC %), autonomía estimada vs. homologada, capacidad neta utilizable, temperatura de la celda y protector activo contra el consumo vampiro. |
| **⚡ Analítica de Carga** | Detección automática de Supercharger vs. corriente alterna (AC residencial o pública), curvas de potencia en tiempo real (kW, V, A), kWh recargados y cálculo de costes en euros (€). |
| **🧭 Trayectos y Mapas Interactivos** | Registro histórico con distancia, duración, velocidad media, consumo neto y eficiencia en Wh/km. Visualizador Leaflet con gradiente dinámico de color (verde para regeneración, rojo para aceleración) sobre OpenStreetMap y Satélite. |
| **🎛️ Control Remoto del Vehículo** | Envío de comandos: apertura/cierre de seguros, preclimatización a 21°C, ráfaga de faros, claxon, apertura del maletero delantero (*frunk*), maletero trasero y activación del Modo Centinela. |
| **📊 Salud y Degradación de Batería** | Curva histórica de pérdida de capacidad frente al odómetro (kilometraje), capacidad nominal utilizable frente a la original y estimación de degradación futura. |
| **🔖 Guardar Rutas y Grabadora GPS** | Grabación de rutas en vivo punto a punto, almacenamiento de favoritos (puertos de montaña, rutas de viaje) y métricas de elevación y potencia. |
| **☁️ Copia de Seguridad y "Liberar Espacio"** | Respaldo íntegro de la base de datos en Google Drive. Incluye la herramienta **"Liberar Espacio"** para archivar los millones de coordenadas GPS antiguas en la nube manteniendo los resúmenes de trayectos en el iPhone. |
| **📥 Exportación Universal en CSV** | Exportación con codificación UTF-8 BOM conforme al estándar RFC 4180, compatible de inmediato con Microsoft Excel, Apple Numbers y Google Sheets. |
| **🧪 Simulador Tesla Realista** | Modo de prueba instantáneo que simula conducción, recarga y modos de reposo para verificar toda la app sin necesidad de vincular un vehículo real. |

---

## 📦 Descarga del Archivo `.ipa` Compilado (GitHub Actions)

Dado que las herramientas oficiales de Apple (`Xcode` y `xcodebuild`) requieren macOS, este repositorio cuenta con un **flujo de trabajo de integración continua (CI)** configurado en máquinas Apple Silicon (`macos-14`):

1. Dirígete a la pestaña **[Actions de este repositorio en GitHub](https://github.com/cast0rtech/Tietar/actions)**.
2. Selecciona la ejecución más reciente del flujo: **"Build iOS IPA (Tesla Local Stats)"**.
3. En la sección inferior **Artifacts**, haz clic para descargar:
   ```text
   TeslaLocalStats_castor_tech-IPA.zip
   ```
4. Descomprime el archivo descargado para extraer tu instalador `TeslaLocalStats_castor_tech.ipa`.

---

## 📲 Cómo Instalar el `.ipa` en tu iPhone o iPad

Puedes instalar el archivo `.ipa` en cualquier iPhone o iPad con iOS 16 o superior mediante los métodos habituales:

### Opción A: Sideloadly (Recomendado para Windows y macOS)
1. Descarga e instala [Sideloadly](https://sideloadly.io/).
2. Conecta tu iPhone o iPad al ordenador mediante cable USB (o por red Wi-Fi).
3. Arrastra el archivo `TeslaLocalStats_castor_tech.ipa` a la ventana de Sideloadly.
4. Escribe tu Apple ID (utilizado únicamente para firmar el certificado de desarrollador personal y gratuito de Apple).
5. Pulsa **Start**. La aplicación se firmará e instalará directamente en tu dispositivo.
6. En tu iPhone, entra en **Ajustes > General > Gestión de VPN y dispositivos**, pulsa sobre tu cuenta de Apple y selecciona **Confiar**.

### Opción B: AltStore (Windows y macOS)
1. Instala [AltServer](https://altstore.io/) en tu ordenador.
2. Envía el archivo `TeslaLocalStats_castor_tech.ipa` a tu iPhone (por iCloud Drive, AirDrop o la app Archivos).
3. Selecciona el archivo y ábrelo con **AltStore** para completar la instalación.

### Opción C: TrollStore (Dispositivos con Jailbreak o CoreTrust)
1. Transfiere el archivo `.ipa` directamente a tu iPhone.
2. Ábrelo con TrollStore para disfrutar de una instalación permanente sin necesidad de renovar certificados cada 7 días.

### Opción D: Cuenta de Desarrollador Apple (Xcode / TestFlight)
1. Abre `ios/App/App.xcworkspace` en Xcode en tu Mac.
2. Asigna tu cuenta de desarrollo en la pestaña **Signing & Capabilities**.
3. Compila directamente a tu dispositivo físico o genera un paquete para App Store Connect / TestFlight.

---

## 🛠️ Desarrollo Local y Compilación Manual

Si deseas personalizar el código fuente o compilar directamente desde un ordenador Mac:

### Requisitos Previos
- **Node.js**: v20 o superior
- **npm**: v10 o superior
- **Xcode** (para compilación nativa en macOS): v15 o v16
- **CocoaPods**: `sudo gem install cocoapods`

### Instrucciones de Configuración

```bash
# 1. Clonar el repositorio
git clone https://github.com/cast0rtech/Tietar.git
cd Tietar

# 2. Instalar dependencias del proyecto
npm install

# 3. Iniciar el servidor local de desarrollo con recarga rápida
npm run dev

# 4. Generar el paquete web optimizado (Vite + React 19 + TypeScript)
npm run build

# 5. Sincronizar los recursos con el proyecto nativo Capacitor iOS
npx cap sync ios

# 6. Abrir el proyecto en Xcode (solo en macOS)
npx cap open ios
```

Dentro de Xcode:
1. Selecciona el esquema **App** y tu iPhone físico o un simulador como destino.
2. En la pestaña **Signing & Capabilities**, selecciona tu equipo de desarrollo (*Team*).
3. Pulsa el botón **Run** (⌘ + R) para compilar y probar la app.

---

## 🏗️ Arquitectura y Tecnologías Utilizadas

- **Frontend:** React 19 con TypeScript y Vite 6 para un rendimiento instantáneo.
- **Diseño y Estilos:** TailwindCSS v4 con paleta visual oscura de temática automovilística, paneles de cristal translúcido (*glassmorphism*) y marcadores de estado interactivos.
- **Contenedor Nativo:** Capacitor 7 (`@capacitor/ios`, `@capacitor/core`).
- **Base de Datos Local:** Dexie.js (motor optimizado sobre IndexedDB en el navegador nativo de iOS).
- **Cartografía:** Leaflet con capas de OpenStreetMap, CartoDB Positron / Dark Matter y Esri World Imagery (satélite).
- **Integraciones:** Módulo de respaldo y optimización para Google Drive y exportador universal CSV RFC 4180.

---

## 📄 Licencia y Créditos

Desarrollado con dedicación para la comunidad Tesla por **castor_tech** ([@cast0rtech](https://github.com/cast0rtech)).

<p align="center">
  <b>Tietar</b> • Desarrollado por <b>castor_tech</b>
</p>
