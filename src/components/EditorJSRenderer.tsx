import { useEffect, useMemo, useState, useRef } from 'react';
import { OutputData } from '@editorjs/editorjs';
import { SafeHtml } from './SafeHtml';
import { AlertTriangle, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';
import { Link } from './Link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay as SwiperAutoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/autoplay';

interface EditorBlock {
  type: string;
  data: {
    text?: string;
    level?: number;
    items?: Array<{ content?: string; items?: unknown[]; meta?: unknown }> | { text: string; checked: boolean }[];
    style?: string;
    file?: { url: string };
    caption?: string;
    content?: string[][];
    title?: string;
    message?: string;
    type?: 'info' | 'success' | 'warning' | 'danger';
    counselorSlugs?: string[];
    volunteerSlugs?: string[];
    images?: { url: string; caption?: string; alt?: string }[];
    autoplay?: boolean;
  };
}

interface EditorJSRendererProps {
  content: OutputData | null;
  className?: string;
  enableToc?: boolean;
}

export function EditorJSRenderer({ content, className = '', enableToc = false }: EditorJSRendererProps) {
  if (!content || !content.blocks || content.blocks.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {content.blocks.map((blockData, index: number) => {
        const block = blockData as EditorBlock;

        if (block.type === 'paragraph' && block.data.text) {
          return (
            <SafeHtml
              key={index}
              as="p"
              className="mb-4 leading-relaxed"
              html={block.data.text}
            />
          );
        }

        if (block.type === 'header' && block.data.text) {
          const HeadingTag = `h${block.data.level || 2}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
          const isInToc = enableToc && block.data.level && block.data.level <= 3;
          const headerId = isInToc ? `heading-${index}` : undefined;
          
          return (
            <SafeHtml
              key={index}
              as={HeadingTag}
              id={headerId}
              className={`font-bold text-gray-800 mb-4 ${isInToc ? 'scroll-mt-24' : ''}`}
              html={block.data.text}
            />
          );
        }

        if (block.type === 'list' && block.data.items) {
          const ListTag = block.data.style === 'ordered' ? 'ol' : 'ul';
          return (
            <ListTag
              key={index}
              className={`mb-4 ${
                block.data.style === 'ordered' ? 'list-decimal' : 'list-disc'
              } list-inside space-y-2`}
            >
              {((block.data.items || []) as Array<{ content?: string } | string>).map((item, itemIndex: number) => {
                const content = typeof item === 'string' ? item : item.content || '';
                return (
                  <SafeHtml
                    key={itemIndex}
                    as="li"
                    html={content}
                  />
                );
              })}
            </ListTag>
          );
        }

        if (block.type === 'image' && block.data.file) {
          return (
            <div key={index} className="my-6">
              <img
                src={block.data.file.url}
                alt={block.data.caption || ''}
                className="rounded-lg shadow-md w-full h-auto"
              />
              {block.data.caption && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  {block.data.caption}
                </p>
              )}
            </div>
          );
        }

        if (block.type === 'quote') {
          const quoteText = block.data.text || '';
          return (
            <blockquote
              key={index}
              className="border-l-4 border-[#328fce] pl-4 py-2 my-6 italic bg-gray-50 rounded-r-lg"
            >
              <SafeHtml as="p" className="text-gray-700 mb-2" html={quoteText} />
              {block.data.caption && (
                <cite className="text-sm text-gray-600 not-italic">
                  — {block.data.caption}
                </cite>
              )}
            </blockquote>
          );
        }

        if (block.type === 'delimiter') {
          return (
            <div key={index} className="my-8 flex justify-center">
              <hr className="border-gray-200 border-t my-4 w-full" />
            </div>
          );
        }

        if (block.type === 'table' && block.data.content) {
          return (
            <div key={index} className="my-6 overflow-x-auto">
              <table className="min-w-full border border-gray-300 rounded-lg">
                <tbody>
                  {block.data.content.map((row: string[], rowIndex: number) => (
                    <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-100' : ''}>
                      {row.map((cell: string, cellIndex: number) => {
                        const CellTag = rowIndex === 0 ? 'th' : 'td';
                        return (
                          <CellTag
                            key={cellIndex}
                            className="border border-gray-300 px-4 py-2 text-left"
                          >
                            {cell}
                          </CellTag>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === 'warning') {
          return (
            <div
              key={index}
              className="my-6 border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded-r-lg"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  {block.data.title && (
                    <h4 className="font-bold text-yellow-900 mb-1">{block.data.title}</h4>
                  )}
                  <p className="text-yellow-800">{block.data.message}</p>
                </div>
              </div>
            </div>
          );
        }

        if (block.type === 'alert') {
          const alertType = block.data.type || 'info';
          const alertStyles = {
            info: {
              container: 'border-blue-500 bg-blue-50',
              title: 'text-blue-900',
              message: 'text-blue-800',
            },
            success: {
              container: 'border-green-500 bg-green-50',
              title: 'text-green-900',
              message: 'text-green-800',
            },
            warning: {
              container: 'border-yellow-500 bg-yellow-50',
              title: 'text-yellow-900',
              message: 'text-yellow-800',
            },
            danger: {
              container: 'border-red-500 bg-red-50',
              title: 'text-red-900',
              message: 'text-red-800',
            },
          };
          const style = alertStyles[alertType as keyof typeof alertStyles] || alertStyles.info;

          return (
            <div key={index} className={`my-6 border-l-4 ${style.container} p-4 rounded-r-lg`}>
              <div>
                {block.data.title && (
                  <h4 className={`font-bold ${style.title} mb-1`}>{block.data.title}</h4>
                )}
                <p className={style.message}>{block.data.message}</p>
              </div>
            </div>
          );
        }

        if (block.type === 'checklist' && block.data.items) {
          return (
            <ul key={index} className="mb-4 space-y-2">
              {(block.data.items as { text: string; checked: boolean }[]).map(
                (item, itemIndex: number) => (
                  <li key={itemIndex} className="flex items-start gap-2">
                    <span
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                        item.checked ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`}
                    >
                      {item.checked && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span
                      className={`text-gray-700 ${
                        item.checked ? 'line-through text-gray-500' : ''
                      }`}
                    >
                      {item.text}
                    </span>
                  </li>
                )
              )}
            </ul>
          );
        }

        if (block.type === 'anim-list') {
          const slugs = Array.isArray(block.data.counselorSlugs) ? block.data.counselorSlugs : [];
          return <AnimListBlock key={index} slugs={slugs} />;
        }

        if (block.type === 'volunteer-list') {
          const slugs = Array.isArray(block.data.volunteerSlugs) ? block.data.volunteerSlugs : [];
          return <VolunteerListBlock key={index} slugs={slugs} />;
        }

        if (block.type === 'carousel') {
          const images = Array.isArray(block.data.images) ? block.data.images : [];
          const autoplay = Boolean(block.data.autoplay);
          return <CarouselBlock key={index} images={images} autoplay={autoplay} />;
        }

        return null;
      })}
    </div>
  );
}

