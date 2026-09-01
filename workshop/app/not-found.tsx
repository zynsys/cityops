import Link from 'next/link';

export default function NotFound(): React.JSX.Element {
  return (
    <main className="module-page">
      <div className="container">
        <section className="module-hero">
          <span className="module-eyebrow">404</span>
          <h1>Workshop page not found</h1>
          <p className="module-description">The requested track, module, or lesson does not exist.</p>
          <Link className="btn btn-primary" href="/">
            Return to workshop
          </Link>
        </section>
      </div>
    </main>
  );
}
