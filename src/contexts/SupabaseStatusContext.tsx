import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface SupabaseStatusContextType {
  isOnline: boolean;
  isChecking: boolean;
  checkConnection: () => Promise<void>;
}

const SupabaseStatusContext = createContext<SupabaseStatusContextType | undefined>(undefined);

/**
 * Teste la connexion à Supabase en effectuant une requête simple
 */
async function testSupabaseConnection(): Promise<boolean> {
  try {
    // On teste avec une requête simple qui ne nécessite pas d'authentification
    // et qui est peu coûteuse (select limit 1 sur une table qui existe toujours)
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 10000); // 10 secondes de timeout
    });

    const queryPromise = supabase
      .from('site_settings')
      .select('id')
      .limit(1)
      .maybeSingle()
      .then(({ error }) => {
        // Si on a une erreur réseau ou serveur (500+), Supabase est down
        if (error) {
          // Les erreurs 5xx indiquent un problème serveur
          // Les erreurs de réseau (pas de réponse) sont aussi problématiques
          const isServerError = 
            error.code === 'PGRST301' || // Service unavailable
            error.code === 'PGRST302' || // Service unavailable
            error.code === 'PGRST116' || // Network error
            error.message?.toLowerCase().includes('fetch') ||
            error.message?.toLowerCase().includes('network') ||
            error.message?.toLowerCase().includes('failed to fetch') ||
            error.message?.toLowerCase().includes('timeout') ||
            error.message?.toLowerCase().includes('aborted');

          if (isServerError) {
            console.warn('Supabase appears to be down:', error);
            return false;
          }

          // Les autres erreurs (404, 403, etc.) ne signifient pas que Supabase est down
          // mais plutôt que la ressource n'existe pas ou n'est pas accessible
          return true;
        }

        return true;
      });

    // Utiliser Promise.race pour gérer le timeout
    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (err) {
    // Si on a une exception (réseau, timeout, etc.), Supabase est down
    if (err instanceof Error && err.message === 'Connection timeout') {
      console.warn('Supabase connection test timed out');
    } else {
      console.error('Supabase connection test failed:', err);
    }
    return false;
  }
}

export function SupabaseStatusProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      const online = await testSupabaseConnection();
      setIsOnline(online);
    } catch (err) {
      console.error('Error checking Supabase connection:', err);
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Vérification initiale au chargement
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Vérification automatique toutes les minutes quand Supabase est down
  useEffect(() => {
    if (!isOnline) {
      const interval = setInterval(() => {
        checkConnection();
      }, 60000); // 60 secondes = 1 minute

      return () => clearInterval(interval);
    }
  }, [isOnline, checkConnection]);

  // Rafraîchir automatiquement la page quand Supabase revient en ligne
  useEffect(() => {
    if (isOnline && !isChecking) {
      // Vérifier si on était précédemment offline (en regardant sessionStorage)
      const wasOffline = sessionStorage.getItem('supabase_was_offline') === 'true';
      if (wasOffline) {
        sessionStorage.removeItem('supabase_was_offline');
        // Rafraîchir la page après un court délai pour permettre à l'UI de se mettre à jour
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } else if (!isOnline) {
      // Marquer qu'on était offline
      sessionStorage.setItem('supabase_was_offline', 'true');
    }
  }, [isOnline, isChecking]);

  // Intercepter les erreurs Supabase dans les requêtes
  useEffect(() => {
    // On peut aussi écouter les erreurs globales de fetch si nécessaire
    // Mais pour l'instant, on se base sur les vérifications périodiques
  }, []);

  return (
    <SupabaseStatusContext.Provider
      value={{
        isOnline,
        isChecking,
        checkConnection,
      }}
    >
      {children}
    </SupabaseStatusContext.Provider>
  );
}

export function useSupabaseStatus() {
  const context = useContext(SupabaseStatusContext);
  if (context === undefined) {
    throw new Error('useSupabaseStatus must be used within a SupabaseStatusProvider');
  }
  return context;
}

