/**
 * Utilitaire pour gérer le consentement des cookies
 * 
 * Exemple d'utilisation avec Posthog:
 * 
 * ```typescript
 * import { hasAcceptedCookies } from './lib/cookies';
 * import posthog from 'posthog-js';
 * 
 * // Initialiser Posthog seulement si l'utilisateur a accepté
 * if (hasAcceptedCookies()) {
 *   posthog.init('YOUR_API_KEY', {
 *     api_host: 'https://app.posthog.com'
 *   });
 * }
 * 
 * // Ou écouter les changements de consentement
 * window.addEventListener('storage', (e) => {
 *   if (e.key === 'cookie-consent' && e.newValue === 'accepted') {
 *     // Initialiser le tracking
 *   }
 * });
 * ```
 */

export type CookieConsent = 'accepted' | 'declined' | null;

/**
 * Récupère le statut de consentement des cookies
 */
export function getCookieConsent(): CookieConsent {
  const consent = localStorage.getItem('cookie-consent');
  if (consent === 'accepted' || consent === 'declined') {
    return consent as CookieConsent;
  }
  return null;
}

/**
 * Vérifie si l'utilisateur a accepté les cookies
 */
export function hasAcceptedCookies(): boolean {
  return getCookieConsent() === 'accepted';
}

/**
 * Vérifie si l'utilisateur a décliné les cookies
 */
export function hasDeclinedCookies(): boolean {
  return getCookieConsent() === 'declined';
}

/**
 * Récupère la date du consentement
 */
export function getConsentDate(): Date | null {
  const dateStr = localStorage.getItem('cookie-consent-date');
  return dateStr ? new Date(dateStr) : null;
}

/**
 * Réinitialise le consentement des cookies
 * (utile pour les tests ou si l'utilisateur veut changer d'avis)
 */
export function resetCookieConsent(): void {
  localStorage.removeItem('cookie-consent');
  localStorage.removeItem('cookie-consent-date');
}

