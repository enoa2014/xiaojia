import type { DesktopBridge } from '../app/preload';

declare global {
  interface Window {
    api: DesktopBridge;
  }
}

export {};
