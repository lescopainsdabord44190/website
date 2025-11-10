import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Edit, Trash2, Sparkles, ToggleLeft, ToggleRight, ChevronDown, ChevronRight } from 'lucide-react';
import { useProjects, type Project } from '../../hooks/useProjects';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export function ProjectsManager() {
  const navigate = useNavigate();
  const { projects, loading, updateProject, deleteProject, fetchProjectsByStatus } = useProjects();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archivedLoaded, setArchivedLoaded] = useState(false);
  const [archivedLoading, setArchivedLoading] = useState(false);

  const loadArchivedProjects = useCallback(async () => {
    setArchivedLoading(true);
    const result = await fetchProjectsByStatus(false);
    if (result.success) {
      setArchivedProjects(result.data);
      setArchivedLoaded(true);
    }
    setArchivedLoading(false);
  }, [fetchProjectsByStatus]);

  const toggleArchivedSection = async () => {
    const nextValue = !archivedOpen;
    setArchivedOpen(nextValue);
    if (nextValue && !archivedLoaded && !archivedLoading) {
      await loadArchivedProjects();
    }
  };

  const handleToggleActive = async (project: Project) => {
    const result = await updateProject(project.id, { is_active: !project.is_active });
    if (result?.success && archivedLoaded) {
      await loadArchivedProjects();
    }
  };

  const handleDelete = (project: Project) => {
    setSelectedProject(project);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedProject) return;
    setIsDeleting(true);
    const { success } = await deleteProject(selectedProject.id);
    if (!success) {
      setIsDeleting(false);
      return;
    }
    if (archivedLoaded) {
      await loadArchivedProjects();
    }
    setIsDeleting(false);
    setIsConfirmOpen(false);
    setSelectedProject(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Projets d’animation</h2>
          <p className="text-gray-600">
            Gérez les projets structurants et associez-les aux animateur·rices référent·es.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/projects/new')}
          className="flex items-center gap-2 bg-[#328fce] text-white px-4 py-2 rounded-lg hover:bg-[#84c19e] transition-colors shadow-md"
        >
          <Plus className="w-5 h-5" />
          Nouveau projet
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#328fce] mx-auto"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-gray-500">
          <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Aucun projet enregistré pour l’instant.</p>
        </div>
      ) : (
        (() => {
          const activeProjects = projects;

          const renderProjectCard = (project: Project) => {
            const activeCounselors = project.counselors.filter(
              (link) => link.counselor && link.counselor.is_active
            );

            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl shadow-lg p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-xl font-semibold text-gray-800">{project.title}</h3>
                    <span className="text-sm text-gray-500">/{project.slug}</span>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        project.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {project.is_active ? 'Actif' : 'Archivé'}
                    </span>
                  </div>
                  {project.subtitle && <p className="text-[#328fce] mt-1">{project.subtitle}</p>}
                  {project.short_description && (
                    <p className="text-gray-600 mt-2">{project.short_description}</p>
                  )}
                  {activeCounselors.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Animateur·rices référent·es :</p>
                      <div className="flex flex-wrap gap-2">
                        {activeCounselors.map((link) => (
                          <span
                            key={link.counselor?.id}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm"
                          >
                            {link.counselor?.first_name} {link.counselor?.last_name || ''}
                            {link.role && <span className="text-xs text-purple-500">({link.role})</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 self-start md:self-auto">
                  <button
                    onClick={() => handleToggleActive(project)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {project.is_active ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                    <span className="text-sm font-medium">{project.is_active ? 'Archiver' : 'Activer'}</span>
                  </button>
                  <button
                    onClick={() => navigate(`/admin/projects/${project.id}/edit`)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="text-sm font-medium">Modifier</span>
                  </button>
                  <button
                    onClick={() => handleDelete(project)}
                    className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Supprimer</span>
                  </button>
                </div>
              </div>
            );
          };

          return (
            <div className="space-y-8">
              {activeProjects.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-green-700">Projets actifs</h3>
                    <span className="text-sm text-gray-600">({activeProjects.length})</span>
                  </div>
                  <div className="space-y-4">{activeProjects.map(renderProjectCard)}</div>
                </div>
              )}

              <div className="border border-gray-200 rounded-2xl bg-white shadow-sm">
                <button
                  type="button"
                  onClick={toggleArchivedSection}
                  className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  {archivedOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <div className="flex-1">
                    <span className="font-semibold text-gray-700">Projets archivés</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {archivedLoaded ? archivedProjects.length : '\u2014'}
                  </span>
                </button>
                {archivedOpen && (
                  <div className="px-6 pb-6 space-y-4">
                    {archivedLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#328fce] mx-auto" />
                      </div>
                    ) : archivedProjects.length === 0 ? (
                      <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4">
                        Aucun projet archivé
                      </div>
                    ) : (
                      archivedProjects.map((project) => (
                        <div key={project.id} className="opacity-60">
                          {renderProjectCard(project)}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()
      )}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsConfirmOpen(false);
            setSelectedProject(null);
          }
        }}
        onConfirm={confirmDelete}
        title="Supprimer le projet"
        message={
          selectedProject
            ? `Confirmez-vous la suppression du projet « ${selectedProject.title} » ? Cette action retirera aussi les liens avec les animateur·rices.`
            : ''
        }
        isDangerous
        isLoading={isDeleting}
        confirmText="Supprimer"
      />
    </div>
  );
}


