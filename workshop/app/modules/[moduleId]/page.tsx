import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { withBasePath } from '@/lib/base-path';
import { findModule, workshop } from '@/lib/workshop-data';

interface ModulePageProps {
  readonly params: Promise<{ moduleId: string }>;
}

export const dynamicParams = false;
export function generateStaticParams(): { moduleId: string }[] {
  return workshop.modules.map((entry) => ({ moduleId: entry.id }));
}
export async function generateMetadata({ params }: ModulePageProps): Promise<Metadata> {
  const workshopModule = findModule((await params).moduleId);
  if (!workshopModule) return {};
  return { title: `${workshopModule.title} — ${workshop.title}`, description: workshopModule.description };
}

export default async function ModulePage({ params }: ModulePageProps): Promise<React.JSX.Element> {
  const workshopModule = findModule((await params).moduleId);
  if (!workshopModule) notFound();
  const { track } = workshopModule;
  return (
    <>
      <div className="module-toolbar">
        <Link href={track.url} className="module-home-link">
          ← All {track.name} modules
        </Link>
        <ThemeToggle />
      </div>
      <main className="module-page">
        <div className="container">
          <header className="module-hero">
            <span className="module-hero-icon" aria-hidden="true">
              <img className={`platform-logo platform-logo-${track.id}`} src={withBasePath(track.logoUrl)} alt="" />
            </span>
            <span className="module-eyebrow">
              {track.name} track · Module {workshopModule.moduleIndex + 1} of {track.modules.length}
            </span>
            <h1>{workshopModule.title}</h1>
            <p className="module-summary">{workshopModule.summary}</p>
            <p className="module-description">{workshopModule.description}</p>
            <Link className="btn btn-primary" href={workshopModule.lessons[0]?.url ?? track.url}>
              {workshopModule.lessons[0]?.preview ? 'View curriculum preview' : 'Start module'} →
            </Link>
          </header>
          <section className="module-lessons" aria-labelledby="lessonsTitle">
            <div className="module-section-heading">
              <div>
                <span className="module-eyebrow">Workshop content</span>
                <h2 id="lessonsTitle">Module lessons</h2>
              </div>
              <span className="module-lesson-total">{workshopModule.lessons.length} lessons</span>
            </div>
            <ol className="module-lesson-list">
              {workshopModule.lessons.map((lesson, index) => (
                <li key={lesson.id}>
                  <Link className="module-lesson-card" href={lesson.url}>
                    <span className="module-lesson-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="module-lesson-copy">
                      <strong>{lesson.title}</strong>
                      <span>{lesson.description}</span>
                    </span>
                    <span className="module-lesson-duration">{lesson.duration}</span>
                  </Link>
                </li>
              ))}
            </ol>
            <nav className="module-sequence-nav" aria-label="Track module navigation">
              {workshopModule.previousModule ? (
                <Link className="module-sequence-link" href={workshopModule.previousModule.url}>
                  <span>← Previous module</span>
                  <strong>{workshopModule.previousModule.title}</strong>
                </Link>
              ) : (
                <span />
              )}
              {workshopModule.nextModule ? (
                <Link className="module-sequence-link module-sequence-link-next" href={workshopModule.nextModule.url}>
                  <span>Next module →</span>
                  <strong>{workshopModule.nextModule.title}</strong>
                </Link>
              ) : (
                <Link className="module-sequence-link module-sequence-link-next" href="/#tracks">
                  <span>Track complete</span>
                  <strong>Choose another platform →</strong>
                </Link>
              )}
            </nav>
          </section>
        </div>
      </main>
    </>
  );
}
