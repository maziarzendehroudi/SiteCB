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

  const [metaTitle, setMetaTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [blocks, setBlocks] = useState([]);

  const owner = 'maziarzendehroudi';
  const repo = 'SiteCB';
  const token = localStorage.getItem('github_token') || sessionStorage.getItem('github_admin_token');

  // Parser intelligent de la page active en blocs riches (Titres, Paragraphes, Citations, Images/Parallaxes)
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

          const parsedBlocks = [];

          // Découpage séquentiel des éléments du body
          const lines = body.split('\n');
          let currentText = '';

          // Extraction des H1 / H2
          const hMatches = [...body.matchAll(/<h([12])[^>]*>(.*?)<\/h[12]>/gi)];
          
          // Recherche des citations spécifiques (.citation)
          const citMatch = body.match(/class="citation"[^>]*>([\s\S]*?)<\/p>/i);
          const autMatch = body.match(/class="auteur"[^>]*>([\s\S]*?)<\/p>/i);

          if (citMatch) {
            parsedBlocks.push({ type: 'citation', text: citMatch[1].trim(), author: autMatch ? autMatch[1].trim() : '' });
          }

          // Extraction des H1
          const h1Match = body.match(/<h1[^>]*>(.*?)<\/h1>/i) || body.match(/^#\s+(.*)$/m);
          if (h1Match) {
            parsedBlocks.push({ type: 'heading1', content: h1Match[1].trim() });
          }

          // Extraction des H2
          const h2Matches = [...body.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)];
          h2Matches.forEach(m => {
            parsedBlocks.push({ type: 'heading2', content: m[1].trim() });
          });

          // Extraction des paragraphes standards
          const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
          let match;
          while ((match = pRegex.exec(body)) !== null) {
            const innerHtml = match[1];
            // Ignorer les paragraphes de citation/auteur déjà pris en compte
            if (innerHtml.includes('class="citation"') || innerHtml.includes('class="auteur"')) continue;
            
            const cleanText = innerHtml.replace(/<br\s*\/?>/gi, '\n');
            parsedBlocks.push({ type: 'paragraph', content: cleanText });
          }

          // Extraction des images / parallaxes
          const imgMatches = [...body.matchAll(/background-image:\s*url\('?(assets\/img\/[^']+)'?\)/gi)];
          imgMatches.forEach(m => {
            parsedBlocks.push({ type: 'parallax', content: m[1] });
          });

          if (parsedBlocks.length === 0) {
            parsedBlocks.push({ type: 'paragraph', content: body.trim() });
          }

          setBlocks(parsedBlocks);
        } else {
          setBlocks([{ type: 'paragraph', content: decodedContent }]);
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

  // Gestion des blocs
  const handleAddBlock = (type) => {
    let newBlock = { type, content: 'Nouveau contenu...' };
    if (type === 'heading2') newBlock = { type, content: 'Nouveau sous-titre' };
    if (type === 'citation') newBlock = { type, text: 'Citation...', author: 'Auteur' };
    if (type === 'parallax') newBlock = { type, content: 'assets/img/apropos1.jpg' };
    setBlocks([...blocks, newBlock]);
  };

  const handleBlockChange = (index, field, value) => {
    const updated = [...blocks];
    if (field === 'content' || field === 'text' || field === 'author') {
      updated[index][field] = value;
    }
    setBlocks(updated);
  };

  const handleDeleteBlock = (index) => setBlocks(blocks.filter((_, i) => i !== index));

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const updated = [...blocks];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setBlocks(updated);
  };

  const handleMoveDown = (index) => {
    if (index === blocks.length - 1) return;
    const updated = [...blocks];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setBlocks(updated);
  };

  // Reconstitution complète du Markdown d'origine
  const generateMarkdownContent = () => {
    let bodyContent = `<section class="text-section" style="background-color: #DCE2E0; padding: 4rem 0;">\n    <div class="container" style="max-width: 980px; margin: 0 auto; padding: 0 2rem;">\n`;

    blocks.forEach((block) => {
      if (block.type === 'heading1') {
        bodyContent += `        <h1 class="main-title text-center" style="font-size: 2.2rem; margin-bottom: 2rem; font-weight: 300; color: #4a4a4a;">${block.content}</h1>\n`;
      } else if (block.type === 'heading2') {
        bodyContent += `        <h2 style="font-size: 1.8rem; margin: 2rem 0 1rem; font-weight: 300; color: #4a4a4a;">${block.content}</h2>\n`;
      } else if (block.type === 'paragraph') {
        const formattedP = block.content.replace(/\n/g, '<br>\n        ');
        bodyContent += `        <p style="font-size: 1.15rem; font-weight: 300; margin-bottom: 1.2rem; text-align: justify; line-height: 1.5; color: #4a4a4a;">${formattedP}</p>\n`;
      } else if (block.type === 'citation') {
        bodyContent += `        <p class="citation" style="font-size: 30px !important; color: rgb(111, 75, 33) !important; font-style: italic; font-weight: 300; line-height: 1.3; margin-bottom: 0 !important; text-align: center !important;">"${block.text}"</p>\n`;
        if (block.author) {
          bodyContent += `        <p class="auteur" style="font-size: 1.1rem; font-weight: 300; margin-top: 0 !important; margin-bottom: 2rem !important; text-align: center !important;">${block.author}</p>\n`;
        }
      } else if (block.type === 'parallax') {
        bodyContent += `    </div>\n</section>\n\n<div class="parallax-bg" style="background-image: url('${block.content}');"></div>\n\n<section class="text-section" style="background-color: #DCE2E0; padding: 4rem 0;">\n    <div class="container" style="max-width: 980px; margin: 0 auto; padding: 0 2rem;">\n`;
      }
    });

    bodyContent += `    </div>\n</section>\n`;

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
      message: `Mise à jour visuelle complète de la page ${selectedPage.name}`,
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
    <div style={{ minHeight: '100vh', backgroundColor: '#fcfbf9', display: 'flex', flexDirection: 'column' }}>
      
      {/* BARRE D'OUTILS SUPÉRIEURE */}
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
          <span style={{ fontSize: '0.8rem', color: '#a3a3a3', fontStyle: 'italic' }}>Éditeur Visuel Complet</span>
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
        /* APERÇU FIDÈLE À LA PAGE PUBLIQUE AVEC COMMANDES DISCRETES AU SURVOL */
        <div className="site-wrapper" style={{ flex: 1, backgroundColor: '#ffffff', textAlign: 'left' }}>
          <main className="markdown-content">
            <section className="text-section" style={{ backgroundColor: '#DCE2E0', padding: '4rem 0' }}>
              <div className="container" style={{ maxWidth: '980px', margin: '0 auto', padding: '0 2rem' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {blocks.map((block, index) => (
                    <div 
                      key={index} 
                      style={{ position: 'relative', padding: '0.5rem', borderRadius: '4px', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(163, 177, 169, 0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      
                      {/* BOUTONS D'ACTION FLOTTANTS AU SURVOL */}
                      <div style={{ position: 'absolute', right: '0.5rem', top: '-1rem', display: 'flex', gap: '0.3rem', background: '#4a4a4a', padding: '0.2rem 0.5rem', borderRadius: '3px', boxShadow: '0 2px 5px rgba(0,0,0,0.15)', opacity: '0.15', transition: 'opacity 0.2s', zIndex: 10 }}
                           onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                           onMouseLeave={(e) => e.currentTarget.style.opacity = '0.15'}
                      >
                        <button type="button" onClick={() => handleMoveUp(index)} title="Monter" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}>↑</button>
                        <button type="button" onClick={() => handleMoveDown(index)} title="Descendre" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}>↓</button>
                        <button type="button" onClick={() => handleDeleteBlock(index)} title="Supprimer" style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '0.75rem' }}>×</button>
                      </div>

                      {/* BLOC : TITRE PRINCIPAL (H1) */}
                      {block.type === 'heading1' && (
                        <input
                          type="text"
                          value={block.content}
                          onChange={(e) => handleBlockChange(index, 'content', e.target.value)}
                          style={{ width: '100%', fontSize: '2.2rem', fontWeight: 300, color: '#4a4a4a', backgroundColor: 'transparent', border: 'none', borderBottom: '1px dashed #A3B1A9', padding: '0.5rem 0', fontFamily: 'inherit', letterSpacing: '1px', outline: 'none', textAlign: 'center' }}
                          placeholder="Titre principal (H1)"
                        />
                      )}

                      {/* BLOC : SOUS-TITRE (H2) */}
                      {block.type === 'heading2' && (
                        <input
                          type="text"
                          value={block.content}
                          onChange={(e) => handleBlockChange(index, 'content', e.target.value)}
                          style={{ width: '100%', fontSize: '1.8rem', fontWeight: 300, color: '#4a4a4a', backgroundColor: 'transparent', border: 'none', borderBottom: '1px dashed #A3B1A9', padding: '0.5rem 0', fontFamily: 'inherit', outline: 'none', marginTop: '1rem' }}
                          placeholder="Sous-titre (H2)"
                        />
                      )}

                      {/* BLOC : PARAGRAPHE DE TEXTE */}
                      {block.type === 'paragraph' && (
                        <textarea
                          rows={3}
                          value={block.content}
                          onChange={(e) => handleBlockChange(index, 'content', e.target.value)}
                          style={{ width: '100%', fontSize: '1.15rem', fontWeight: 300, lineHeight: 1.5, color: '#4a4a4a', backgroundColor: 'transparent', border: 'none', outline: 'none', resize: 'vertical', fontFamily: 'inherit', textAlign: 'justify' }}
                          placeholder="Saisissez votre texte ici..."
                        />
                      )}

                      {/* BLOC : CITATION */}
                      {block.type === 'citation' && (
                        <div style={{ borderLeft: '2px solid rgb(111, 75, 33)', paddingLeft: '1rem', margin: '1rem 0' }}>
                          <textarea
                            rows={2}
                            value={block.text}
                            onChange={(e) => handleBlockChange(index, 'text', e.target.value)}
                            style={{ width: '100%', fontSize: '30px', fontStyle: 'italic', fontWeight: 300, color: 'rgb(111, 75, 33)', backgroundColor: 'transparent', border: 'none', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                            placeholder="Texte de la citation..."
                          />
                          <input
                            type="text"
                            value={block.author}
                            onChange={(e) => handleBlockChange(index, 'author', e.target.value)}
                            style={{ width: '100%', fontSize: '1.1rem', fontWeight: 300, color: '#4a4a4a', backgroundColor: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit' }}
                            placeholder="Auteur (laisser vide si aucun)"
                          />
                        </div>
                      )}

                      {/* BLOC : IMAGE / PARALLAXE */}
                      {block.type === 'parallax' && (
                        <div style={{ padding: '1rem', background: '#fff', border: '1px dashed #A3B1A9', borderRadius: '4px', margin: '1rem 0' }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#666', marginBottom: '0.3rem', fontWeight: 600 }}>Image / Parallaxe</label>
                          <input
                            type="text"
                            value={block.content}
                            onChange={(e) => handleBlockChange(index, 'content', e.target.value)}
                            placeholder="assets/img/apropos1.jpg"
                            style={{ width: '100%', padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.9rem', marginBottom: '0.5rem' }}
                          />
                          <div 
                            className="parallax-bg" 
                            style={{ backgroundImage: `url('${getPreviewImageUrl(block.content)}')`, height: '180px', borderRadius: '4px' }} 
                          />
                        </div>
                      )}

                    </div>
                  ))}
                </div>

                {/* BOUTONS D'AJOUT DE NOUVEAUX BLOCS */}
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '3rem', borderTop: '1px dashed #cbd3d0', paddingTop: '2rem' }}>
                  <button
                    type="button"
                    onClick={() => handleAddBlock('paragraph')}
                    style={{ padding: '0.5rem 1.2rem', backgroundColor: '#A3B1A9', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
                  >
                    + Paragraphe
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddBlock('heading2')}
                    style={{ padding: '0.5rem 1.2rem', backgroundColor: '#8a9a91', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
                  >
                    + Sous-titre (H2)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddBlock('citation')}
                    style={{ padding: '0.5rem 1.2rem', backgroundColor: '#7c5a35', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
                  >
                    + Citation
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddBlock('parallax')}
                    style={{ padding: '0.5rem 1.2rem', backgroundColor: '#6f4b21', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
                  >
                    + Image / Parallaxe
                  </button>
                </div>

              </div>
            </section>
          </main>
        </div>
      )}
    </div>
  );
}