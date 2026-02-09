import { useAuth, type UserRole } from '../../contexts/AuthContext';
import type { ReactNode } from 'react';
import { FileText, Settings, Lightbulb, Users, Sparkles, HandHeart, Layers, UserCircle, Newspaper } from 'lucide-react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router';
import { PagesManager } from './PagesManager';
import { PageEditor } from './PageEditor';
import { SettingsManager } from './SettingsManager';
import { HighlightsManager } from './HighlightsManager';
import { CounselorsManager } from './CounselorsManager';
import { CounselorEditor } from './CounselorEditor';
import { ProjectsManager } from './ProjectsManager';
import { ProjectEditor } from './ProjectEditor';
import { VolunteersManager } from './VolunteersManager';
import { VolunteerEditor } from './VolunteerEditor';
import { CommissionsManager } from './CommissionsManager';
import { CommissionEditor } from './CommissionEditor';
import { UsersManager } from './UsersManager';
import { UserEditor } from './UserEditor';
import { NewsManager } from './NewsManager';
import { NewsEditor } from './NewsEditor';

export function AdminDashboard() {
  const { user, isAdmin, isEditor, roles } = useAuth();
  const location = useLocation();

  const hasRequiredRole = (requiredRoles: UserRole[]) =>
    requiredRoles.length === 0 || requiredRoles.some((role) => roles.includes(role));

  const canAccessAdmin = isAdmin || isEditor;

  if (!user || !canAccessAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Accès non autorisé</h1>
          <p className="text-gray-600">
            Vous devez disposer d’un rôle autorisé pour accéder à l’administration.
          </p>
        </div>
      </div>
    );
  }

  const isPageRoute = location.pathname.startsWith('/admin/pages');
  const isSettingsRoute = location.pathname.startsWith('/admin/settings');
  const isCounselorsRoute = location.pathname.startsWith('/admin/anims');
  const isProjectsRoute = location.pathname.startsWith('/admin/projects');
  const isVolunteersRoute = location.pathname.startsWith('/admin/volunteers');
  const isCommissionsRoute = location.pathname.startsWith('/admin/commissions');
  const isHighlightsRoute = location.pathname.startsWith('/admin/highlights');
  const isUsersRoute = location.pathname.startsWith('/admin/users');
  const isNewsRoute = location.pathname.startsWith('/admin/news');

  const navigationItems: Array<{
    label: string;
    to: string;
  icon: ReactNode;
    isActive: boolean;
    allowedRoles: UserRole[];
  }> = [
    {
      label: 'Pages',
      to: '/admin/pages',
      icon: <FileText className="w-5 h-5" />,
      isActive: isPageRoute,
      allowedRoles: ['admin', 'editor'],
    },
    {
      label: 'Utilisateurs',
      to: '/admin/users',
      icon: <UserCircle className="w-5 h-5" />,
      isActive: isUsersRoute,
      allowedRoles: ['admin'],
    },
    {
      label: 'Anims',
      to: '/admin/anims',
      icon: <Users className="w-5 h-5" />,
      isActive: isCounselorsRoute,
      allowedRoles: ['admin', 'editor'],
    },
    {
      label: 'Bénévoles',
      to: '/admin/volunteers',
      icon: <HandHeart className="w-5 h-5" />,
      isActive: isVolunteersRoute,
      allowedRoles: ['admin', 'editor'],
    },
    {
      label: 'Projets',
      to: '/admin/projects',
      icon: <Sparkles className="w-5 h-5" />,
      isActive: isProjectsRoute,
      allowedRoles: ['admin', 'editor'],
    },
    {
      label: 'Commissions',
      to: '/admin/commissions',
      icon: <Layers className="w-5 h-5" />,
      isActive: isCommissionsRoute,
      allowedRoles: ['admin', 'editor'],
    },
    {
      label: 'Infos importantes',
      to: '/admin/highlights',
      icon: <Lightbulb className="w-5 h-5" />,
      isActive: isHighlightsRoute,
      allowedRoles: ['admin', 'editor'],
    },
    {
      label: 'Actualités',
      to: '/admin/news',
      icon: <Newspaper className="w-5 h-5" />,
      isActive: isNewsRoute,
      allowedRoles: ['admin', 'editor'],
    },
    {
      label: 'Paramètres',
      to: '/admin/settings',
      icon: <Settings className="w-5 h-5" />,
      isActive: isSettingsRoute,
      allowedRoles: ['admin'],
    },
  ];

  const filteredNavigation = navigationItems.filter((item) => hasRequiredRole(item.allowedRoles));

  const UnauthorizedSection = () => (
    <div className="min-h-[200px] flex items-center justify-center">
      <div className="bg-white border border-orange-200 text-orange-700 rounded-2xl px-6 py-6 max-w-lg text-center shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Accès restreint</h2>
        <p className="text-sm text-orange-600">
          Vous n’avez pas les permissions nécessaires pour consulter cette section. Contactez un administrateur si vous pensez qu’il s’agit d’une erreur.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEF5F0] to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Administration</h1>
          <p className="text-gray-600">Gérez le contenu de votre site</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                    item.isActive
                      ? 'border-b-2 border-[#328fce] text-[#328fce] bg-blue-50'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="p-6">
            <Routes>
              <Route index element={<Navigate to="/admin/pages" replace />} />
              <Route path="pages" element={<PagesManager />} />
              <Route path="pages/new" element={<PageEditor page={null} />} />
              <Route path="pages/:id/edit" element={<PageEditor />} />
              <Route
                path="users"
                element={hasRequiredRole(['admin']) ? <UsersManager /> : <UnauthorizedSection />}
              />
              <Route
                path="users/:id/edit"
                element={hasRequiredRole(['admin']) ? <UserEditor /> : <UnauthorizedSection />}
              />
              <Route path="anims" element={<CounselorsManager />} />
              <Route path="anims/new" element={<CounselorEditor />} />
              <Route path="anims/:id/edit" element={<CounselorEditor />} />
              <Route path="volunteers" element={<VolunteersManager />} />
              <Route path="volunteers/new" element={<VolunteerEditor />} />
              <Route path="volunteers/:id/edit" element={<VolunteerEditor />} />
              <Route path="projects" element={<ProjectsManager />} />
              <Route path="projects/new" element={<ProjectEditor />} />
              <Route path="projects/:id/edit" element={<ProjectEditor />} />
              <Route path="commissions" element={<CommissionsManager />} />
              <Route path="commissions/new" element={<CommissionEditor />} />
              <Route path="commissions/:id/edit" element={<CommissionEditor />} />
              <Route path="highlights" element={<HighlightsManager />} />
              <Route path="news" element={<NewsManager />} />
              <Route path="news/new" element={<NewsEditor />} />
              <Route path="news/:id/edit" element={<NewsEditor />} />
              <Route
                path="settings"
                element={hasRequiredRole(['admin']) ? <SettingsManager /> : <UnauthorizedSection />}
              />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}
