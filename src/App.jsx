import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import { getPageContent } from './services/contentService';
import './index.css';

export default function App() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSlug, setCurrentSlug] = useState('home');

  useEffect(() => {
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
  }, [currentSlug]);

  const navLinks = [
    { label: 'Accueil', slug: 'home' },
    { label: 'Pour qui ?', slug: 'pour-qui' },
    { label: 'Où me trouver ?', slug: 'contact' },
    { label: 'A propos', slug: 'a-propos' },
    { label: 'Cadre et tarifs', slug: 'cadre-et-tarifs' },
    { label: 'Blog', slug: 'blog' },
  ];

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
        <div className="footer-container" style={{ padding: '2rem 0', textAlign: 'center', borderTop: '1px solid #eee' }}>
          <div>Camille Bongue - Psychothérapeute - Psychanalyste - 07 68 99 07 07</div>
        </div>
      </footer>
    </div>
  );
}