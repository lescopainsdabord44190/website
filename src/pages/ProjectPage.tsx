import { Navigate, useParams } from 'react-router';
import { AlertTriangle } from 'lucide-react';
import { useProjectBySlug } from '../hooks/useProjects';
import { EditorJSRenderer } from '../components/EditorJSRenderer';
import { Link } from '../components/Link';
import { useAuth } from '../contexts/AuthContext';

export function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAdmin, isEditor, loading: authLoading } = useAuth();
  const canManageProjects = isAdmin || isEditor;
  const { project, loading } = useProjectBySlug(slug, { includeInactive: canManageProjects });

  if (loading || authLoading) {
    return (
      <div className="bg-gradient-to-br from-[#FEF5F0] to-white py-12 min-h-[400px]">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-10 bg-gray-200 rounded w-3/5"></div>
              <div className="h-6 bg-gray-200 rounded w-2/5"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return <Navigate to="/404" replace />;
  }

  const activeCounselors = project.counselors.filter(
    (link) => link.counselor && link.counselor.is_active
  );

  const showBanner = canManageProjects && !project.is_active;

  return (
    <div className="bg-gradient-to-br from-[#FEF5F0] to-white pb-12">
      {project.cover_image_url && (
        <div className="relative h-60 md:h-80 overflow-hidden">
          <img
            src={project.cover_image_url}
            alt={project.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/70" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
            <div className="container mx-auto max-w-5xl">
              <p className="text-sm uppercase tracking-widest text-white/80 mb-2">
                Projet d’animation
              </p>
              <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg">
                {project.title}
              </h1>
              {project.subtitle && (
                <p className="text-lg md:text-xl text-white/90 mt-2">{project.subtitle}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showBanner && (
        <div className="container mx-auto px-4 pt-6">
          <div className="max-w-5xl mx-auto bg-orange-50 border border-orange-200 text-orange-800 rounded-2xl px-4 py-4 md:px-6 md:py-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-1 text-orange-500 flex-shrink-0" />
              <div>
                <p className="font-semibold">Ce projet n’est pas publié.</p>
                <p className="text-sm text-orange-700">
                  Vous seul·e pouvez consulter ce projet pour l’instant. Rendez-le public depuis l’administration pour l’afficher aux familles.
                </p>
              </div>
            </div>
            <Link
              href={`/admin/projects/${project.id}/edit`}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
            >
              Modifier ce contenu
            </Link>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {!project.cover_image_url && (
            <div>
              <p className="text-sm uppercase tracking-widest text-[#328fce] mb-2">
                Projet d’animation
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800">{project.title}</h1>
              {project.subtitle && (
                <p className="text-lg md:text-xl text-gray-600 mt-3">{project.subtitle}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 bg-white rounded-2xl shadow-lg p-6">
            {project.age_group && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                Public : {project.age_group}
              </span>
            )}
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
              {project.counselors.length} animateur·rices impliqué·es
            </span>
            <Link
              href="/accueil-de-loisirs"
              className="text-sm text-[#328fce] underline hover:text-[#2a7ab8] transition-colors"
            >
              Retourner à l’accueil de loisirs
            </Link>
          </div>

          {project.objectives.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Objectifs pédagogiques</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                {project.objectives.map((objective) => (
                  <li key={objective}>{objective}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10">
            <div className="prose prose-lg max-w-none">
              {project.content ? (
                <EditorJSRenderer content={project.content} enableToc={false} />
              ) : (
                <p className="text-gray-700 leading-relaxed">
                  Le contenu détaillé de ce projet sera bientôt disponible.
                </p>
              )}
            </div>
          </div>

          {activeCounselors.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">L’équipe référente</h2>
              <div className="grid gap-6 md:grid-cols-2">
                {activeCounselors.map(({ counselor, role }) => {
                  if (!counselor) return null;
                  return (
                    <div
                      key={counselor.id}
                      className="border border-gray-200 rounded-2xl p-4 flex gap-4"
                    >
                      {counselor.photo_url ? (
                        <img
                          src={counselor.photo_url}
                          alt={`${counselor.first_name} ${counselor.last_name || ''}`}
                          className="w-20 h-20 object-cover rounded-xl shadow-sm"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                          Photo
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-gray-800">
                          {counselor.first_name} {counselor.last_name || ''}
                        </p>
                        {role && (
                          <p className="text-sm text-[#328fce] font-medium mt-0.5">{role}</p>
                        )}
                        {counselor.tagline && (
                          <p className="text-sm text-gray-600 mt-1">{counselor.tagline}</p>
                        )}
                        <Link
                          href={`/accueil-de-loisirs/equipe`}
                          className="inline-flex items-center text-sm text-[#328fce] mt-3 hover:underline"
                        >
                          Voir toute l’équipe
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


