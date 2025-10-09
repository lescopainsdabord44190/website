# Hook de Tracking PostHog

## Installation

Le hook `useTracking` est déjà configuré et prêt à l'emploi dans l'application.

## Utilisation de base

```tsx
import { useTracking, TrackingEvent } from '../hooks/useTracking';

function MyComponent() {
  const { trackEvent } = useTracking();

  const handleClick = () => {
    trackEvent(TrackingEvent.PAGE_VIEWED, {
      page_title: 'Ma Page',
      page_slug: 'ma-page',
    });
  };

  return <button onClick={handleClick}>Cliquer</button>;
}
```

## API

### `trackEvent(event, properties?)`

Capture un événement avec des propriétés optionnelles.

**Paramètres :**
- `event` (TrackingEvent) : Le nom de l'événement à capturer (utiliser l'enum)
- `properties` (TrackingProperties, optionnel) : Les propriétés associées à l'événement

**Exemple :**
```tsx
trackEvent(TrackingEvent.USER_LOGGED_IN, {
  user_role: 'admin',
});
```

### `identifyUser(userId, properties?)`

Identifie un utilisateur dans PostHog.

**Paramètres :**
- `userId` (string) : L'identifiant unique de l'utilisateur
- `properties` (TrackingProperties, optionnel) : Les propriétés de l'utilisateur

**Exemple :**
```tsx
identifyUser(user.id, {
  email: user.email,
  role: user.role,
});
```

### `resetUser()`

Réinitialise l'utilisateur actuel (à utiliser lors de la déconnexion).

**Exemple :**
```tsx
const handleLogout = async () => {
  await logout();
  resetUser();
};
```

## Événements disponibles

Les événements sont définis dans l'enum `TrackingEvent` :

- `PAGE_VIEWED` : Visualisation d'une page
- `USER_SIGNED_UP` : Inscription d'un utilisateur
- `USER_LOGGED_IN` : Connexion d'un utilisateur
- `USER_LOGGED_OUT` : Déconnexion d'un utilisateur
- `PAGE_CREATED` : Création d'une page
- `PAGE_UPDATED` : Mise à jour d'une page
- `PAGE_DELETED` : Suppression d'une page
- `SETTINGS_UPDATED` : Mise à jour des paramètres
- `CONTACT_FORM_SUBMITTED` : Soumission du formulaire de contact
- `PROFILE_UPDATED` : Mise à jour du profil
- `PASSWORD_RESET_REQUESTED` : Demande de réinitialisation de mot de passe
- `PASSWORD_RESET_COMPLETED` : Réinitialisation de mot de passe terminée
- `COOKIE_CONSENT_ACCEPTED` : Consentement des cookies accepté
- `COOKIE_CONSENT_DECLINED` : Consentement des cookies refusé
- `PHONE_CLICKED` : Clic sur un bouton de téléphone
- `PORTAL_CLICKED` : Clic sur le bouton du portail famille
- `FACEBOOK_CLICKED` : Clic sur le lien Facebook
- `INSTAGRAM_CLICKED` : Clic sur le lien Instagram
- `ACCOUNT_DELETED` : Suppression d'un compte utilisateur

## Propriétés communes

Les propriétés sont définies dans l'enum `TrackingProperty` :

- `PAGE_TITLE` : Titre de la page
- `PAGE_SLUG` : Slug de la page
- `PAGE_ID` : ID de la page
- `USER_ROLE` : Rôle de l'utilisateur
- `FORM_TYPE` : Type de formulaire
- `ERROR_MESSAGE` : Message d'erreur
- `SUCCESS` : Succès de l'opération
- `LOCATION` : Emplacement de l'action (ex: 'home_page', 'footer', 'contact_page')
- `PHONE_NUMBER` : Numéro de téléphone cliqué
- `SOCIAL_NETWORK` : Réseau social ('facebook', 'instagram')

## Exemples d'utilisation

### Tracking d'une page

```tsx
import { useEffect } from 'react';
import { useTracking, TrackingEvent, TrackingProperty } from '../hooks/useTracking';

function PageView({ page }) {
  const { trackEvent } = useTracking();

  useEffect(() => {
    trackEvent(TrackingEvent.PAGE_VIEWED, {
      [TrackingProperty.PAGE_TITLE]: page.title,
      [TrackingProperty.PAGE_SLUG]: page.slug,
      [TrackingProperty.PAGE_ID]: page.id,
    });
  }, [page.id]);

  return <div>{/* ... */}</div>;
}
```

