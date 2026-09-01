import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { KeyboardNavigation } from '@/components/KeyboardNavigation';
import { LessonContent } from '@/components/LessonContent';
import { ThemeToggle } from '@/components/ThemeToggle';
import { withBasePath } from '@/lib/base-path';
import { renderMarkdown } from '@/lib/render-markdown';
import { findLesson, workshop } from '@/lib/workshop-data';

interface LessonPageProps {
  readonly params: Promise<{ lessonId: string }>;
}

export const dynamicParams = false;
export function generateStaticParams(): { lessonId: string }[] {
  return workshop.lessons.map((lesson) => ({ lessonId: lesson.id }));
}
export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const lesson = findLesson((await params).lessonId);
  if (!lesson) return {};
  return { title: `${lesson.title} — ${workshop.title}`, description: lesson.description };
}

export default async function LessonPage({ params }: LessonPageProps): Promise<React.JSX.Element> {
  const lesson = findLesson((await params).lessonId);
  if (!lesson) notFound();
  const { module, previousLesson: previous, nextLesson: next } = lesson;
  const previousLabel =
    previous?.module.id !== module.id ? `Previous module: ${previous?.module.title}` : previous?.title;
  const nextLabel = next?.module.id !== module.id ? `Next module: ${next?.module.title}` : next?.title;
  return (
    <>
      <KeyboardNavigation previousUrl={previous?.url ?? null} nextUrl={next?.url ?? null} />
      <header className="header">
        <div className="header-content">
          <Link href="/#tracks" className="header-brand">
            <span className="brand-icon" aria-hidden="true">
              <img className="cityops-logo" src={withBasePath('/assets/logos/cityops.png')} alt="" />
            </span>
            <span className="header-title">{workshop.title}</span>
          </Link>
          <div className="header-nav">
            <ThemeToggle />
            {previous ? (
              <Link className="nav-btn" href={previous.url}>
                ← Prev
              </Link>
            ) : (
              <span className="nav-btn disabled" aria-disabled="true">
                ← Prev
              </span>
            )}
            {next ? (
              <Link className="nav-btn" href={next.url}>
                Next →
              </Link>
            ) : (
              <span className="nav-btn disabled" aria-disabled="true">
                Next →
              </span>
            )}
          </div>
        </div>
      </header>
      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-title">
              {module.track.name} · Module {module.moduleIndex + 1} of {module.track.modules.length}
            </div>
            <nav>
              <div className="sidebar-group">
                <Link className="sidebar-module-link" href={module.url}>
                  {module.title}
                </Link>
                {module.lessons.map((candidate, index) => (
                  <Link
                    href={candidate.url}
                    className={`step-link ${candidate.id === lesson.id ? 'active' : ''}`}
                    key={candidate.id}
                  >
                    <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
                    <span>{candidate.title}</span>
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </aside>
        <main className="main">
          <div className="content">
            <LessonContent html={renderMarkdown(lesson)} />
            <nav className="nav-footer" aria-label="Lesson navigation">
              {previous ? (
                <Link href={previous.url} className="nav-footer-btn">
                  ← {previousLabel}
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link href={next.url} className="nav-footer-btn">
                  {nextLabel} →
                </Link>
              ) : (
                <Link href="/#tracks" className="nav-footer-btn">
                  Track complete →
                </Link>
              )}
            </nav>
          </div>
        </main>
      </div>
    </>
  );
}
