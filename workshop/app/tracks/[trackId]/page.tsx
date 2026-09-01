import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { withBasePath } from '@/lib/base-path';
import { findTrack, workshop } from '@/lib/workshop-data';

interface TrackPageProps {
  readonly params: Promise<{ trackId: string }>;
}

export const dynamicParams = false;
export function generateStaticParams(): { trackId: string }[] {
  return workshop.tracks.map((track) => ({ trackId: track.id }));
}
export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  const track = findTrack((await params).trackId);
  if (!track) return {};
  return { title: `${track.name} Track — ${workshop.title}`, description: track.description };
}

export default async function TrackPage({ params }: TrackPageProps): Promise<React.JSX.Element> {
  const track = findTrack((await params).trackId);
  if (!track) notFound();
  return (
    <>
      <div className="module-toolbar">
        <Link href="/#tracks" className="module-home-link">
          ← Change platform
        </Link>
        <ThemeToggle />
      </div>
      <main className="module-page">
        <div className="container">
          <header className="module-hero">
            <span className="module-hero-icon" aria-hidden="true">
              <img className={`platform-logo platform-logo-${track.id}`} src={withBasePath(track.logoUrl)} alt="" />
            </span>
            <span className="module-eyebrow">{track.name} track</span>
            <h1>{track.name} modules</h1>
            <p className="module-summary">{track.description}</p>
            <p className="module-description">
              Work through these {track.modules.length} modules in order. Select a module to review its lessons and
              start learning.
            </p>
            <Link className="btn btn-primary" href={track.firstModuleUrl}>
              Start with module 1 →
            </Link>
          </header>
          <section className="module-lessons" aria-labelledby="modulesTitle">
            <div className="module-section-heading">
              <div>
                <span className="module-eyebrow">Track curriculum</span>
                <h2 id="modulesTitle">All modules</h2>
              </div>
              <span className="module-lesson-total">{track.modules.length} modules</span>
            </div>
            <div className="module-grid">
              {track.modules.map((module) => (
                <Link className="module-card" href={module.url} key={module.id}>
                  <span className="module-card-logo" aria-hidden="true">
                    <img
                      className={`platform-logo platform-logo-${track.id}`}
                      src={withBasePath(track.logoUrl)}
                      alt=""
                    />
                  </span>
                  <span className="module-card-badge">
                    Module {module.sequence} of {track.modules.length}
                  </span>
                  <span className="module-card-title">{module.title}</span>
                  <span className="module-card-description">{module.summary}</span>
                  <span className="module-card-meta">
                    <span className="module-card-tag">
                      {module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}
                    </span>
                    <span className="module-card-tag">
                      {module.lessons.some((lesson) => lesson.preview) ? 'Preview' : 'Hands-on'}
                    </span>
                  </span>
                  <span className="module-card-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
