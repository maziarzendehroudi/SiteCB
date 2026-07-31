import React, { useState, useEffect } from 'react';
import { saveFileToGitHub } from '../services/githubService';

const STATIC_PAGES = [
  { id: 'home', path: 'content/pages/home.md', name: 'Accueil' },
  { id: 'a-propos', path: 'content/pages/a-propos.md', name: 'À propos' },
  { id: 'cadre-et-tarifs', path: 'content/pages/cadre-et-tarifs.md', name: 'Cadre et tarifs' },
  { id: 'contact', path: 'content/pages/contact.md', name: 'Contact / Où me trouver' },
  { id: 'pour-qui', path: 'content/pages/pour-qui.md', name: 'Pour qui ? (Général)' },
  { id: 'pour-qui-enfants', path: 'content/pages/pour-qui-enfants.md', name: 'Pour qui - Enfants' },
  { id: 'pour-qui-adolescents', path: 'content/pages/pour-qui-adolescents.md', name: 'Pour qui - Adolescents' },
  { id: 'pour-qui-adultes', path: 'content/pages/pour-qui-adultes.md', name: 'Pour qui - Adultes' },
  { id: 'blog', path: 'content/pages/blog.md', name: 'Page Blog (Index)' },
];

export default function PageEditor({ onBack }) {
  const [selectedPage, setSelectedPage] = useState(STATIC_PAGES[0]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Champs structurés
  const [metaTitle, setMetaTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [mainTitle, setMainTitle] = useState('');
  const [paragraphs, setParagraphs] = useState([]);
  const [parallaxImg, setParallaxImg] = useState('');
  const [rawFallback, setRawFallback] = useState('');
  const [isRawMode, setIsRawMode] = useState(false);

  const owner = 'maziarzendehroudi';
  const repo = 'SiteCB';
  const token = localStorage.getItem('github_token') || sessionStorage.getItem('github_admin_token');

  // Charger et parser la page sélectionnée
  useEffect(() => {
    async function fetchPageContent() {
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${selectedPage.path}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
          }
        });

        if (!res.ok) throw new Error("Impossible de charger le fichier depuis GitHub.");

        const data = await res.json();
        const decodedContent = decodeURIComponent(
          atob(data.content).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        );

        setRawFallback(decodedContent);

        const fmMatch = decodedContent.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/);
        if (fmMatch) {
          const frontmatter = fmMatch[1];
          const body = fmMatch[2];

          const tMatch = frontmatter.match(/title:\s*"?(.*?)"?$/m);
          const sMatch = frontmatter.match(/slug:\s*"?(.*?)"?$/m);
          setMetaTitle(tMatch ? tMatch[1].trim() : '');
          setPageSlug(sMatch ? sMatch[1].trim() : selectedPage.id);

          const h1Match = body.match(/<h1[^>]*>(.*?)<\/h1>/i) || body.match(/^#\s+(.*)$/m);
          setMainTitle(h1Match ? h1Match[1].trim() : '');

          const pMatch = body.match(/background-image:\s*url\('?(assets\/img\/[^']+)'?\)/i);
          setParallaxImg(pMatch ? pMatch[1] : '');

          const pList = [];
          const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
          let match;
          while ((match = pRegex.exec(body)) !== null) {
            pList.push(match[1].replace(/<br\s*\/?>/gi, '\n'));
          }

          if (pList.length > 0) {
            setParagraphs(pList);
          } else {
            setParagraphs([body.trim()]);
          }
        } else {
          setParagraphs([decodedContent]);
        }
      } catch (err) {
        setMessage({ type: 'error', text: err.message });
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchPageContent();
    }
  }, [selectedPage, token]);

  const handleAddParagraph = () => setParagraphs([...paragraphs, 'Nouveau paragraphe...']);
  const handleParagraphChange = (index, value) => {
    const updated = [...paragraphs];
    updated[index] = value;
    setParagraphs(updated);
  };
  const handleDeleteParagraph = (index) => setParagraphs(paragraphs.filter((_, i) => i !== index));

  const generateMarkdownContent = () => {
    if (isRawMode) return rawFallback;

    let bodyContent = '';
    if (mainTitle) {
      bodyContent += `<section class="text-section">\n    <div class="container">\n        <h1 class="main-title text-center" style="font-size: 2.2rem; margin-bottom: 2rem;">${mainTitle}</h1>\n`;
    } else {
      bodyContent += `<section class="text-section">\n    <div class="container">\n`;
    }

    paragraphs.forEach((p) => {
      const formattedP = p.replace(/\n/g, '<br>\n        ');
      bodyContent += `        <p>${formattedP}</p>\n`;
    });

    bodyContent += `    </div>\n</section>\n`;

    if (parallaxImg) {
      bodyContent += `\n<div class="parallax-bg" style="background-image: url('${parallaxImg}');"></div>\n`;
    }

    return `---
title: "${metaTitle}"
slug: "${pageSlug}"
---

${bodyContent}`;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const finalContent = generateMarkdownContent();
    const result = await saveFileToGitHub({
      owner,
      repo,
      path: selectedPage.path,
      message: `Mise à jour visuelle de la page ${selectedPage.name} via CMS Admin`,
      content: finalContent,
      token,
    });

    setSaving(false);
    if (result.success) {
      setMessage({ type: 'success', text: "Modifications enregistrées et commitées avec succès sur GitHub !" });
      setRawFallback(finalContent);
    } else {
      setMessage({ type: 'error', text: `Erreur lors de la sauvegarde : ${result.error}` });
    }
  };

  // Résolution propre de l'URL de l'image parallaxe pour l'aperçu live
  const getPreviewImageUrl = (imgpath) => {
    if (!imgpath) return '';
    const baseUrl = import.meta.env.BASE_URL || '/';
    const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    const cleanPath = imgpath.replace(/^\/?(assets\/img\/)/, '');
    return `${base}assets/img/${cleanPath}`;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fcfbf9', display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e6e2dd', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '0.9rem', fontWeight: 500 }}
        >
          ← Retour au tableau de bord
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <select
            value={selectedPage.id}
            onChange={(e) => {
              const page = STATIC_PAGES.find(p => p.id === e.target.value);
              setSelectedPage(page);
            }}
            style={{ padding: '0.4rem 1rem', backgroundColor: '#ffffff', border: '1px solid #e6e2dd', borderRadius: '4px', fontSize: '0.9rem', cursor: 'pointer', color: '#4a4a4a' }}
          >
            {STATIC_PAGES.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (!isRawMode) setRawFallback(generateMarkdownContent());
              setIsRawMode(!isRawMode);
            }}
            style={{ padding: '0.4rem 1rem', background: '#f4f2ee', border: '1px solid #e6e2dd', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', color: '#4a4a4a' }}
          >
            {isRawMode ? "Mode Éditeur Visuel" : "Mode Code Brut"}
          </button>
        </div>
      </header>

      {message && (
        <div style={{ margin: '1.5rem 2rem 0', padding: '1rem', borderRadius: '4px', fontSize: '0.9rem', backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2', color: message.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '6rem 0', color: '#666' }}>Chargement de la page...</div>
      ) : isRawMode ? (
        <main style={{ flex: 1, maxWidth: '900px', width: '100%', margin: '0 auto', padding: '2.5rem 2rem' }}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <textarea
              rows={22}
              value={rawFallback}
              onChange={(e) => setRawFallback(e.target.value)}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', padding: '1rem', backgroundColor: '#ffffff', border: '1px solid #e6e2dd', borderRadius: '4px', lineHeight: 1.6 }}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={saving}
                style={{ padding: '0.75rem 2rem', backgroundColor: '#4a4a4a', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer' }}
              >
                {saving ? "Enregistrement..." : "Enregistrer sur GitHub"}
              </button>
            </div>
          </form>
        </main>
      ) : (
        /* VUE DUALE : ÉDITEUR STRUCTURÉ (GAUCHE) / APERÇU LIVE FIDÉLISÉ (DROITE) */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, height: 'calc(100vh - 70px)', overflow: 'hidden' }}>
          
          {/* COLONNE GAUCHE : FORMULAIRE DE BLOCS STRUCTURÉS */}
          <div style={{ padding: '2rem', overflowY: 'auto', borderRight: '1px solid #e6e2dd', backgroundColor: '#fcfbf9' }}>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '4rem' }}>
              
              <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '4px', border: '1px solid #e6e2dd', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#666', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Méta Titre (SEO)</label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    style={{ width: '100%', padding: '0.4rem', border: '1px solid #e6e2dd', borderRadius: '4px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#666', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Image Parallaxe</label>
                  <input
                    type="text"
                    value={parallaxImg}
                    onChange={(e) => setParallaxImg(e.target.value)}
                    placeholder="assets/img/apropos1.jpg"
                    style={{ width: '100%', padding: '0.4rem', border: '1px solid #e6e2dd', borderRadius: '4px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '4px', border: '1px solid #e6e2dd' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#666', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Titre Principal (H1)</label>
                <input
                  type="text"
                  value={mainTitle}
                  onChange={(e) => setMainTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #e6e2dd', borderRadius: '4px', fontSize: '0.95rem', color: '#4a4a4a' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 500, color: '#4a4a4a', margin: 0 }}>Paragraphes de texte</h3>
                  <button
                    type="button"
                    onClick={handleAddParagraph}
                    style={{ padding: '0.3rem 0.8rem', backgroundColor: '#A3B1A9', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    + Ajouter
                  </button>
                </div>

                {paragraphs.map((p, index) => (
                  <div key={index} style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '4px', border: '1px solid #e6e2dd', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600 }}>Paragraphe #{index + 1}</span>
                      {paragraphs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteParagraph(index)}
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      value={p}
                      onChange={(e) => handleParagraphChange(index, e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #e6e2dd', borderRadius: '4px', fontSize: '0.9rem', lineHeight: 1.5, fontFamily: 'inherit' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ paddingTop: '1rem' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ width: '100%', padding: '0.75rem', backgroundColor: '#4a4a4a', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                >
                  {saving ? "Enregistrement en cours..." : "Enregistrer et publier sur GitHub"}
                </button>
              </div>
            </form>
          </div>

          {/* COLONNE DROITE : APERÇU LIVE IDENTIQUE À LA PAGE PUBLIQUE */}
          <div style={{ overflowY: 'auto', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
            <div style={{ backgroundColor: '#f4f2ee', padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#666', borderBottom: '1px solid #e6e2dd', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Aperçu en direct (Rendu public exact)
            </div>

            <div className="site-wrapper" style={{ flex: 1, backgroundColor: '#ffffff', textAlign: 'left' }}>
              <main className="markdown-content">
                <section className="text-section">
                  <div className="container">
                    {mainTitle && (
                      <h1 className="main-title text-center" style={{ fontSize: '2.2rem', marginBottom: '2rem', fontWeight: 300, color: '#4a4a4a' }}>
                        {mainTitle}
                      </h1>
                    )}
                    {paragraphs.map((p, idx) => (
                      <p key={idx} style={{ marginBottom: '1.2rem', fontSize: '1.15rem', fontWeight: 300, textAlign: 'justify', lineHeight: 1.5, color: '#4a4a4a' }}>
                        {p.split('\n').map((line, i) => (
                          <React.Fragment key={i}>
                            {line}
                            {i < p.split('\n').length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </p>
                    ))}
                  </div>
                </section>

                {parallaxImg && (
                  <div 
                    className="parallax-bg" 
                    style={{ backgroundImage: `url('${getPreviewImageUrl(parallaxImg)}')` }} 
                  />
                )}
              </main>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}