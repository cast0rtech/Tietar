# ⚡ Tietar - Tesla Local Stats for iOS (castor_tech)

<p align="center">
  <img src="public/logo.png" alt="castor_tech Logo" width="140" />
</p>

<p align="center">
  <b>Local-first Tesla Vehicle Telemetry, Diagnostics & Analytics for Apple iOS (iPhone & iPad)</b><br>
  <i>A 100% private, local iOS alternative to Stats for Tesla, Tessie, and TeslaMate — with zero tracking servers, automated cloud-free OpenStreetMap, and automated .ipa packaging via GitHub Actions.</i>
</p>

<p align="center">
  <a href="#-english-documentation"><b>🇬🇧 English Documentation</b></a> • 
  <a href="#-documentación-en-español"><b>🇪🇸 Documentación en Español</b></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-iOS%2016%2B%20%7C%20iPadOS-black?logo=apple" alt="iOS" />
  <img src="https://img.shields.io/badge/Capacitor-v7.1-blue?logo=capacitor" alt="Capacitor" />
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Maps-OpenStreetMap-brightgreen?logo=openstreetmap" alt="OpenStreetMap" />
  <img src="https://img.shields.io/badge/Build-GitHub%20Actions%20macOS-blue?logo=githubactions" alt="Build" />
  <img src="https://img.shields.io/badge/Brand-castor__tech-emerald" alt="castor_tech" />
</p>

---

# 🇬🇧 English Documentation

## 📦 How to Download the Compiled `.ipa` (Automated GitHub Actions)

Because Apple compilation tools (`Xcode` and `xcodebuild`) require macOS, this repository includes an **automated continuous integration (CI) workflow** running on official Apple Silicon macOS runners (`macos-14`):

