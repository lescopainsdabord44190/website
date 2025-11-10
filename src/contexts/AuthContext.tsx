import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useTracking, TrackingEvent, TrackingProperty } from '../hooks/useTracking';

export type UserRole = 'admin' | 'editor';

function isUserRole(value: unknown): value is UserRole {
  return value === 'admin' || value === 'editor';
}

function determinePrimaryRole(roles: UserRole[]): 'admin' | 'editor' | 'user' {
  if (roles.includes('admin')) {
    return 'admin';
  }
  if (roles.includes('editor')) {
    return 'editor';
  }
  return 'user';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  roles: UserRole[];
  avatarUrl: string | null;
  updateAvatar: (url: string | null) => void;
  refreshAvatar: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { trackEvent, identifyUser, resetUser } = useTracking();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const ensureProfile = async (nextUser: User) => {
    try {
      const metadata = (nextUser.user_metadata ?? {}) as Record<string, unknown>;
      const metadataFirstName =
        typeof metadata.first_name === 'string' ? (metadata.first_name as string) : null;
      const metadataLastName =
        typeof metadata.last_name === 'string' ? (metadata.last_name as string) : null;
      const safeEmail = typeof nextUser.email === 'string' ? nextUser.email : null;

      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('id', nextUser.id)
        .maybeSingle();

      if (selectError) {
        console.error('Error fetching profile:', selectError);
        return;
      }

      if (!existingProfile) {
        await supabase.from('profiles').insert({
          id: nextUser.id,
          email: safeEmail,
          first_name: metadataFirstName,
          last_name: metadataLastName,
          is_active: true,
        });
      } else if (existingProfile.email !== safeEmail) {
        await supabase
          .from('profiles')
          .update({
            email: safeEmail,
          })
          .eq('id', nextUser.id);
      }
    } catch (error) {
      console.error('Error ensuring profile:', error);
    }
  };

  const loadUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      const normalizedRoles = (data ?? [])
        .map((row) => row.role)
        .filter(isUserRole);

      setRoles(normalizedRoles);
      setIsAdmin(normalizedRoles.includes('admin'));
      setIsEditor(normalizedRoles.includes('editor'));
    } catch (error) {
      console.error('Error loading user roles:', error);
      setRoles([]);
      setIsAdmin(false);
      setIsEditor(false);
    }
  };

  const handleAuthenticatedUser = async (nextUser: User) => {
    setLoading(true);
    try {
      await Promise.all([loadUserRoles(nextUser.id), loadAvatar(nextUser.id), ensureProfile(nextUser)]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await handleAuthenticatedUser(session.user);
      } else {
        setRoles([]);
        setIsAdmin(false);
        setIsEditor(false);
        setLoading(false);
        setAvatarUrl(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await handleAuthenticatedUser(session.user);
        } else {
          setIsAdmin(false);
          setIsEditor(false);
          setRoles([]);
          setAvatarUrl(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadAvatar = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .maybeSingle();

      setAvatarUrl(data?.avatar_url || null);
    } catch (err) {
      console.error('Error loading avatar:', err);
      setAvatarUrl(null);
    }
  };

  const refreshAvatar = async () => {
    if (user) {
      await loadAvatar(user.id);
    }
  };

  const updateAvatar = (url: string | null) => {
    setAvatarUrl(url);
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.user) {
        const { data: rawRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id);

        const normalizedRoles =
          rawRoles?.map((row) => row.role).filter(isUserRole) ?? [];
        const primaryRole = determinePrimaryRole(normalizedRoles);

        identifyUser(data.user.id, {
          email: data.user.email,
          roles: normalizedRoles.length > 0 ? normalizedRoles.join(',') : null,
          [TrackingProperty.USER_ROLE]: primaryRole,
        });

        trackEvent(TrackingEvent.USER_LOGGED_IN, {
          [TrackingProperty.USER_ROLE]: primaryRole,
          [TrackingProperty.SUCCESS]: true,
        });
      } else if (error) {
        trackEvent(TrackingEvent.USER_LOGGED_IN, {
          [TrackingProperty.SUCCESS]: false,
          [TrackingProperty.ERROR_MESSAGE]: error.message,
        });
      }

      return { error };
    } catch (error) {
      trackEvent(TrackingEvent.USER_LOGGED_IN, {
        [TrackingProperty.SUCCESS]: false,
        [TrackingProperty.ERROR_MESSAGE]: (error as Error).message,
      });
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    trackEvent(TrackingEvent.USER_LOGGED_OUT);
    resetUser();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        isEditor,
        roles,
        avatarUrl,
        updateAvatar,
        refreshAvatar,
        hasRole: (role: UserRole) => roles.includes(role),
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
