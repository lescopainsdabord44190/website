import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: TurnstileOptions) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string;
    };
  }
}

interface TurnstileOptions {
  sitekey: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'flexible' | 'compact';
  callback?: (token: string) => void;
  'error-callback'?: (error: string) => void;
  'expired-callback'?: () => void;
}

interface TurnstileWidgetProps {
  sitekey: string;
  onSuccess: (token: string) => void;
  onError?: (error: string) => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'flexible' | 'compact';
}

export function TurnstileWidget({
  sitekey,
  onSuccess,
  onError,
  onExpire,
  theme = 'light',
  size = 'normal',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const hasRenderedRef = useRef(false);

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    onExpireRef.current = onExpire;
  }, [onSuccess, onError, onExpire]);

  useEffect(() => {
    const checkTurnstileLoaded = setInterval(() => {
      if (window.turnstile) {
        setIsLoaded(true);
        clearInterval(checkTurnstileLoaded);
      }
    }, 100);

    return () => clearInterval(checkTurnstileLoaded);
  }, []);

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !window.turnstile || hasRenderedRef.current) {
      return;
    }

    hasRenderedRef.current = true;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey,
      theme,
      size,
      callback: (token: string) => onSuccessRef.current(token),
      'error-callback': (error: string) => {
        if (onErrorRef.current) onErrorRef.current(error);
      },
      'expired-callback': () => {
        if (onExpireRef.current) onExpireRef.current();
      },
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      hasRenderedRef.current = false;
    };
  }, [isLoaded, sitekey, theme, size]);

  return <div ref={containerRef} />;
}