1. Go to the **[Actions tab in this GitHub repository](https://github.com/cast0rtech/Tietar/actions)**.
2. Click on the latest workflow run: **"Build iOS IPA (Tesla Local Stats)"**.
3. Under the **Artifacts** section at the bottom of the page, click to download:
   ```
   TeslaLocalStats_castor_tech-IPA.zip
   ```
4. Unzip the downloaded file to obtain `TeslaLocalStats_castor_tech.ipa`.

### 📲 How to Install the `.ipa` on Your iPhone or iPad

You can install the `.ipa` package using any of the following popular methods:

- **Sideloadly (Windows & macOS):**  
  1. Download [Sideloadly](https://sideloadly.io/).  
  2. Connect your iPhone via USB or Wi-Fi.  
  3. Drag and drop `TeslaLocalStats_castor_tech.ipa` into Sideloadly, enter your Apple ID, and click **Start**.
- **AltStore (Windows & macOS):**  
  Send the `.ipa` to your iPhone (via iCloud Drive, AirDrop, or email) and select *"Open in AltStore"*.
- **TrollStore (Jailbroken / CoreTrust devices):**  
  Direct one-click installation with permanent signing.
- **Apple Developer Account (Xcode / TestFlight):**  
  Open `ios/App/App.xcworkspace` in Xcode, select your Team profile, and deploy directly to your device.

---

## 🛠️ Compiling Manually in Xcode (on macOS)

If you have a Mac computer with Xcode installed:

```bash
# 1. Clone the repository
git clone https://github.com/cast0rtech/Tietar.git
cd Tietar

# 2. Install dependencies & build bundle
npm install
npm run build
npx cap sync ios

# 3. Open in Xcode
npx cap open ios
```

Inside Xcode:
1. Select the **App** scheme and your target iOS device or simulator.
2. In the **Signing & Capabilities** tab, select your Personal or Developer Team.
3. Click the **Play / Run** button (⌘ + R) to compile and launch.

---

## 📱 The 6 Core Features

1. **🔋 Battery & Sleep Watchdog:** Live SOC %, estimated vs. rated range, and automated watchdog preventing phantom vampire battery drain.
2. **⚡ Charging Analytics:** Supercharger vs. AC detection, real-time kW/V/A telemetry, and automated cost calculation in euros (€).
3. **🧭 Drives & Free Maps:** Historical trip log with dynamic **OpenStreetMap** (Standard, Dark Mode, and Satellite layers with zero API keys required) and regeneration/acceleration color gradient.
4. **🎛️ Vehicle Commands:** Lock/unlock doors, pre-condition climate to 21°C, flash lights, honk horn, pop frunk/trunk, and toggle Sentry Mode.
5. **📊 Battery Health (Degradation):** Cell degradation curve, nominal usable capacity (95.9% health remaining), and longevity forecast.
6. **🔖 Saved Routes:** Real-time route GPS recorder and favorites repository.
7. **☁️ Privacy & Google Drive:** 100% local IndexedDB storage, with optional backup and *"Free Up Storage"* cloud offloading.
8. **📥 CSV Exporter:** RFC 4180 UTF-8 BOM CSV exports compatible with Excel and Google Sheets.

---

<br/>

---

# 🇪🇸 Documentación en Español

## 📦 Cómo Descargar el Archivo `.ipa` Compilado (GitHub Actions)

Dado que las herramientas de Apple (`Xcode` y `xcodebuild`) requieren macOS, este repositorio incorpora un **flujo de trabajo de integración continua automatizado** que compila la app en máquinas virtuales oficiales de Apple (`macos-14`):

1. Accede a la pestaña **[Actions de este repositorio de GitHub](https://github.com/cast0rtech/Tietar/actions)**.
2. Haz clic en la última ejecución: **"Build iOS IPA (Tesla Local Stats)"**.
3. En la sección inferior **Artifacts**, pulsa para descargar:
   ```
   TeslaLocalStats_castor_tech-IPA.zip
   ```
4. Descomprime el archivo zip para obtener tu instalador `TeslaLocalStats_castor_tech.ipa`.

### 📲 Cómo Instalar el `.ipa` en tu iPhone o iPad

Puedes instalar el paquete `.ipa` mediante cualquiera de estos métodos sencillos:

- **Sideloadly (desde Windows o Mac):**  
  1. Descarga e instala [Sideloadly](https://sideloadly.io/).  
  2. Conecta tu iPhone por cable USB o Wi-Fi al ordenador.  
  3. Arrastra el archivo `TeslaLocalStats_castor_tech.ipa` a la ventana de Sideloadly, introduce tu cuenta de Apple ID y pulsa **Start**.
- **AltStore:**  
  Envía el archivo `.ipa` a tu iPhone (por iCloud Drive, Telegram o AirDrop) y elige *"Abrir en AltStore"*.
- **TrollStore:**  
  Instalación directa y firma permanente en dispositivos compatibles.
- **Cuenta de Desarrollador Apple (Xcode):**  
  Abre `ios/App/App.xcworkspace` en un Mac, asigna tu cuenta de desarrollador y pulsa **Run**.

---

## 🛠️ Compilación Manual con Xcode (en Mac)

Si dispones de un ordenador Mac:

```bash
# 1. Clonar el repositorio
git clone https://github.com/cast0rtech/Tietar.git
cd Tietar

# 2. Instalar dependencias y generar recursos
npm install
npm run build
npx cap sync ios

# 3. Abrir en Xcode
npx cap open ios
```

En Xcode:
1. Selecciona el esquema **App** y tu iPhone o simulador como destino.
2. En la pestaña **Signing & Capabilities**, selecciona tu cuenta de Apple Developer.
3. Pulsa **Run** (⌘ + R) para compilar y disfrutar de la app.

---

## 📱 Los 6 Módulos Principales

1. **🔋 Batería:** SOC en vivo, cálculo de autonomía real y protector contra drenaje fantasma (*Sleep Watchdog*).
2. **⚡ Carga:** Monitorización Supercharger vs AC, curvas eléctricas (kW/V/A) y cálculo automático de costes en euros (€).
3. **🧭 Trayectos:** Historial con mapas **OpenStreetMap** (Estándar, Oscuro y Satélite Esri 100% gratuitos y sin claves) y gradiente de potencia/regeneración.
4. **🎛️ Comandos:** Puertas, climatización a 21°C, ráfaga de faros, claxon, maletero delantero/trasero y Modo Centinela.
5. **📊 Salud de Batería:** Capacidad nominal (95.9% de salud), degradación histórica y proyección a 80%.
6. **🔖 Guardar Rutas:** Grabadora GPS en tiempo real y favoritos.
7. **☁️ Google Drive:** Copia de seguridad y función para **"Liberar Espacio"** en el móvil archivando puntos GPS antiguos a la nube.
8. **📥 Exportación CSV:** Informes universales compatibles con Excel y Google Sheets.

---

<p align="center">
  Developed with ❤️ for the Tesla community by <b>castor_tech</b>
</p>
