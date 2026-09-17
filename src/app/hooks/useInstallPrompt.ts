import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Expone el prompt de instalación de la PWA (Android/Chrome/Edge).
 * En iOS no existe `beforeinstallprompt`: se devuelve `canInstall: false`.
 */
export function useInstallPrompt(): {
  canInstall: boolean;
  install: () => Promise<void>;
} {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    setDeferred(null);
  }, [deferred]);

  return { canInstall: deferred !== null, install };
}
