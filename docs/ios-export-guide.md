# Guía de exportación iOS — MyFinance

Registro completo de los pasos seguidos para preparar, scaffoldear y correr la app en iPhone/simulador iOS.

---

## Entorno de trabajo

| Herramienta | Versión |
|-------------|---------|
| macOS | Darwin 25.4.0 |
| Xcode | 26.4.1 (Build 17E202) |
| Node.js | v25.6.1 |
| npm | 11.9.0 |
| Capacitor CLI | 8.3.0 |
| CocoaPods | 1.16.2 |

---

## Paso 1 — Verificar prerrequisitos

Antes de cualquier comando, confirmar que el entorno tiene lo necesario:

```bash
xcodebuild -version     # debe mostrar Xcode, no "command line tools"
pod --version           # debe mostrar la versión de CocoaPods
```

---

## Paso 2 — Instalar Xcode.app

Descargar desde la Mac App Store:
**https://apps.apple.com/app/xcode/id497799835**

Abrir Xcode al menos una vez para aceptar la licencia, luego apuntar el sistema al developer directory correcto:

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

Verificar que quedó bien:

```bash
xcode-select -p
# Debe devolver: /Applications/Xcode.app/Contents/Developer
```

> **Error frecuente:** si `xcodebuild` dice `requires Xcode, but active developer directory is a command line tools instance`, es porque falta correr el `xcode-select --switch` de arriba.

---

## Paso 3 — Instalar CocoaPods

CocoaPods gestiona las dependencias nativas del proyecto iOS generado por Capacitor.

```bash
brew install cocoapods
```

Verificar:

```bash
pod --version
# 1.16.2
```

---

## Paso 4 — Instalar el paquete @capacitor/ios

El paquete npm de la plataforma iOS debe estar instalado en el proyecto antes de poder hacer `cap add ios`:

```bash
cd frontend/
npm install @capacitor/ios --save
```

> Este paso es necesario aunque Capacitor CLI ya esté instalado. Sin `@capacitor/ios` en `node_modules`, el CLI no puede scaffoldear la plataforma.

---

## Paso 5 — Configurar capacitor.config.ts

Antes de generar el proyecto nativo, se actualizó `frontend/capacitor.config.ts` con configuración específica para iOS:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myfinance.app',
  appName: 'MyFinance',
  webDir: 'www',

  server: {
    cleartext: false,           // solo HTTPS en producción
  },

  ios: {
    contentInset: 'automatic',  // safe area para iPhone con notch
    backgroundColor: '#E8F5EE', // color mint del DS mientras carga la webview
    allowsLinkPreview: false,   // privacidad — sin 3D Touch preview
    scrollEnabled: false,       // Ionic gestiona el scroll internamente
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#5BAD8F',     // verde primario del DS
      androidSplashResourceName: 'splash',
      showSpinnerOffScreen: false,
      launchAutoHide: true,
    },
    StatusBar: {
      style: 'DARK',                  // iconos oscuros sobre fondo claro
    },
  },
};

export default config;
```

---

## Paso 6 — Scaffoldear la plataforma iOS

Este comando crea la carpeta `frontend/ios/` con el proyecto nativo de Xcode:

```bash
cd frontend/
npm run ios:setup
# equivale a: npx cap add ios && npx cap sync ios
```

Salida esperada:

```
✔ Adding native Xcode project in ios
✔ Copying web assets from www to ios/App/App/public
✔ Found 4 Capacitor plugins for ios:
   @capacitor/app, @capacitor/haptics, @capacitor/keyboard, @capacitor/status-bar
