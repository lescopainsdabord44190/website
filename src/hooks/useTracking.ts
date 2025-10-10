import { usePostHog } from 'posthog-js/react';
import { useCallback } from 'react';

export enum TrackingEvent {
  PAGE_VIEWED = 'page_viewed',
  USER_SIGNED_UP = 'user_signed_up',
  USER_LOGGED_IN = 'user_logged_in',
  USER_LOGGED_OUT = 'user_logged_out',
  PAGE_CREATED = 'page_created',
  PAGE_UPDATED = 'page_updated',
  PAGE_DELETED = 'page_deleted',
  SETTINGS_UPDATED = 'settings_updated',
  CONTACT_FORM_SUBMITTED = 'contact_form_submitted',
  PROFILE_UPDATED = 'profile_updated',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  COOKIE_CONSENT_ACCEPTED = 'cookie_consent_accepted',
  COOKIE_CONSENT_DECLINED = 'cookie_consent_declined',
  PHONE_CLICKED = 'phone_clicked',
  PORTAL_CLICKED = 'portal_clicked',
  FACEBOOK_CLICKED = 'facebook_clicked',
  INSTAGRAM_CLICKED = 'instagram_clicked',
  ACCOUNT_DELETED = 'account_deleted',
  HIGHLIGHT_CLICKED = 'highlight_clicked',
}

export enum TrackingProperty {
  PAGE_TITLE = 'page_title',
  PAGE_SLUG = 'page_slug',
  PAGE_ID = 'page_id',
  USER_ROLE = 'user_role',
  FORM_TYPE = 'form_type',
  ERROR_MESSAGE = 'error_message',
  SUCCESS = 'success',
  LOCATION = 'location',
  PHONE_NUMBER = 'phone_number',
  SOCIAL_NETWORK = 'social_network',
  HIGHLIGHT_ID = 'highlight_id',
  HIGHLIGHT_TITLE = 'highlight_title',
}

export type TrackingProperties = Record<string, string | number | boolean | null>;

/**
 * Hook to track events with PostHog
 */
export function useTracking() {
  const posthog = usePostHog();

  const trackEvent = useCallback(
    (event: TrackingEvent, properties?: TrackingProperties) => {
      if (!posthog) {
        console.warn('PostHog is not initialized');
        return;
      }

      if (!Object.values(TrackingEvent).includes(event)) {
        console.error('Invalid tracking event:', event);
        return;
      }

      posthog.capture(event, properties);
    },
    [posthog]
  );

  const identifyUser = useCallback(
    (userId: string, properties?: TrackingProperties) => {
      if (!posthog) {
        console.warn('PostHog is not initialized');
        return;
      }

      posthog.identify(userId, properties);
    },
    [posthog]
  );

  const resetUser = useCallback(() => {
    if (!posthog) {
      console.warn('PostHog is not initialized');
      return;
    }

    posthog.reset();
  }, [posthog]);

  return {
    trackEvent,
    identifyUser,
    resetUser,
  };
}

