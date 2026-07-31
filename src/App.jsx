import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import { getPageContent } from './services/contentService';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import PageEditor from './components/PageEditor';
import BlogManager from './components/BlogManager';
import './index.css';

// Configuration de marked pour autoriser et parser correctement le HTML brut intégré dans les .md
marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false,
});

export default function App() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSlug, setCurrentSlug] = useState('home');
  const [isAdminView, setIsAdminView] = useState(false);
  const [adminSubView, setAdminSubView] = useState('dashboard'); // 'dashboard', 'pages', 'blog', 'media'
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('github_token') || '');

  useEffect(() => {
    if (isAdminView) return;

    async function load() {
      setLoading(true);
      try {
        const data = await getPageContent(currentSlug);
        
        // Ajustement automatique des chemins d'images pour le build et le dev
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

  // Interception des clics sur les liens internes dans le Markdown (ex: href="blog.html")
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
    setGithubToken(token);
    setAdminSubView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('github_token');
    setGithubToken('');
    setIsAdminView(false);
    setAdminSubView('dashboard');
  };

  if (isAdminView) {
    return (
      <div className="site-wrapper" style={{ minHeight: '100vh', backgroundColor: '#fcfbf9' }}>
        <div style={{ padding: '1rem 2rem', background: '#fff', borderBottom: '1px solid #e6e2dd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 400, color: '#4a4a4a' }}>Administration du Site</h1>
          <button 
            onClick={() => { setIsAdminView(false); setAdminSubView('dashboard'); }}
            style={{ padding: '0.5rem 1rem', cursor: 'pointer', background: '#A3B1A9', color: '#fff', border: 'none', borderRadius: '2px', fontSize: '0.9rem' }}
          >
            ← Retour au site public
          </button>
        </div>

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
          <div className="menu-toggle" id="mobile-menu" onClick={() => {
            const navMenuEl = document.querySelector('.nav-menu');
            if (navMenuEl) navMenuEl.style.display = navMenuEl.style.display === 'flex' ? 'none' : 'flex';
          }}>
            <span></span><span></span><span></span>
          </div>
          <ul className="nav-menu">
            <li className={currentSlug === 'home' ? 'active' : ''}>
              <a href="#home" onClick={(e) => { e.preventDefault(); setCurrentSlug('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Accueil</a>
            </li>
            <li className={`has-submenu ${currentSlug.startsWith('pour-qui') ? 'active' : ''}`}>
              <a href="#pour-qui" onClick={(e) => { e.preventDefault(); setCurrentSlug('pour-qui'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Pour qui ?</a>
              <ul className="submenu">
                <li><a href="#enfants" onClick={(e) => { e.preventDefault(); setCurrentSlug('pour-qui-enfants'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Enfants</a></li>
                <li><a href="#adolescents" onClick={(e) => { e.preventDefault(); setCurrentSlug('pour-qui-adolescents'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Adolescents</a></li>
                <li><a href="#adultes" onClick={(e) => { e.preventDefault(); setCurrentSlug('pour-qui-adultes'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Adultes</a></li>
              </ul>
            </li>
            <li className={currentSlug === 'contact' ? 'active' : ''}>
              <a href="#contact" onClick={(e) => { e.preventDefault(); setCurrentSlug('contact'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Où me trouver ?</a>
            </li>
            <li className={currentSlug === 'a-propos' ? 'active' : ''}>
              <a href="#a-propos" onClick={(e) => { e.preventDefault(); setCurrentSlug('a-propos'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>A propos</a>
            </li>
            <li className={currentSlug === 'cadre-et-tarifs' ? 'active' : ''}>
              <a href="#cadre-et-tarifs" onClick={(e) => { e.preventDefault(); setCurrentSlug('cadre-et-tarifs'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Cadre et tarifs</a>
            </li>
            <li className={currentSlug === 'blog' ? 'active' : ''}>
              <a href="#blog" onClick={(e) => { e.preventDefault(); setCurrentSlug('blog'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Blog</a>
            </li>
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
          <div>Camille Bongue - Psychothérapeute - Psychanalyste - 07 68 99 07 07</div>
          <div>
            <a 
              href="#admin" 
              onClick={(e) => { e.preventDefault(); setIsAdminView(true); }}
            >
              Politique de confidentialité
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}