interface CounselorProjectPreview {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  cover_image_url: string | null;
}

interface CounselorPreview {
  slug: string;
  first_name: string;
  last_name: string | null;
  role_title: string | null;
  tagline: string | null;
  bio: string | null;
  photo_url: string | null;
  focus_areas: string[];
  projects: Array<{
    role: string | null;
    project: CounselorProjectPreview;
  }>;
}

type CounselorRow = Database['public']['Tables']['counselors']['Row'];
type ProjectRow = Database['public']['Tables']['projects']['Row'];

type CounselorWithProjectsRow = CounselorRow & {
  project_counselors?: Array<{
    role: string | null;
    project: ProjectRow | null;
  }>;
};

function AnimListBlock({ slugs }: { slugs: string[] }) {
  const normalizedSlugs = useMemo(() => Array.from(new Set(slugs)).filter(Boolean), [slugs]);
  const [counselors, setCounselors] = useState<CounselorPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchCounselors = async () => {
      if (normalizedSlugs.length === 0) {
        if (isMounted) {
          setCounselors([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('counselors')
          .select(`
            slug,
            first_name,
            last_name,
            role_title,
            tagline,
            bio,
            photo_url,
            focus_areas,
            project_counselors (
              role,
              project:projects (
                id,
                slug,
                title,
                short_description,
                cover_image_url,
                is_active
              )
            )
          `)
          .in('slug', normalizedSlugs)
          .order('first_name', { ascending: true });

        if (fetchError) throw fetchError;

        if (!isMounted) return;

        const rows = (data || []) as unknown as CounselorWithProjectsRow[];

        const parsed = rows.map((item) => {
          const projectLinks = Array.isArray(item.project_counselors) ? item.project_counselors : [];

          return {
            slug: item.slug,
            first_name: item.first_name,
            last_name: item.last_name,
            role_title: item.role_title,
            tagline: item.tagline,
            bio: item.bio,
            photo_url: item.photo_url,
            focus_areas: Array.isArray(item.focus_areas) ? item.focus_areas : [],
            projects: projectLinks
              .filter((link) => link.project && link.project.is_active)
              .map((link) => ({
                role: link.role ?? null,
                project: {
                  id: link.project!.id,
                  slug: link.project!.slug,
                  title: link.project!.title,
                  short_description: link.project!.short_description,
                  cover_image_url: link.project!.cover_image_url,
                },
              })),
          } as CounselorPreview;
        });

        parsed.sort(
          (a, b) => normalizedSlugs.indexOf(a.slug) - normalizedSlugs.indexOf(b.slug)
        );

        setCounselors(parsed);
      } catch (err) {
        console.error('Error fetching counselors for rendering:', err);
        if (isMounted) {
          setError('Impossible de charger les profils de l’équipe pour le moment.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCounselors();

    return () => {
      isMounted = false;
    };
  }, [normalizedSlugs]);

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 text-red-700 rounded-2xl p-4 text-sm">
        {error}
      </div>
    );
  }

  if (counselors.length === 0) {
    return (
      <div className="border border-gray-200 bg-white rounded-2xl p-6 text-gray-600 text-sm">
        Aucun profil d’animation à afficher pour le moment.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {counselors.map((counselor) => (
        <div
          key={counselor.slug}
          className="border border-gray-200 rounded-2xl p-6 shadow-sm bg-white"
        >
          <div className="flex flex-col md:flex-row gap-6">
            {counselor.photo_url ? (
              <img
                src={counselor.photo_url}
                alt={`${counselor.first_name} ${counselor.last_name || ''}`}
                className="w-full md:w-44 h-44 object-cover rounded-2xl shadow-md"
              />
            ) : (
              <div className="w-full md:w-44 h-44 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                Photo à venir
              </div>
            )}
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-2xl font-semibold text-gray-800">
                  {counselor.first_name} {counselor.last_name || ''}
                </h3>
                {counselor.role_title && (
                  <p className="text-[#328fce] font-medium">{counselor.role_title}</p>
                )}
                {counselor.tagline && (
                  <p className="text-gray-600 mt-1">{counselor.tagline}</p>
                )}
              </div>

              {counselor.focus_areas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {counselor.focus_areas.map((area) => (
                    <span
                      key={area}
                      className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full"
                    >
                      #{area}
                    </span>
                  ))}
                </div>
              )}

              {counselor.bio && (
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {counselor.bio}
                </p>
              )}

              {counselor.projects.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Projets associés
                  </p>
                  <div className="space-y-3">
                    {counselor.projects.map(({ project, role }) => (
                      <Link
                        key={project.id}
                        href={`/projets/${project.slug}`}
                        className="block group rounded-xl border border-gray-200 p-4 hover:border-[#328fce] hover:bg-[#328fce]/5 transition-all"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium text-gray-800 group-hover:text-[#328fce] transition-colors">
                              {project.title}
                            </p>
                            {project.short_description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {project.short_description}
                              </p>
                            )}
                          </div>
                          {role && (
                            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                              {role}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type VolunteerRow = Database['public']['Tables']['volunteers']['Row'];
type CommissionRow = Database['public']['Tables']['commissions']['Row'];

type VolunteerWithCommissionsRow = VolunteerRow & {
  commission_volunteers?: Array<{
    commission: CommissionRow | null;
  }>;
};

interface VolunteerCommissionPreview {
  id: string;
  slug: string;
  title: string;
  is_active: boolean;
}

interface VolunteerPreview {
  slug: string;
  first_name: string;
  last_name: string | null;
  role_title: string | null;
  bio: string | null;
  photo_url: string | null;
  is_executive_member: boolean;
  is_board_member: boolean;
  mandate_start_date: string | null;
  is_active: boolean;
  commissions: VolunteerCommissionPreview[];
}

function formatMandateDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
}

function VolunteerListBlock({ slugs }: { slugs: string[] }) {
  const normalizedSlugs = useMemo(() => Array.from(new Set(slugs)).filter(Boolean), [slugs]);
  const [volunteers, setVolunteers] = useState<VolunteerPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchVolunteers = async () => {
      if (normalizedSlugs.length === 0) {
        if (isMounted) {
          setVolunteers([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('volunteers')
          .select(`
            slug,
            first_name,
            last_name,
            role_title,
            bio,
            photo_url,
            is_executive_member,
            is_board_member,
            mandate_start_date,
            is_active,
            commission_volunteers (
              commission:commissions (
                id,
                slug,
                title,
                is_active
              )
            )
          `)
          .in('slug', normalizedSlugs)
          .order('first_name', { ascending: true });

        if (fetchError) throw fetchError;
        if (!isMounted) return;

        const rows = (data || []) as unknown as VolunteerWithCommissionsRow[];

        const parsed = rows.map((item) => {
          const commissionLinks = Array.isArray(item.commission_volunteers) ? item.commission_volunteers : [];
          return {
            slug: item.slug,
            first_name: item.first_name,
            last_name: item.last_name,
            role_title: item.role_title,
            bio: item.bio,
            photo_url: item.photo_url,
            is_executive_member: Boolean(item.is_executive_member),
            is_board_member: Boolean(item.is_board_member),
            mandate_start_date: item.mandate_start_date,
            is_active: item.is_active,
            commissions: commissionLinks
              .map((link) => link.commission)
              .filter((commission): commission is CommissionRow => Boolean(commission))
              .map((commission) => ({
                id: commission.id,
                slug: commission.slug,
                title: commission.title,
                is_active: commission.is_active,
              })),
          } as VolunteerPreview;
        });

        parsed.sort(
          (a, b) => normalizedSlugs.indexOf(a.slug) - normalizedSlugs.indexOf(b.slug)
        );

        setVolunteers(parsed);
      } catch (err) {
        console.error('Error fetching volunteers for rendering:', err);
        if (isMounted) {
          setError('Impossible de charger les profils des bénévoles pour le moment.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchVolunteers();

    return () => {
      isMounted = false;
    };
  }, [normalizedSlugs]);

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 text-red-700 rounded-2xl p-4 text-sm">
        {error}
      </div>
    );
  }

  if (volunteers.length === 0) {
    return (
      <div className="border border-gray-200 bg-white rounded-2xl p-6 text-gray-600 text-sm">
        Aucun profil bénévole à afficher pour le moment.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {volunteers.map((volunteer) => {
        const mandateDate = formatMandateDate(volunteer.mandate_start_date);
        const activeCommissions = volunteer.commissions.filter((commission) => commission.is_active);
        const inactiveCommissions = volunteer.commissions.filter((commission) => !commission.is_active);

        return (
          <div
            key={volunteer.slug}
            className="border border-gray-200 rounded-2xl p-6 shadow-sm bg-white"
          >
            <div className="flex flex-col md:flex-row gap-6">
              {volunteer.photo_url ? (
                <img
                  src={volunteer.photo_url}
                  alt={`${volunteer.first_name} ${volunteer.last_name || ''}`}
                  className="w-full md:w-44 h-44 object-cover rounded-2xl shadow-md"
                />
              ) : (
                <div className="w-full md:w-44 h-44 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                  Photo à venir
                </div>
              )}

              <div className="flex-1 space-y-3">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-semibold text-gray-800">
                      {volunteer.first_name} {volunteer.last_name || ''}
                    </h3>
                    {!volunteer.is_active && (
                      <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded-full">
                        Inactif·ve
                      </span>
                    )}
                    {volunteer.is_executive_member && (
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                        Bureau
                      </span>
                    )}
                    {volunteer.is_board_member && (
                      <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                        Conseil d’administration
                      </span>
                    )}
                  </div>
                  {volunteer.role_title && (
                    <p className="text-[#328fce] font-medium">{volunteer.role_title}</p>
                  )}
                  {mandateDate && (
                    <p className="text-xs text-gray-500">
                      En mandat depuis {mandateDate}
                    </p>
                  )}
                </div>

                {volunteer.bio && (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {volunteer.bio}
                  </p>
                )}

                {volunteer.commissions.length > 0 && (
                  <div className="border-t border-gray-100 pt-4 space-y-2">
                    <p className="text-sm font-semibold text-gray-700">
                      Commissions associées
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activeCommissions.map((commission) => (
                        <span
                          key={commission.id}
                          className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full"
                        >
                          {commission.title}
                        </span>
                      ))}
                      {inactiveCommissions.map((commission) => (
                        <span
                          key={commission.id}
                          className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full"
                        >
                          {commission.title} (inactif)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface CarouselImageData {
  url: string;
  caption?: string;
  alt?: string;
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}

function CarouselBlock({ images, autoplay }: { images: CarouselImageData[]; autoplay: boolean }) {
  const validImages = images.filter((image) => image && typeof image.url === 'string' && image.url.length > 0);
  const isMobile = useIsMobile();
  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);

  if (validImages.length === 0) {
    return null;
  }

  const modules = [Navigation, Pagination, SwiperAutoplay];

  return (
    <div className="my-8">
      <div className="relative">
        {!isMobile && validImages.length > 1 && (
          <>
            <button
              ref={prevRef}
              type="button"
              className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-gray-700 shadow-lg rounded-full p-3 transition-colors"
              aria-label="Image précédente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              ref={nextRef}
              type="button"
              className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-gray-700 shadow-lg rounded-full p-3 transition-colors"
              aria-label="Image suivante"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        <Swiper
          modules={modules}
          slidesPerView={1}
          loop={validImages.length > 1}
          pagination={validImages.length > 1 ? { clickable: true, dynamicBullets: true } : false}
          navigation={validImages.length > 1 && !isMobile ? { prevEl: prevRef.current, nextEl: nextRef.current } : false}
          autoplay={autoplay ? { delay: 4000, disableOnInteraction: false } : false}
          onInit={(swiper) => {
            if (!isMobile && validImages.length > 1) {
              const navigation = swiper.params.navigation;
              if (navigation && typeof navigation !== 'boolean') {
                navigation.prevEl = prevRef.current;
                navigation.nextEl = nextRef.current;
                swiper.navigation.init();
                swiper.navigation.update();
              }
            }
            if (autoplay && swiper.autoplay) {
              swiper.autoplay.start();
            }
          }}
          className="rounded-2xl overflow-hidden shadow-lg"
        >
          {validImages.map((image, idx) => (
            <SwiperSlide key={idx}>
              <figure className="relative">
                <img
                  src={image.url}
                  alt={image.alt || image.caption || `Image ${idx + 1}`}
                  className="w-full h-auto object-cover"
                />
                {(image.caption || image.alt) && (
                  <figcaption className="absolute bottom-0 left-0 right-0 bg-black/55 text-white text-sm px-4 py-3">
                    {image.caption || image.alt}
                  </figcaption>
                )}
              </figure>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}


