/**
 * Cloudflare Turnstile configuration
 * 
 * In development (localhost, tunnels, preview environments), we use Cloudflare's test keys to avoid CORS issues.
 * In production, we use the real site key from environment variables.
 * 
 * Test keys documentation: https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */

const hostname = window.location.hostname;

const isDevelopment = 
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname.endsWith('.loca.lt') ||
  hostname.endsWith('.ngrok.io') ||
  hostname.endsWith('.ngrok-free.app') ||
  hostname.includes('localhost:');

const PRODUCTION_SITE_KEY = import.meta.env.VITE_PUBLIC_TURNSTILE_SITE_KEY;

if (!isDevelopment && !PRODUCTION_SITE_KEY) {
  console.error('VITE_PUBLIC_TURNSTILE_SITE_KEY is not configured');
}

export const TURNSTILE_SITE_KEY = isDevelopment
  ? '1x00000000000000000000AA'
  : PRODUCTION_SITE_KEY || '0x4AAAAAAB5xy-iHc49RajP4';

export const TURNSTILE_CONFIG = {
  siteKey: TURNSTILE_SITE_KEY,
  isDevelopment,
} as const;

