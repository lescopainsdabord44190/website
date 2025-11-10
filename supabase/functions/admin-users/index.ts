declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};
import { createClient, type User } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

type UserRole = 'admin' | 'editor';

type InviteAction = {
  action: 'invite';
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  isEditor?: boolean;
  roles?: UserRole[];
};

type ToggleActiveAction = {
  action: 'toggle_active';
  userId: string;
  isActive: boolean;
};

type UpdatePasswordAction = {
  action: 'update_password';
  userId: string;
  password: string;
};

type DeleteUserAction = {
  action: 'delete_user';
  userId: string;
};

type ResendInvitationAction = {
  action: 'resend_invitation';
  userId: string;
};

type RequestPayload =
  | InviteAction
  | ToggleActiveAction
  | UpdatePasswordAction
  | DeleteUserAction
  | ResendInvitationAction;

type SuccessResponse<T = Record<string, unknown>> = {
  success: true;
  data: T;
};

type ErrorResponse = {
  success: false;
  error: string;
  details?: unknown;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const siteUrlEnv = Deno.env.get('SITE_URL') ?? Deno.env.get('SUPABASE_SITE_URL');
const siteUrl = siteUrlEnv ? siteUrlEnv.replace(/\/$/, '') : null;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

const createAdminClient = () =>
  createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

function jsonResponse<T>(status: number, payload: T) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function assertIsAdmin(accessToken: string): Promise<{
  user: User | null;
  error: Error | null;
}> {
  const supabaseAdmin = createAdminClient();
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (authError || !user) {
    return { user: null, error: authError ?? new Error('Utilisateur non authentifié') };
  }

  const { data: adminRole, error: roleError } = await supabaseAdmin
    .from('user_roles')
    .select('id')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleError) {
    return { user: null, error: roleError };
  }

  if (!adminRole) {
    return { user: null, error: new Error('Accès administrateur requis') };
  }

  return { user, error: null };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse<ErrorResponse>(405, {
      success: false,
      error: 'Méthode non autorisée',
    });
  }

  const authHeader = req.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse<ErrorResponse>(401, {
      success: false,
      error: 'Jeton d’authentification manquant',
    });
  }

  const accessToken = authHeader.replace('Bearer ', '');
  const { user: adminUser, error: adminError } = await assertIsAdmin(accessToken);

  if (!adminUser || adminError) {
    return jsonResponse<ErrorResponse>(403, {
      success: false,
      error: 'Accès refusé',
      details: adminError?.message ?? null,
    });
  }

  let payload: RequestPayload;

  try {
    payload = (await req.json()) as RequestPayload;
  } catch (error) {
    return jsonResponse<ErrorResponse>(400, {
      success: false,
      error: 'Requête invalide',
      details: error instanceof Error ? error.message : error,
    });
  }

  const supabaseAdmin = createAdminClient();

  switch (payload.action) {
    case 'invite': {
      const email = (payload.email || '').trim().toLowerCase();
      const firstName = payload.firstName?.trim() || null;
      const lastName = payload.lastName?.trim() || null;
      const requestedRoles = new Set<UserRole>();

      if (Array.isArray(payload.roles)) {
        payload.roles.forEach((role) => {
          if (role === 'admin' || role === 'editor') {
            requestedRoles.add(role);
          }
        });
      }

      if (payload.isAdmin) {
        requestedRoles.add('admin');
      }

      if (payload.isEditor) {
        requestedRoles.add('editor');
      }

      const rolesToAssign = Array.from(requestedRoles);

      if (!email) {
        return jsonResponse<ErrorResponse>(400, {
          success: false,
          error: 'Email requis pour envoyer une invitation',
        });
      }

      try {
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: {
            first_name: firstName ?? undefined,
            last_name: lastName ?? undefined,
          },
          redirectTo: siteUrl ? `${siteUrl}/reset-password` : undefined,
        });

        if (error || !data?.user) {
          return jsonResponse<ErrorResponse>(400, {
            success: false,
            error: 'Impossible d’inviter cet utilisateur',
            details: error?.message ?? null,
          });
        }

        const invitedUser = data.user;

        await supabaseAdmin.from('profiles').upsert(
          {
            id: invitedUser.id,
            email,
            first_name: firstName,
            last_name: lastName,
            is_active: true,
          },
          { onConflict: 'id' }
        );

        if (rolesToAssign.length > 0) {
          const roleRows = rolesToAssign.map((role) => ({
            user_id: invitedUser.id,
            role,
          }));

          await supabaseAdmin
            .from('user_roles')
            .upsert(roleRows, { onConflict: 'user_id,role' });
        }

        const response: SuccessResponse = {
          success: true,
          data: {
            id: invitedUser.id,
            email: invitedUser.email ?? email,
            first_name: firstName,
            last_name: lastName,
            roles: rolesToAssign,
          },
        };

        return jsonResponse(200, response);
      } catch (error) {
        return jsonResponse<ErrorResponse>(500, {
          success: false,
          error: 'Erreur lors de l’envoi de l’invitation',
          details: error instanceof Error ? error.message : error,
        });
      }
    }

    case 'toggle_active': {
      const { userId, isActive } = payload;

      if (!userId) {
        return jsonResponse<ErrorResponse>(400, {
          success: false,
          error: 'Identifiant utilisateur manquant',
        });
      }

      try {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: isActive ? 'none' : '8760h',
        });

        if (updateError) {
          return jsonResponse<ErrorResponse>(400, {
            success: false,
            error: 'Impossible de mettre à jour le statut',
            details: updateError.message,
          });
        }

        await supabaseAdmin
          .from('profiles')
          .upsert(
            {
              id: userId,
              is_active: isActive,
            },
            { onConflict: 'id' }
          );

        const response: SuccessResponse = {
          success: true,
          data: {
            userId,
            is_active: isActive,
          },
        };

        return jsonResponse(200, response);
      } catch (error) {
        return jsonResponse<ErrorResponse>(500, {
          success: false,
          error: 'Erreur lors de la mise à jour du statut utilisateur',
          details: error instanceof Error ? error.message : error,
        });
      }
    }

    case 'update_password': {
      const { userId, password } = payload;

      if (!userId || !password) {
        return jsonResponse<ErrorResponse>(400, {
          success: false,
          error: 'Identifiant utilisateur et mot de passe requis',
        });
      }

      if (password.length < 6) {
        return jsonResponse<ErrorResponse>(400, {
          success: false,
          error: 'Le mot de passe doit contenir au moins 6 caractères',
        });
      }

      try {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password,
        });

        if (error) {
          return jsonResponse<ErrorResponse>(400, {
            success: false,
            error: 'Impossible de mettre à jour le mot de passe',
            details: error.message,
          });
        }

        const response: SuccessResponse = {
          success: true,
          data: {
            userId,
          },
        };

        return jsonResponse(200, response);
      } catch (error) {
        return jsonResponse<ErrorResponse>(500, {
          success: false,
          error: 'Erreur lors de la mise à jour du mot de passe',
          details: error instanceof Error ? error.message : error,
        });
      }
    }

    case 'delete_user': {
      const { userId } = payload;

      if (!userId) {
        return jsonResponse<ErrorResponse>(400, {
          success: false,
          error: 'Identifiant utilisateur manquant',
        });
      }

      if (userId === adminUser.id) {
        return jsonResponse<ErrorResponse>(400, {
          success: false,
          error: 'Impossible de supprimer votre propre compte depuis cette interface',
        });
      }

      try {
        const { error: rolesError } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        if (rolesError) {
          return jsonResponse<ErrorResponse>(400, {
            success: false,
            error: 'Impossible de nettoyer les rôles',
            details: rolesError.message,
          });
        }

        const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId);

        if (profileError) {
          return jsonResponse<ErrorResponse>(400, {
            success: false,
            error: 'Impossible de nettoyer le profil',
            details: profileError.message,
          });
        }

        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) {
          return jsonResponse<ErrorResponse>(400, {
            success: false,
            error: 'Impossible de supprimer cet utilisateur',
            details: error.message,
          });
        }

        const response: SuccessResponse = {
          success: true,
          data: {
            userId,
          },
        };

        return jsonResponse(200, response);
      } catch (error) {
        return jsonResponse<ErrorResponse>(500, {
          success: false,
          error: 'Erreur lors de la suppression de l’utilisateur',
          details: error instanceof Error ? error.message : error,
        });
      }
    }

    case 'resend_invitation': {
      const { userId } = payload;

      if (!userId) {
        return jsonResponse<ErrorResponse>(400, {
          success: false,
          error: 'Identifiant utilisateur manquant',
        });
      }

      try {
        const { data: userData, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (fetchError) {
          return jsonResponse<ErrorResponse>(400, {
            success: false,
            error: 'Utilisateur introuvable',
            details: fetchError.message,
          });
        }

        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) {
          return jsonResponse<ErrorResponse>(400, {
            success: false,
            error: 'Impossible de récupérer le profil',
            details: profileError.message,
          });
        }

        const targetEmail = profile?.email ?? userData?.user?.email ?? null;

        if (!targetEmail) {
          return jsonResponse<ErrorResponse>(400, {
            success: false,
            error: 'Cet utilisateur ne possède pas d’email',
          });
        }

        const metadata = (userData?.user?.user_metadata ?? {}) as Record<string, unknown>;

        const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(targetEmail, {
          data: {
            first_name: profile?.first_name ?? (typeof metadata.first_name === 'string' ? metadata.first_name : undefined),
            last_name: profile?.last_name ?? (typeof metadata.last_name === 'string' ? metadata.last_name : undefined),
          },
          redirectTo: siteUrl ? `${siteUrl}/reset-password` : undefined,
        });

        if (inviteError) {
          return jsonResponse<ErrorResponse>(400, {
            success: false,
            error: 'Impossible de renvoyer l’invitation',
            details: inviteError.message,
          });
        }

        return jsonResponse<SuccessResponse>(200, {
          success: true,
          data: {
            userId,
            email: targetEmail,
          },
        });
      } catch (error) {
        return jsonResponse<ErrorResponse>(500, {
          success: false,
          error: 'Erreur lors du renvoi de l’invitation',
          details: error instanceof Error ? error.message : error,
        });
      }
    }

    default:
      return jsonResponse<ErrorResponse>(400, {
        success: false,
        error: 'Action non supportée',
      });
  }
});


