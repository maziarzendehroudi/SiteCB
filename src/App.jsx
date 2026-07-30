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
    if (isAdminView) return;

    async function load() {
      setLoading(true);
      try {
        const data = await getPageContent(currentSlug);
        setPageData(data);
      } catch (e) {
        console.error("Erreur de chargement de la page :", e);
        setPageData({ meta: { title: "Erreur" }, content: "<section class='text-section'><div class='container'><h1>Page introuvable</h1><p>Le contenu demandé n'existe pas encore.</p></div></section>" });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentSlug, isAdminView]);

  const handleLogin = (token) => {
    localStorage.setItem('github_token', token);
    setGithubToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('github_token');
    setGithubToken('');
  };

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
          <ul className="nav-menu">
            <li className={currentSlug === 'home' ? 'active' : ''}>
              <a href="#home" onClick={(e) => { e.preventDefault(); setCurrentSlug('home'); }}>Accueil</a>
            </li>
            <li className={`has-submenu ${currentSlug.startsWith('pour-qui') ? 'active' : ''}`}>
              <a href="#pour-qui" onClick={(e) => { e.preventDefault(); setCurrentSlug('pour-qui'); }}>Pour qui ?</a>
              <ul className="submenu">
                <li><a href="#enfants" onClick={(e) => { e.preventDefault(); setCurrentSlug('pour-qui-enfants'); }}>Enfants</a></li>
                <li><a href="#adolescents" onClick={(e) => { e.preventDefault(); setCurrentSlug('pour-qui-adolescents'); }}>Adolescents</a></li>
                <li><a href="#adultes" onClick={(e) => { e.preventDefault(); setCurrentSlug('pour-qui-adultes'); }}>Adultes</a></li>
              </ul>
            </li>
            <li className={currentSlug === 'contact' ? 'active' : ''}>
              <a href="#contact" onClick={(e) => { e.preventDefault(); setCurrentSlug('contact'); }}>Où me trouver ?</a>
            </li>
            <li className={currentSlug === 'a-propos' ? 'active' : ''}>
              <a href="#a-propos" onClick={(e) => { e.preventDefault(); setCurrentSlug('a-propos'); }}>A propos</a>
            </li>
            <li className={currentSlug === 'cadre-et-tarifs' ? 'active' : ''}>
              <a href="#cadre-et-tarifs" onClick={(e) => { e.preventDefault(); setCurrentSlug('cadre-et-tarifs'); }}>Cadre et tarifs</a>
            </li>
            <li className={currentSlug === 'blog' ? 'active' : ''}>
              <a href="#blog" onClick={(e) => { e.preventDefault(); setCurrentSlug('blog'); }}>Blog</a>
            </li>
          </ul>
        </nav>
      </header>

      <main>
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
              dangerouslySetInnerHTML={{ __html: marked.parse(pageData.content) }} 
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