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

  // Données de la page
  const [metaTitle, setMetaTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [mainTitle, setMainTitle] = useState('');
  const [paragraphs, setParagraphs] = useState([]);
  const [parallaxImg, setParallaxImg] = useState('');

  const owner = 'maziarzendehroudi';
  const repo = 'SiteCB';
  const token = localStorage.getItem('github_token') || sessionStorage.getItem('github_admin_token');

  // Charger et parser la page sélectionnée depuis GitHub
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

  // Gestion des blocs (réorganisation / suppression / ajout)
  const handleAddParagraph = () => setParagraphs([...paragraphs, 'Nouveau paragraphe éditable...']);
  const handleParagraphChange = (index, value) => {
    const updated = [...paragraphs];
    updated[index] = value;
    setParagraphs(updated);
  };
  const handleDeleteParagraph = (index) => setParagraphs(paragraphs.filter((_, i) => i !== index));
  
  const handleMoveUp = (index) => {
    if (index === 0) return;
    const updated = [...paragraphs];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setParagraphs(updated);
  };

  const handleMoveDown = (index) => {
    if (index === paragraphs.length - 1) return;
    const updated = [...paragraphs];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setParagraphs(updated);
  };

  // Reconstruire le Markdown
  const generateMarkdownContent = () => {
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

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const finalContent = generateMarkdownContent();
    const result = await saveFileToGitHub({
      owner,
      repo,
      path: selectedPage.path,
      message: `Mise à jour visuelle in-context de la page ${selectedPage.name}`,
      content: finalContent,
      token,
    });

    setSaving(false);
    if (result.success) {
      setMessage({ type: 'success', text: "Modifications enregistrées et publiées sur GitHub avec succès !" });
    } else {
      setMessage({ type: 'error', text: `Erreur lors de la sauvegarde : ${result.error}` });
    }
  };

  const getPreviewImageUrl = (imgpath) => {
    if (!imgpath) return '';
    const baseUrl = import.meta.env.BASE_URL || '/';
    const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    const cleanPath = imgpath.replace(/^\/?(assets\/img\/)/, '');
    return `${base}assets/img/${cleanPath}`;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      
      {/* BARRE D'OUTILS FLOTTANTE SUPÉRIEURE (ADMIN) */}
      <div style={{ position: 'sticky', top: 0, zIndex: 9999, backgroundColor: '#2f2f2f', color: '#ffffff', padding: '0.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a3a3a3', fontSize: '0.9rem', fontWeight: 500 }}
          >
            ← Tableau de bord
          </button>
          <span style={{ color: '#666' }}>|</span>
          <select
            value={selectedPage.id}
            onChange={(e) => {
              const page = STATIC_PAGES.find(p => p.id === e.target.value);
              setSelectedPage(page);
            }}
            style={{ padding: '0.3rem 0.8rem', backgroundColor: '#4a4a4a', color: '#ffffff', border: '1px solid #555', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            {STATIC_PAGES.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#a3a3a3', fontStyle: 'italic' }}>Mode Édition Visuelle Directe</span>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '0.5rem 1.5rem', backgroundColor: '#A3B1A9', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}
          >
            {saving ? "Publication..." : "Enregistrer sur GitHub"}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ margin: '1rem 2rem 0', padding: '1rem', borderRadius: '4px', fontSize: '0.9rem', backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2', color: message.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '8rem 0', color: '#666', fontSize: '1.1rem' }}>Chargement de la page...</div>
      ) : (
        /* APERÇU PUBLIC EXACT AVEC CONTRÔLES D'ÉDITION INCRUSTÉS */
        <div className="site-wrapper" style={{ flex: 1, backgroundColor: '#ffffff', textAlign: 'left' }}>
          <main className="markdown-content">
            <section className="text-section" style={{ backgroundColor: '#DCE2E0', padding: '4rem 0' }}>
              <div className="container" style={{ maxWidth: '980px', margin: '0 auto', padding: '0 2rem' }}>
                
                {/* Édition du Titre Principal (H1) */}
                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: '#666', marginBottom: '0.2rem', fontWeight: 600 }}>Titre Principal (H1)</label>
                  <input
                    type="text"
                    value={mainTitle}
                    onChange={(e) => setMainTitle(e.target.value)}
                    style={{ width: '100%', fontSize: '2.2rem', fontWeight: 300, color: '#4a4a4a', backgroundColor: 'rgba(255,255,255,0.6)', border: '1px dashed #A3B1A9', borderRadius: '4px', padding: '0.5rem 1rem', fontFamily: 'inherit', letterSpacing: '1px' }}
                  />
                </div>

                {/* Blocs de Paragraphes éditables avec réorganisation */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {paragraphs.map((p, index) => (
                    <div key={index} style={{ position: 'relative', backgroundColor: 'rgba(255,255,255,0.4)', border: '1px dashed #cbd3d0', borderRadius: '4px', padding: '1rem' }}>
                      
                      {/* Barre d'actions du bloc */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#777' }}>Bloc Paragraphe #{index + 1}</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            style={{ background: '#fff', border: '1px solid #ccc', borderRadius: '3px', padding: '0.1rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}
                            title="Déplacer vers le haut"
                          >
                            ↑ Monter
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === paragraphs.length - 1}
                            style={{ background: '#fff', border: '1px solid #ccc', borderRadius: '3px', padding: '0.1rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}
                            title="Déplacer vers le bas"
                          >
                            ↓ Descendre
                          </button>
                          {paragraphs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteParagraph(index)}
                              style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '3px', padding: '0.1rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Contenu éditable du paragraphe */}
                      <textarea
                        rows={3}
                        value={p}
                        onChange={(e) => handleParagraphChange(index, e.target.value)}
                        style={{ width: '100%', fontSize: '1.15rem', fontWeight: 300, lineHeight: 1.6, color: '#4a4a4a', backgroundColor: 'transparent', border: 'none', outline: 'none', resize: 'vertical', fontFamily: 'inherit', textAlign: 'justify' }}
                      />
                    </div>
                  ))}

                  <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={handleAddParagraph}
                      style={{ padding: '0.6rem 2rem', backgroundColor: '#A3B1A9', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500 }}
                    >
                      + Ajouter un paragraphe à la page
                    </button>
                  </div>
                </div>

              </div>
            </section>

            {/* Section Image Parallaxe (si présente ou configurable) */}
            <div style={{ padding: '2rem 0', backgroundColor: '#f4f2ee', textAlign: 'center' }}>
              <div className="container" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#666', marginBottom: '0.3rem', fontWeight: 600 }}>Image d'arrière-plan (Parallaxe)</label>
                <input
                  type="text"
                  value={parallaxImg}
                  onChange={(e) => setParallaxImg(e.target.value)}
                  placeholder="ex: assets/img/apropos1.jpg"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.9rem', marginBottom: '1rem', backgroundColor: '#fff' }}
                />
              </div>
              {parallaxImg && (
                <div 
                  className="parallax-bg" 
                  style={{ backgroundImage: `url('${getPreviewImageUrl(parallaxImg)}')`, height: '200px' }} 
                />
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}