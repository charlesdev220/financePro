import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cbv.myfinance',
  appName: 'MyFinance',
  webDir: 'www',

  server: {
    // Prohibir tráfico HTTP en texto claro — solo HTTPS en producción
    cleartext: false,
  },

  ios: {
    // Respeta el safe area del notch (iPhone X y posteriores)
    contentInset: 'automatic',
    // Color mint del Design System mientras carga la webview
    backgroundColor: '#E8F5EE',
    // Evitar link preview con 3D Touch / Haptic Touch (privacidad)
    allowsLinkPreview: false,
    // Ionic gestiona el scroll internamente — deshabilitar el nativo
    scrollEnabled: false,
  },

  plugins: {
    SplashScreen: {
      // Splash visible 2 s antes de mostrar la app
      launchShowDuration: 2000,
      // Verde primario del Design System
      backgroundColor: '#5BAD8F',
      androidSplashResourceName: 'splash',
      // Sin spinner sobre el splash — el DS tiene su propio indicador
      showSpinnerOffScreen: false,
      // Ocultar automáticamente; el app lo controla si necesita más tiempo
      launchAutoHide: true,
    },
    StatusBar: {
      // Texto e iconos oscuros — legibles sobre el fondo mint/verde claro
      style: 'DARK',
    },
  },
};

export default config;
