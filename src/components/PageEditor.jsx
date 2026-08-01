import React, { useState, useEffect, useRef } from 'react';
import { saveFileToGitHub, getFileFromGitHub } from '../services/githubService';

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
  // Correction de la clé du token pour matcher avec AdminLogin
  const token = sessionStorage.getItem('github_admin_token') || localStorage.getItem('github_token');

  // Parser intelligent de la page active en blocs riches
  useEffect(() => {
    async function fetchPageContent() {
      setLoading(true);
      setMessage(null);
      setEditingIndex(null); 
      
      try {
        // Utilisation du service centralisé robuste (qui gère l'UTF-8 et le cache-busting correctement)
        const rawContent = await getFileFromGitHub({
          owner,
          repo,
          path: selectedPage.path,
          token,
          branch: 'main'
        });

        if (!rawContent) throw new Error("Fichier introuvable sur GitHub.");

        const fmMatch = rawContent.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/);
        
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
          setBlocks([{ type: 'paragraph', content: rawContent }]);
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
      message: `Mise à jour visuelle de la page ${selectedPage.name}`,
      content: finalContent,
      token,
    });

    setSaving(false);
    if (result.success) {
      setMessage({ type: 'success', text: "Sauvegardé et publié avec succès !" });
      // On efface le message après 3 secondes pour ne pas polluer l'écran
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: `Erreur : ${result.error}` });
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
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* MENU FLOTTANT (Remplacement de l'ancien Header Noir) */}
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 9999,
        backgroundColor: 'rgba(40, 40, 40, 0.95)',
        backdropFilter: 'blur(8px)',
        padding: '0.75rem 1.5rem',
        borderRadius: '50px',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a3a3a3', fontSize: '0.9rem', fontWeight: 500, padding: 0 }}>
          ← Retour
        </button>
        
        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>
        
        <select
          value={selectedPage.id}
          onChange={(e) => {
            const page = STATIC_PAGES.find(p => p.id === e.target.value);
            setSelectedPage(page);
          }}
          style={{ background: 'transparent', color: '#ffffff', border: 'none', fontSize: '0.95rem', cursor: 'pointer', outline: 'none', fontWeight: 500 }}
        >
          {STATIC_PAGES.map(p => (
            <option key={p.id} value={p.id} style={{ color: '#000' }}>{p.name}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '0.6rem 1.5rem', backgroundColor: '#6F4B21', color: '#ffffff', border: 'none', borderRadius: '30px', fontSize: '0.9rem', fontWeight: 600, cursor: saving ? 'wait' : 'pointer', transition: 'background 0.2s' }}
        >
          {saving ? "⏳..." : "✔ Publier"}
        </button>
      </div>

      {/* NOTIFICATIONS FLOTTANTES */}
      {message && (
        <div style={{ position: 'fixed', top: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '1rem 2rem', borderRadius: '50px', fontSize: '0.9rem', fontWeight: 500, backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2', color: message.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '8rem 0', color: 'var(--text)', fontSize: '1.1rem' }}>Chargement de la page...</div>
      ) : (
        <div className="site-wrapper" style={{ flex: 1, backgroundColor: 'transparent', textAlign: 'left', paddingBottom: '8rem' }}>
          
          {/* ZONE RESERVÉE POUR LE HEADER PUBLIC (Étape suivante) */}
          <div style={{ textAlign: 'center', padding: '1rem', borderBottom: '1px dashed #ccc', color: '#888', fontStyle: 'italic', backgroundColor: '#fafafa' }}>
            [ Le Header du site viendra s'insérer ici ]
          </div>

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
                          borderRadius: '8px', 
                          border: '2px dashed transparent',
                          padding: isEditing ? '1.5rem' : '0.5rem',
                          margin: isEditing ? '1rem 0' : '0',
                          backgroundColor: isEditing ? '#f8f9fa' : 'transparent',
                          transition: 'all 0.2s',
                          cursor: isEditing ? 'default' : 'grab'
                        }}
                        onMouseEnter={(e) => {
                          if (!isEditing) {
                            e.currentTarget.style.border = '2px dashed #d1d5db';
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
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
                              background: '#fff', padding: '0.4rem 1rem', borderRadius: '30px', 
                              boxShadow: '0 2px 10px rgba(0,0,0,0.1)', opacity: '0', transition: 'opacity 0.2s', zIndex: 10,
                              border: '1px solid #e5e7eb', alignItems: 'center'
                            }}
                          >
                            <span style={{ fontSize: '0.75rem', color: '#6b7280', cursor: 'grab', marginRight: '0.5rem' }}>⋮⋮ Glisser</span>
                            <button type="button" onClick={() => setEditingIndex(index)} style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>✎ Éditer</button>
                            <button type="button" onClick={() => handleDeleteBlock(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>× Supprimer</button>
                          </div>
                        )}

                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151', textTransform: 'uppercase' }}>Édition : {block.type}</span>
                              <button type="button" onClick={() => setEditingIndex(null)} style={{ padding: '0.4rem 1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>✔ Terminer</button>
                            </div>

                            {block.type === 'heading1' && (
                              <input type="text" value={block.content} onChange={(e) => handleBlockChange(index, 'content', e.target.value)} style={{ width: '100%', fontSize: '1.2rem', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit' }} placeholder="Titre principal (H1)" />
                            )}

                            {block.type === 'heading2' && (
                              <input type="text" value={block.content} onChange={(e) => handleBlockChange(index, 'content', e.target.value)} style={{ width: '100%', fontSize: '1.1rem', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit' }} placeholder="Sous-titre (H2)" />
                            )}

                            {block.type === 'paragraph' && (
                              <textarea rows={6} value={block.content} onChange={(e) => handleBlockChange(index, 'content', e.target.value)} style={{ width: '100%', fontSize: '1rem', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit', resize: 'vertical' }} placeholder="Saisissez votre texte ici..." />
                            )}

                            {block.type === 'citation' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <textarea rows={3} value={block.text} onChange={(e) => handleBlockChange(index, 'text', e.target.value)} style={{ width: '100%', fontSize: '1rem', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit' }} placeholder="Texte de la citation..." />
                                <input type="text" value={block.author} onChange={(e) => handleBlockChange(index, 'author', e.target.value)} style={{ width: '100%', fontSize: '1rem', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit' }} placeholder="Auteur (laisser vide si aucun)" />
                              </div>
                            )}

                            {block.type === 'parallax' && (
                              <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.3rem', fontWeight: 'bold' }}>Chemin de l'image (dossier assets/img/)</label>
                                <input type="text" value={block.content} onChange={(e) => handleBlockChange(index, 'content', e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '0.5rem' }} />
                                <div className="parallax" style={{ backgroundImage: `url('${getPreviewImageUrl(block.content)}')`, height: '150px', borderRadius: '6px', backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid #e5e7eb' }} />
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
                                <p style={{ fontSize: '30px', color: 'rgb(111, 75, 33)', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.3, marginBottom: '0', textAlign: 'center' }}>"{block.text}"</p>
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

                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '4rem', borderTop: '1px solid #e5e7eb', paddingTop: '2rem' }}>
                  <button type="button" onClick={() => handleAddBlock('paragraph')} style={{ padding: '0.6rem 1.2rem', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '30px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>+ Texte</button>
                  <button type="button" onClick={() => handleAddBlock('heading2')} style={{ padding: '0.6rem 1.2rem', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '30px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>+ Titre</button>
                  <button type="button" onClick={() => handleAddBlock('citation')} style={{ padding: '0.6rem 1.2rem', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '30px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>+ Citation</button>
                  <button type="button" onClick={() => handleAddBlock('parallax')} style={{ padding: '0.6rem 1.2rem', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '30px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>+ Image / Parallaxe</button>
                </div>

              </div>
            </section>
          </main>
          
          {/* ZONE RESERVÉE POUR LE FOOTER PUBLIC (Étape suivante) */}
          <div style={{ textAlign: 'center', padding: '1rem', borderTop: '1px dashed #ccc', color: '#888', fontStyle: 'italic', backgroundColor: '#fafafa', marginTop: '2rem' }}>
            [ Le Footer du site viendra s'insérer ici ]
          </div>
        </div>
      )}
    </div>
  );
}