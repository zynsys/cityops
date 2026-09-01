import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { withBasePath } from '@/lib/base-path';
import { workshop } from '@/lib/workshop-data';

const prerequisites = [
  {
    logos: ['github', 'azure-devops'],
    title: 'Platform account',
    copy: 'GitHub or Azure DevOps access for your selected track',
  },
  { logos: ['vscode'], title: 'Visual Studio Code', copy: 'With the GitHub Copilot extension' },
  { logos: ['nodejs'], title: 'Node.js 20+', copy: 'Installed and available in your terminal' },
  { logos: ['git'], title: 'Git', copy: 'Installed and configured for source control' },
  { logos: ['powershell'], title: 'Terminal basics', copy: 'Comfortable navigating folders and running commands' },
  { logos: ['docker'], title: 'Docker Desktop', copy: 'For PostgreSQL, PostGIS, and Mailpit' },
  { logos: ['typescript'], title: 'Development knowledge', copy: 'Basic familiarity with TypeScript and SQL' },
  { logos: ['azure'], title: 'Azure account', copy: 'Access for cloud deployment exercises' },
  { logos: ['azure'], title: 'Azure OpenAI', copy: 'A vision-capable model such as GPT-4o' },
] as const;

export default function HomePage(): React.JSX.Element {
  return (
    <>
      <div className="theme-floating">
        <ThemeToggle />
      </div>
      <section className="hero">
        <div className="container">
          <div className="hero-badge">
            <img className="cityops-logo" src={withBasePath('/assets/logos/cityops.png')} alt="" /> Built on a Real
            Full-Stack Project
          </div>
          <h1>{workshop.title}</h1>
          <p className="hero-subtitle">
            Choose GitHub or Azure DevOps, then follow a focused journey from planning and development to secure
            delivery and operations—using CityOps, a production-grade civic reporting platform.
          </p>
          <div className="hero-cta">
            <Link href="#tracks" className="btn btn-primary">
              Choose Your Platform →
            </Link>
            <a href={workshop.repositoryUrl} className="btn btn-secondary" target="_blank" rel="noopener noreferrer">
              ⭐ GitHub Repo
            </a>
          </div>
          <div className="stats" aria-label="Workshop overview">
            <div className="stat">
              <div className="stat-value">1</div>
              <div className="stat-label">Real-world app</div>
            </div>
            <div className="stat">
              <div className="stat-value">{workshop.tracks.length}</div>
              <div className="stat-label">Platform tracks</div>
            </div>
            <div className="stat">
              <div className="stat-value">{workshop.modules.length}</div>
              <div className="stat-label">Modules</div>
            </div>
          </div>
        </div>
      </section>
      <section className="features" id="tracks">
        <div className="container">
          <h2 className="section-title">Choose Your Platform</h2>
          <p className="section-subtitle module-section-intro">
            Each track is self-contained and follows its own modules in sequence. You can return here to change
            platforms without mixing their lessons.
          </p>
          <div className="track-grid">
            {workshop.tracks.map((track) => (
              <Link className={`track-card track-card-${track.id}`} href={track.url} key={track.id}>
                <span className="track-card-icon" aria-hidden="true">
                  <img className={`platform-logo platform-logo-${track.id}`} src={withBasePath(track.logoUrl)} alt="" />
                </span>
                <span className="module-card-badge">{track.modules.length}-module track</span>
                <span className="module-card-title">{track.name}</span>
                <span className="module-card-description">{track.description}</span>
                <span className="module-card-meta">
                  <span className="module-card-tag">{track.status}</span>
                  <span className="module-card-tag">Sequential</span>
                </span>
                <span className="track-card-action">
                  View {track.name} modules <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="prereqs">
        <div className="container">
          <h2 className="section-title">Prerequisites</h2>
          <div className="prereqs-grid">
            {prerequisites.map((item) => (
              <div className="prereq-item" key={item.title}>
                <span className={`prereq-icon${item.logos.length > 1 ? ' prereq-icon-pair' : ''}`} aria-hidden="true">
                  {item.logos.map((logo) => (
                    <img
                      className={`prereq-logo${logo === 'github' ? ' prereq-logo-github' : ''}`}
                      src={withBasePath(`/assets/logos/${logo}.svg`)}
                      alt=""
                      key={logo}
                    />
                  ))}
                </span>
                <span className="prereq-content">
                  <strong>{item.title}</strong>
                  <span>{item.copy}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <footer>
        <div className="container">
          <div className="footer-links">
            <a href={workshop.repositoryUrl} target="_blank" rel="noopener noreferrer">
              GitHub Repository
            </a>
            <a href="https://code.visualstudio.com/docs/copilot/overview" target="_blank" rel="noopener noreferrer">
              Copilot Docs
            </a>
            <a href="https://github.com/github/awesome-copilot" target="_blank" rel="noopener noreferrer">
              Awesome Copilot
            </a>
          </div>
          <p className="footer-credit">Built with 💜 for AI-powered DevOps using the CityOps project</p>
        </div>
      </footer>
    </>
  );
}
