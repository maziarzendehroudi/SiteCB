import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import { getPageContent } from './services/contentService';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import './index.css';

export default function App() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSlug, setCurrentSlug] = useState('home');
  const [isAdminView, setIsAdminView] = useState(false);
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('github_token') || '');

  useEffect(() => {
    // Si on est en vue admin, on ne charge pas les pages publiques
    if (isAdminView) return;

    async function load() {
      setLoading(true);
      try {
        const data = await getPageContent(currentSlug);
        setPageData(data);
      } catch (e) {
        console.error("Erreur de chargement de la page :", e);
        setPageData({ meta: { title: "Erreur" }, content: "# Page introuvable\n\nLe contenu demandé n'existe pas encore." });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentSlug, isAdminView]);

  const navLinks = [
    { label: 'Accueil', slug: 'home' },
    { label: 'Pour qui ?', slug: 'pour-qui' },
    { label: 'Où me trouver ?', slug: 'contact' },
    { label: 'A propos', slug: 'a-propos' },
    { label: 'Cadre et tarifs', slug: 'cadre-et-tarifs' },
    { label: 'Blog', slug: 'blog' },
  ];

  const handleLogin = (token) => {
    localStorage.setItem('github_token', token);
    setGithubToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('github_token');
    setGithubToken('');
  };

  // Si l'utilisateur a cliqué sur le lien Admin dans le footer
  if (isAdminView) {
    return (
      <div className="site-wrapper" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Administration du Site</h1>
          <button 
            onClick={() => setIsAdminView(false)}
            style={{ padding: '0.5rem 1rem', cursor: 'pointer', background: '#333', color: '#fff', border: 'none', borderRadius: '4px' }}
          >
            ← Retour au site public
          </button>
        </div>

        {!githubToken ? (
          <AdminLogin onLogin={handleLogin} />
        ) : (
          <AdminDashboard token={githubToken} onLogout={handleLogout} />
        )}
      </div>
    );
  }

  return (
    <div className="site-wrapper">
      <header>
        <div className="header-top">
          <div className="header-brand">
            <div className="site-title">Camille Bongue</div>
            <p className="subtitle">Psychothérapeute</p>
            <p className="subtitle">Psychanalyste</p>
          </div>
          <div className="header-info">
            <p>Centre médical Adamantium</p>
            <p>Cap Alpha, Clapiers</p>
            <p>07 68 99 07 07</p>
          </div>
        </div>
        <nav className="navbar">
          <ul className="nav-menu" style={{ display: 'flex', listStyle: 'none', gap: '1.5rem', padding: 0, cursor: 'pointer' }}>
            {navLinks.map((link) => (
              <li key={link.slug}>
                <a 
                  onClick={(e) => { e.preventDefault(); setCurrentSlug(link.slug); }}
                  style={{ 
                    color: currentSlug === link.slug ? 'var(--wix-nav-active, #4CAF50)' : 'inherit', 
                    textDecoration: 'none',
                    fontWeight: currentSlug === link.slug ? 'bold' : 'normal'
                  }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main>
        <section className="text-section" style={{ padding: '4rem 0' }}>
          <div className="container">
            {loading ? (
              <p>Chargement en cours...</p>
            ) : (
              pageData && (
                <div 
                  className="markdown-content" 
                  dangerouslySetInnerHTML={{ __html: marked.parse(pageData.content) }} 
                />
              )
            )}
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-container" style={{ padding: '2rem 0', textAlign: 'center', borderTop: '1px solid #eee', fontSize: '0.9rem', color: '#666' }}>
          <div>Camille Bongue - Psychothérapeute - Psychanalyste - 07 68 99 07 07</div>
          <div style={{ marginTop: '1rem' }}>
            <a 
              href="#admin" 
              onClick={(e) => { e.preventDefault(); setIsAdminView(true); }}
              style={{ color: '#999', textDecoration: 'none', fontSize: '0.8rem' }}
            >
              Accès Administrateur (CMS)
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}