✔ update ios
[success] ios platform added!
[info] Sync finished in 0.657s
```

Estructura generada en `frontend/ios/App/`:

```
ios/App/
├── App/                  ← código Swift de la app
├── App.xcodeproj         ← proyecto Xcode (NO abrir este)
└── CapApp-SPM/           ← paquetes Swift de Capacitor
```

---

## Paso 7 — Abrir el proyecto en Xcode

```bash
cd frontend/
npm run ios:open
# equivale a: npx cap open ios
```

> **Importante:** Capacitor abre el `.xcworkspace` (no el `.xcodeproj`). Siempre usar `npm run ios:open` o abrir manualmente el archivo `.xcworkspace` — nunca el `.xcodeproj`.

---

## Paso 8 — Correr la app en simulador

Dentro de Xcode:

1. En la barra superior, seleccionar el simulador (ej: `iPhone 16`)
2. Presionar **▶ (Play)** o `Cmd + R`

La app compila y abre en el simulador de iPhone.

---

## Scripts disponibles (package.json)

| Script | Comando | Uso |
|--------|---------|-----|
| `ios:setup` | `cap add ios && cap sync ios` | **Primer setup** — crea la carpeta `ios/` |
| `ios:sync` | `build:prod + cap sync ios` | **Flujo diario** — sincroniza cambios Angular → iOS |
| `ios:open` | `cap open ios` | Abre Xcode con el workspace correcto |
| `ios:run` | `cap run ios` | Corre en simulador sin abrir Xcode |

---

## Flujo de trabajo diario

Después del setup inicial, cada vez que se modifica código Angular:

```bash
cd frontend/
npm run ios:sync   # 1. build Angular + sync a iOS
npm run ios:open   # 2. abrir Xcode (si no está abierto)
                   # 3. Cmd+R en Xcode para compilar y correr
```

O sin abrir Xcode:

```bash
npm run ios:sync
npm run ios:run    # corre directo en simulador
```

---

## Script de onboarding automático

`frontend/scripts/prepare-ios.sh` valida Xcode y CocoaPods antes de ejecutar nada. Útil para onboarding de nuevos desarrolladores:

```bash
chmod +x scripts/prepare-ios.sh
./scripts/prepare-ios.sh
```

---

## Actualizar la app tras cambios en el código

### Cambios en código Angular (TypeScript / HTML / SCSS)

Siempre hay que re-sincronizar antes de ver los cambios en el simulador:

```bash
npm run ios:sync   # build prod + cap sync
```

Luego en Xcode `Cmd + R` para recompilar y ver los cambios.

### Cambios nativos (capacitor.config.ts, plugins nuevos, íconos)

El mismo comando copia la configuración actualizada al proyecto nativo:

```bash
npm run ios:sync
```

### Atajo para iterar UI rápido — Live Reload

Si estás ajustando pantallas y no querés hacer build completo cada vez, Capacitor tiene live reload. La app se actualiza en el simulador cada vez que guardás, igual que `ng serve` en el browser:

```bash
npx ionic cap run ios --livereload --external
```

> Requiere que el Mac y el simulador/device estén en la misma red. Para el simulador funciona directo sin configuración adicional.

### Resumen — cuándo correr qué

| Situación | Comando |
|-----------|---------|
| Cambios de código → ver en simulador | `npm run ios:sync` → `Cmd+R` en Xcode |
| Iterando UI rápido sin build completo | `npx ionic cap run ios --livereload --external` |
| Nuevo plugin o cambio en config nativa | `npm run ios:sync` |
| Primera vez / setup desde cero | `npm run ios:setup` |

---

## Errores frecuentes

| Error | Causa | Solución |
|-------|-------|----------|
| `requires Xcode, but active developer directory is a command line tools instance` | `xcode-select` apunta a CLT, no a Xcode.app | `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer` |
| `Could not find the ios platform` | `@capacitor/ios` no está en `node_modules` | `npm install @capacitor/ios --save` |
| `command not found: pod` | CocoaPods no instalado | `brew install cocoapods` |
| Abrir `.xcodeproj` en lugar de `.xcworkspace` | Selección manual incorrecta | Usar `npm run ios:open` o abrir el `.xcworkspace` |
| App desactualizada en simulador | Cambios Angular no sincronizados | `npm run ios:sync` antes de compilar en Xcode |
