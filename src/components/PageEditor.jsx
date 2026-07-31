import React, { useState, useEffect, useRef } from 'react';
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
  
  // État pour gérer quel bloc est en cours d'édition (null = aucun, on voit l'aperçu)
  const [editingIndex, setEditingIndex] = useState(null);

  // Références pour le Drag & Drop
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const owner = 'maziarzendehroudi';
  const repo = 'SiteCB';
  const token = localStorage.getItem('github_token') || sessionStorage.getItem('github_admin_token');

  // Parser intelligent de la page active en blocs riches
  useEffect(() => {
    async function fetchPageContent() {
      setLoading(true);
      setMessage(null);
      setEditingIndex(null); // Reset édition au changement de page
      try {
        // Ajout d'un timestamp pour forcer le contournement du cache GitHub
        const timestamp = new Date().getTime();
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${selectedPage.path}?t=${timestamp}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'If-None-Match': '' // Force GitHub à ne pas utiliser l'ETag en cache
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

          const lines = body.split('\n');
          let currentText = '';

          const citMatch = body.match(/class="citation"[^>]*>([\s\S]*?)<\/p>/i);
          const autMatch = body.match(/class="auteur"[^>]*>([\s\S]*?)<\/p>/i);

          if (citMatch) {
            parsedBlocks.push({ type: 'citation', text: citMatch[1].trim(), author: autMatch ? autMatch[1].trim() : '' });
          }

          const h1Match = body.match(/<h1[^>]*>(.*?)<\/h1>/i) || body.match(/^#\s+(.*)$/m);
          if (h1Match) {
            parsedBlocks.push({ type: 'heading1', content: h1Match[1].trim() });
          }

          const h2Matches = [...body.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)];
          h2Matches.forEach(m => {
            parsedBlocks.push({ type: 'heading2', content: m[1].trim() });
          });

          const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
          let match;
          while ((match = pRegex.exec(body)) !== null) {
            const innerHtml = match[1];
            if (innerHtml.includes('class="citation"') || innerHtml.includes('class="auteur"')) continue;
            
            const cleanText = innerHtml.replace(/<br\s*\/?>/gi, '\n');
            parsedBlocks.push({ type: 'paragraph', content: cleanText });
          }

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
    setEditingIndex(blocks.length);
  };

  const handleBlockChange = (index, field, value) => {
    const updated = [...blocks];
    if (field === 'content' || field === 'text' || field === 'author') {
      updated[index][field] = value;
    }
    setBlocks(updated);
  };

  const handleDeleteBlock = (index) => {
    setBlocks(blocks.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  const handleDragStart = (e, position) => {
    dragItem.current = position;
  };

  const handleDragEnter = (e, position) => {
    dragOverItem.current = position;
  };

  const handleDragEnd = (e) => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const _blocks = [...blocks];
      const draggedItemContent = _blocks.splice(dragItem.current, 1)[0];
      _blocks.splice(dragOverItem.current, 0, draggedItemContent);
      setBlocks(_blocks);
      
      if (editingIndex === dragItem.current) {
        setEditingIndex(dragOverItem.current);
      } else {
        setEditingIndex(null);
      }
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const generateMarkdownContent = () => {
    let bodyContent = `<section class="text-section">\n    <div class="container" style="max-width: 980px; margin: 0 auto; padding: 0 2rem;">\n`;

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
        bodyContent += `    </div>\n</section>\n\n<div class="parallax-bg" style="background-image: url('${block.content}');"></div>\n\n<section class="text-section">\n    <div class="container" style="max-width: 980px; margin: 0 auto; padding: 0 2rem;">\n`;
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
    setEditingIndex(null);

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
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ position: 'sticky', top: 0, zIndex: 9999, backgroundColor: '#2f2f2f', color: '#ffffff', padding: '0.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a3a3a3', fontSize: '0.9rem', fontWeight: 500 }}>
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
          <span style={{ fontSize: '0.8rem', color: '#a3a3a3', fontStyle: 'italic' }}>Éditeur Visuel WYSIWYG</span>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '0.5rem 1.5rem', backgroundColor: '#6F4B21', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}
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
        <div style={{ textAlign: 'center', padding: '8rem 0', color: 'var(--text)', fontSize: '1.1rem' }}>Chargement de la page...</div>
      ) : (
        <div className="site-wrapper" style={{ flex: 1, backgroundColor: 'transparent', textAlign: 'left' }}>
          <main className="markdown-content">
            <section className="text-section" style={{ padding: '2rem 0' }}>
              <div className="container" style={{ maxWidth: '980px', margin: '0 auto', padding: '0 2rem' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {blocks.map((block, index) => {
                    const isEditing = editingIndex === index;

                    return (
                      <div 
                        key={index} 
                        draggable={!isEditing}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        style={{ 
                          position: 'relative', 
                          borderRadius: '4px', 
                          border: '2px dashed transparent',
                          padding: isEditing ? '1.5rem' : '0.5rem',
                          margin: isEditing ? '1rem 0' : '0',
                          backgroundColor: isEditing ? 'var(--code-bg)' : 'transparent',
                          transition: 'all 0.2s',
                          cursor: isEditing ? 'default' : 'grab'
                        }}
                        onMouseEnter={(e) => {
                          if (!isEditing) {
                            e.currentTarget.style.border = '2px dashed var(--border)';
                            e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)';
                            const actions = e.currentTarget.querySelector('.block-actions');
                            if(actions) actions.style.opacity = '1';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isEditing) {
                            e.currentTarget.style.border = '2px dashed transparent';
                            e.currentTarget.style.backgroundColor = 'transparent';
                            const actions = e.currentTarget.querySelector('.block-actions');
                            if(actions) actions.style.opacity = '0';
                          }
                        }}
                      >
                        
                        {!isEditing && (
                          <div 
                            className="block-actions"
                            style={{ 
                              position: 'absolute', right: '1rem', top: '-1rem', display: 'flex', gap: '0.5rem', 
                              background: 'var(--bg)', padding: '0.3rem 0.8rem', borderRadius: '20px', 
                              boxShadow: 'var(--shadow)', opacity: '0', transition: 'opacity 0.2s', zIndex: 10,
                              border: '1px solid var(--border)', alignItems: 'center'
                            }}
                          >
                            <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: 0.5, cursor: 'grab', marginRight: '0.5rem' }}>⋮⋮ Glisser</span>
                            <button type="button" onClick={() => setEditingIndex(index)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>✎ Éditer</button>
                            <button type="button" onClick={() => handleDeleteBlock(index)} style={{ background: 'none', border: 'none', color: '#e3342f', cursor: 'pointer', fontSize: '0.85rem' }}>Corbeille</button>
                          </div>
                        )}

                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                              <span style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-h)' }}>Mode Édition - {block.type}</span>
                              <button type="button" onClick={() => setEditingIndex(null)} style={{ padding: '0.4rem 1rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>✔ Valider</button>
                            </div>

                            {block.type === 'heading1' && (
                              <input type="text" value={block.content} onChange={(e) => handleBlockChange(index, 'content', e.target.value)} style={{ width: '100%', fontSize: '1.2rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', fontFamily: 'inherit' }} placeholder="Titre principal (H1)" />
                            )}

                            {block.type === 'heading2' && (
                              <input type="text" value={block.content} onChange={(e) => handleBlockChange(index, 'content', e.target.value)} style={{ width: '100%', fontSize: '1.1rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', fontFamily: 'inherit' }} placeholder="Sous-titre (H2)" />
                            )}

                            {block.type === 'paragraph' && (
                              <textarea rows={6} value={block.content} onChange={(e) => handleBlockChange(index, 'content', e.target.value)} style={{ width: '100%', fontSize: '1rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', fontFamily: 'inherit', resize: 'vertical' }} placeholder="Saisissez votre texte ici..." />
                            )}

                            {block.type === 'citation' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <textarea rows={3} value={block.text} onChange={(e) => handleBlockChange(index, 'text', e.target.value)} style={{ width: '100%', fontSize: '1rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', fontFamily: 'inherit' }} placeholder="Texte de la citation..." />
                                <input type="text" value={block.author} onChange={(e) => handleBlockChange(index, 'author', e.target.value)} style={{ width: '100%', fontSize: '1rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', fontFamily: 'inherit' }} placeholder="Auteur (laisser vide si aucun)" />
                              </div>
                            )}

                            {block.type === 'parallax' && (
                              <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text)', marginBottom: '0.3rem' }}>Chemin de l'image</label>
                                <input type="text" value={block.content} onChange={(e) => handleBlockChange(index, 'content', e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.9rem', marginBottom: '0.5rem' }} />
                                <div className="parallax" style={{ backgroundImage: `url('${getPreviewImageUrl(block.content)}')`, height: '120px', borderRadius: '4px', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                              </div>
                            )}
                          </div>
                        ) : (
                          
                          <div style={{ pointerEvents: 'none' }}>
                            {block.type === 'heading1' && (
                              <h1 style={{ textAlign: 'center' }}>{block.content}</h1>
                            )}
                            
                            {block.type === 'heading2' && (
                              <h2>{block.content}</h2>
                            )}

                            {block.type === 'paragraph' && (
                              <p dangerouslySetInnerHTML={{ __html: block.content.replace(/\n/g, '<br/>') }} />
                            )}

                            {block.type === 'citation' && (
                              <div style={{ margin: '3rem 0' }}>
                                <p style={{ fontSize: '30px', color: 'var(--accent)', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.3, marginBottom: '0', textAlign: 'center' }}>"{block.text}"</p>
                                {block.author && (
                                  <p style={{ fontSize: '1.1rem', fontWeight: 300, marginTop: '0', marginBottom: '2rem', textAlign: 'center' }}>{block.author}</p>
                                )}
                              </div>
                            )}

                            {block.type === 'parallax' && (
                              <div style={{ 
                                  backgroundImage: `url('${getPreviewImageUrl(block.content)}')`, 
                                  height: '400px', 
                                  width: '100vw', 
                                  position: 'relative', 
                                  left: '50%', 
                                  right: '50%', 
                                  marginLeft: '-50vw', 
                                  marginRight: '-50vw',
                                  backgroundAttachment: 'fixed',
                                  backgroundPosition: 'center',
                                  backgroundSize: 'cover',
                                  backgroundRepeat: 'no-repeat'
                                }} 
                              />
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '4rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                  <button type="button" onClick={() => handleAddBlock('paragraph')} style={{ padding: '0.6rem 1.2rem', backgroundColor: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>+ Paragraphe</button>
                  <button type="button" onClick={() => handleAddBlock('heading2')} style={{ padding: '0.6rem 1.2rem', backgroundColor: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>+ Sous-titre</button>
                  <button type="button" onClick={() => handleAddBlock('citation')} style={{ padding: '0.6rem 1.2rem', backgroundColor: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>+ Citation</button>
                  <button type="button" onClick={() => handleAddBlock('parallax')} style={{ padding: '0.6rem 1.2rem', backgroundColor: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>+ Image Parallaxe</button>
                </div>

              </div>
            </section>
          </main>
        </div>
      )}
    </div>
  );
}