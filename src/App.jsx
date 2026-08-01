import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import { getPageContent, getGlobalSettings, DEFAULT_SETTINGS } from './services/contentService';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import PageEditor from './components/PageEditor';
import BlogManager from './components/BlogManager';
import './index.css';

marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false,
});

export default function App() {
  const [pageData, setPageData] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [currentSlug, setCurrentSlug] = useState('home');
  const [isAdminView, setIsAdminView] = useState(false);
  const [adminSubView, setAdminSubView] = useState('dashboard');
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('github_token') || sessionStorage.getItem('github_admin_token') || '');

  // Chargement des données globales (Header, Menu, Footer)
  useEffect(() => {
    async function loadSettings() {
      const data = await getGlobalSettings();
      setSettings(data);
    }
    loadSettings();
  }, [isAdminView]);

  // Chargement du contenu de la page
  useEffect(() => {
    if (isAdminView) return;

    async function load() {
      setLoading(true);
      try {
        const data = await getPageContent(currentSlug);
        
        let processedContent = data.content;
        if (processedContent) {
          const baseUrl = import.meta.env.BASE_URL || '/';
          const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
          
          processedContent = processedContent
            .replace(/src="assets\/img\//g, `src="${base}assets/img/`)
            .replace(/src='assets\/img\//g, `src='${base}assets/img/`)
            .replace(/src="\/assets\/img\//g, `src="${base}assets/img/`)
            .replace(/url\('assets\/img\//g, `url('${base}assets/img/`)
            .replace(/url\("assets\/img\//g, `url("${base}assets/img/`)
            .replace(/url\(assets\/img\//g, `url(${base}assets/img/`);
        }

        setPageData({ ...data, content: processedContent });
      } catch (e) {
        console.error("Erreur de chargement de la page :", e);
        setPageData({ 
          meta: { title: "Erreur" }, 
          content: "<section class='text-section'><div class='container'><h1>Page introuvable</h1><p>Le contenu demandé n'existe pas encore.</p></div></section>" 
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentSlug, isAdminView]);

  const handleContentClick = (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href) return;

    if (href.endsWith('.html')) {
      e.preventDefault();
      const slug = href.replace('.html', '');
      setCurrentSlug(slug);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogin = (token) => {
    localStorage.setItem('github_token', token);
    sessionStorage.setItem('github_admin_token', token);
    setGithubToken(token);
    setAdminSubView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('github_token');
    sessionStorage.removeItem('github_admin_token');
    setGithubToken('');
    setIsAdminView(false);
    setAdminSubView('dashboard');
  };

  if (isAdminView) {
    return (
      <div className="site-wrapper" style={{ minHeight: '100vh', backgroundColor: '#fcfbf9' }}>
        
        {/* Le Header natif noir a été supprimé ici car PageEditor utilise son propre menu flottant désormais */}
        {adminSubView === 'dashboard' && (
          <div style={{ padding: '1rem 2rem', background: '#fff', borderBottom: '1px solid #e6e2dd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 400, color: '#4a4a4a' }}>Administration du Site</h1>
            <button 
              onClick={() => { setIsAdminView(false); setAdminSubView('dashboard'); }}
              style={{ padding: '0.5rem 1rem', cursor: 'pointer', background: '#A3B1A9', color: '#fff', border: 'none', borderRadius: '2px', fontSize: '0.9rem' }}
            >
              ← Retour au site public
            </button>
          </div>
        )}

        {!githubToken ? (
          <div style={{ padding: '3rem', maxWidth: '500px', margin: '0 auto', textAlign: 'left' }}>
            <AdminLogin onLogin={handleLogin} />
          </div>
        ) : (
          <>
            {adminSubView === 'dashboard' && (
              <AdminDashboard 
                username="Admin" 
                onLogout={handleLogout} 
                onNavigate={(view) => setAdminSubView(view)} 
              />
            )}
            {adminSubView === 'pages' && (
              <PageEditor 
                onBack={() => setAdminSubView('dashboard')} 
              />
            )}
            {adminSubView === 'blog' && (
              <BlogManager 
                onBack={() => setAdminSubView('dashboard')} 
              />
            )}
            {adminSubView === 'media' && (
              <div style={{ padding: '3rem', textAlign: 'left', maxWidth: '800px', margin: '0 auto' }}>
                <button 
                  onClick={() => setAdminSubView('dashboard')}
                  style={{ marginBottom: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '0.95rem' }}
                >
                  ← Retour au tableau de bord
                </button>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 300, color: '#4a4a4a', marginBottom: '1rem' }}>Gestion des Médias</h2>
                <p style={{ color: '#666' }}>Le gestionnaire de médias pour vos images et documents est accessible via votre dépôt GitHub direct.</p>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="site-wrapper">
      <header>
        <div className="header-top">
          <div className="header-brand">
            <div className="site-title">{settings.header.title}</div>
            <p className="subtitle">{settings.header.subtitle1}</p>
            <p className="subtitle">{settings.header.subtitle2}</p>
          </div>
          <div className="header-info">
            <p>{settings.header.info1}</p>
            <p>{settings.header.info2}</p>
            <p>{settings.header.info3}</p>
          </div>
        </div>
        <nav className="navbar">
          <div className="menu-toggle" id="mobile-menu" onClick={() => {
            const navMenuEl = document.querySelector('.nav-menu');
            if (navMenuEl) navMenuEl.style.display = navMenuEl.style.display === 'flex' ? 'none' : 'flex';
          }}>
            <span></span><span></span><span></span>
          </div>
          <ul className="nav-menu">
            {settings.menu.map((item) => (
              <li key={item.id} className={`${item.submenu && item.submenu.length > 0 ? 'has-submenu' : ''} ${currentSlug.startsWith(item.slug) ? 'active' : ''}`}>
                <a href={`#${item.slug}`} onClick={(e) => { e.preventDefault(); setCurrentSlug(item.slug); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  {item.label}
                </a>
                {item.submenu && item.submenu.length > 0 && (
                  <ul className="submenu">
                    {item.submenu.map((sub) => (
                      <li key={sub.id}>
                        <a href={`#${sub.slug}`} onClick={(e) => { e.preventDefault(); setCurrentSlug(sub.slug); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                          {sub.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main onClick={handleContentClick}>
        {loading ? (
          <section className="text-section" style={{ padding: '4rem 0' }}>
            <div className="container">
              <p>Chargement en cours...</p>
            </div>
          </section>
        ) : (
          pageData && (
            <div 
              className="markdown-content" 
              dangerouslySetInnerHTML={{ __html: pageData.content }} 
            />
          )
        )}
      </main>

      <footer>
        <div className="footer-container">
          <div>{settings.footer.text}</div>
          <div>
            <a 
              href="#admin" 
              onClick={(e) => { e.preventDefault(); setIsAdminView(true); }}
            >
              Administration CMS
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}