### Tracking d'une soumission de formulaire

```tsx
import { useTracking, TrackingEvent, TrackingProperty } from '../hooks/useTracking';

function ContactForm() {
  const { trackEvent } = useTracking();

  const handleSubmit = async (data) => {
    try {
      await sendContact(data);
      
      trackEvent(TrackingEvent.CONTACT_FORM_SUBMITTED, {
        [TrackingProperty.SUCCESS]: true,
        [TrackingProperty.FORM_TYPE]: 'contact',
      });
    } catch (error) {
      trackEvent(TrackingEvent.CONTACT_FORM_SUBMITTED, {
        [TrackingProperty.SUCCESS]: false,
        [TrackingProperty.ERROR_MESSAGE]: error.message,
      });
    }
  };

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

### Tracking de la connexion utilisateur

```tsx
import { useTracking, TrackingEvent, TrackingProperty } from '../hooks/useTracking';

function LoginPage() {
  const { trackEvent, identifyUser } = useTracking();

  const handleLogin = async (email, password) => {
    try {
      const user = await signIn(email, password);
      
      identifyUser(user.id, {
        email: user.email,
        [TrackingProperty.USER_ROLE]: user.role,
      });

      trackEvent(TrackingEvent.USER_LOGGED_IN, {
        [TrackingProperty.USER_ROLE]: user.role,
      });
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return <div>{/* ... */}</div>;
}
```

### Tracking des clics sur les liens externes

```tsx
import { useTracking, TrackingEvent, TrackingProperty } from '../hooks/useTracking';

function Footer() {
  const { trackEvent } = useTracking();

  return (
    <div>
      {/* Tracking du clic sur le téléphone */}
      <a
        href={`tel:${phoneNumber}`}
        onClick={() => trackEvent(TrackingEvent.PHONE_CLICKED, {
          [TrackingProperty.LOCATION]: 'footer',
          [TrackingProperty.PHONE_NUMBER]: phoneNumber,
        })}
      >
        Appelez-nous
      </a>

      {/* Tracking du clic sur Facebook */}
      <a
        href={facebookUrl}
        onClick={() => trackEvent(TrackingEvent.FACEBOOK_CLICKED, {
          [TrackingProperty.LOCATION]: 'footer',
          [TrackingProperty.SOCIAL_NETWORK]: 'facebook',
        })}
      >
        Facebook
      </a>

      {/* Tracking du clic sur le portail famille */}
      <a
        href="https://portail.example.com"
        onClick={() => trackEvent(TrackingEvent.PORTAL_CLICKED, {
          [TrackingProperty.LOCATION]: 'home_page',
        })}
      >
        Portail familles
      </a>
    </div>
  );
}
```

### Tracking de la suppression de compte

```tsx
import { useTracking, TrackingEvent, TrackingProperty } from '../hooks/useTracking';

function DeleteAccount() {
  const { trackEvent } = useTracking();

  const handleDelete = async () => {
    try {
      await deleteAccount();
      
      trackEvent(TrackingEvent.ACCOUNT_DELETED, {
        [TrackingProperty.SUCCESS]: true,
      });
    } catch (error) {
      trackEvent(TrackingEvent.ACCOUNT_DELETED, {
        [TrackingProperty.SUCCESS]: false,
        [TrackingProperty.ERROR_MESSAGE]: error.message,
      });
    }
  };

  return <button onClick={handleDelete}>Supprimer mon compte</button>;
}
```

## Bonnes pratiques

1. **Toujours utiliser les enums** : Utilisez `TrackingEvent` et `TrackingProperty` pour les noms d'événements et de propriétés afin d'éviter les erreurs de frappe et de maintenir la cohérence.

2. **Ajouter du contexte** : Incluez toujours des propriétés pertinentes avec vos événements pour faciliter l'analyse.

3. **Validation automatique** : Le hook vérifie automatiquement que l'événement fait partie de l'enum `TrackingEvent`.

4. **Nouvel événement** : Si vous avez besoin d'un nouvel événement, ajoutez-le à l'enum `TrackingEvent` dans le fichier `useTracking.ts`.

5. **Nouvelle propriété** : Si une propriété est utilisée dans plusieurs endroits, ajoutez-la à l'enum `TrackingProperty`.

6. **Contextualiser les clics** : Utilisez la propriété `LOCATION` pour savoir d'où provient un clic (home_page, footer, contact_page, etc.).

