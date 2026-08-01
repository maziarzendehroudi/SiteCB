import React, { useState, useEffect, useRef } from 'react';
import { saveFileToGitHub, getFileFromGitHub } from '../services/githubService';
import { getGlobalSettings } from '../services/contentService';

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

  const [settings, setSettings] = useState(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(null);

  const [metaTitle, setMetaTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [blocks, setBlocks] = useState([]);
  
  const [editingIndex, setEditingIndex] = useState(null);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const owner = 'maziarzendehroudi';
  const repo = 'SiteCB';
  const token = sessionStorage.getItem('github_admin_token') || localStorage.getItem('github_token');

  // Chargement des paramètres globaux
  useEffect(() => {
    getGlobalSettings().then(data => {
      setSettings(data);
      setTempSettings(JSON.parse(JSON.stringify(data)));
    });
  }, []);

  // Parser DOM robuste (remplace les regex instables)
  useEffect(() => {
    async function fetchPageContent() {
      setLoading(true);
      setMessage(null);
      setEditingIndex(null); 
      
      try {
        const rawContent = await getFileFromGitHub({
          owner, repo, path: selectedPage.path, token, branch: 'main'
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
          
          // Utilisation du DOMParser pour une lecture infaillible de la structure
          const parser = new DOMParser();
          const doc = parser.parseFromString(body, 'text/html');
          const elements = doc.body.querySelectorAll('h1, h2, p, .parallax-bg, img.standard-image');

          if (elements.length > 0) {
            let i = 0;
            while (i < elements.length) {
              const el = elements[i];
              
              if (el.tagName === 'H1') {
                parsedBlocks.push({ type: 'heading1', content: el.innerHTML.trim() });
              } else if (el.tagName === 'H2') {
                parsedBlocks.push({ type: 'heading2', content: el.innerHTML.trim() });
              } else if (el.tagName === 'P') {
                if (el.classList.contains('citation')) {
                  const text = el.innerHTML.replace(/^"|"$/g, '').trim();
                  let author = '';
                  // Vérifie si le paragraphe suivant est l'auteur
                  if (i + 1 < elements.length && elements[i+1].tagName === 'P' && elements[i+1].classList.contains('auteur')) {
                    author = elements[i+1].innerHTML.trim();
                    i++; 
                  }
                  parsedBlocks.push({ type: 'citation', text, author });
                } else if (!el.classList.contains('auteur')) {
                  const cleanText = el.innerHTML.replace(/<br\s*\/?>/gi, '\n').trim();
                  parsedBlocks.push({ type: 'paragraph', content: cleanText });
                }
              } else if (el.tagName === 'DIV' && el.classList.contains('parallax-bg')) {
                const style = el.getAttribute('style') || '';
                const match = style.match(/background-image:\s*url\(['"]?(.*?)['"]?\)/);
                if (match) parsedBlocks.push({ type: 'image', variant: 'parallax', content: match[1] });
              } else if (el.tagName === 'IMG') {
                parsedBlocks.push({ type: 'image', variant: 'standard', content: el.getAttribute('src') });
              }
              i++;
            }
          } else {
            // Fallback si markdown pur sans HTML
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

    if (token) fetchPageContent();
  }, [selectedPage, token]);

  const handleAddBlock = (type) => {
    let newBlock = { type, content: 'Nouveau contenu...' };
    if (type === 'heading2') newBlock = { type, content: 'Nouveau sous-titre' };
    if (type === 'citation') newBlock = { type, text: 'Citation...', author: 'Auteur' };
    if (type === 'image') newBlock = { type, variant: 'parallax', content: 'assets/img/apropos1.jpg' };
    
    setBlocks([...blocks, newBlock]);
    setEditingIndex(blocks.length);
  };

  const handleBlockChange = (index, field, value) => {
    const updated = [...blocks];
    updated[index][field] = value;
    setBlocks(updated);
  };

  // Insertion de balises HTML simples pour le Rich Text
  const insertTag = (index, tag) => {
    const textarea = document.getElementById(`textarea-${index}`);
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    const before = text.substring(0, start);
    const selected = text.substring(start, end) || 'texte';
    const after = text.substring(end);
    
    const newText = `${before}<${tag}>${selected}</${tag}>${after}`;
    handleBlockChange(index, 'content', newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2 + selected.length);
    }, 0);
  };

  const handleDeleteBlock = (index) => {
    setBlocks(blocks.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  const handleDragStart = (e, position) => { dragItem.current = position; };
  const handleDragEnter = (e, position) => { dragOverItem.current = position; };
  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const _blocks = [...blocks];
      const draggedItemContent = _blocks.splice(dragItem.current, 1)[0];
      _blocks.splice(dragOverItem.current, 0, draggedItemContent);
      setBlocks(_blocks);
      if (editingIndex === dragItem.current) setEditingIndex(dragOverItem.current);
      else setEditingIndex(null);
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
      } else if (block.type === 'image') {
        if (block.variant === 'parallax') {
          bodyContent += `    </div>\n</section>\n\n<div class="parallax-bg" style="background-image: url('${block.content}');"></div>\n\n<section class="text-section">\n    <div class="container" style="max-width: 980px; margin: 0 auto; padding: 0 2rem;">\n`;
        } else {
          bodyContent += `        <img class="standard-image" src="${block.content}" alt="" style="max-width: 100%; height: auto; display: block; margin: 2rem auto; border-radius: 8px;" />\n`;
        }
      }
    });

    bodyContent += `    </div>\n</section>\n`;

    return `---\ntitle: "${metaTitle}"\nslug: "${pageSlug}"\n---\n\n${bodyContent}`;
  };

  const handleSavePage = async () => {
    setSaving(true);
    setMessage(null);
    setEditingIndex(null);

    const result = await saveFileToGitHub({
      owner, repo, path: selectedPage.path,
      message: `Mise à jour de la page ${selectedPage.name}`,
      content: generateMarkdownContent(), token,
    });

    setSaving(false);
    if (result.success) {
      setMessage({ type: 'success', text: "Page sauvegardée avec succès !" });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: `Erreur : ${result.error}` });
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    const result = await saveFileToGitHub({
      owner, repo, path: 'content/settings.json',
      message: 'Mise à jour des paramètres globaux (Header/Footer)',
      content: JSON.stringify(tempSettings, null, 2), token
    });
    setSaving(false);
    if (result.success) {
      setSettings(tempSettings);
      setEditingSettings(false);
      setMessage({ type: 'success', text: "Paramètres globaux mis à jour !" });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: `Erreur settings : ${result.error}` });
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
      
      {/* MENU FLOTTANT ADMIN */}
      <div style={{
        position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
        backgroundColor: 'rgba(40, 40, 40, 0.95)', backdropFilter: 'blur(8px)',
        padding: '0.75rem 1.5rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '1.5rem',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a3a3a3', fontSize: '0.9rem', fontWeight: 500, padding: 0 }}>
          ← Quitter
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
          {STATIC_PAGES.map(p => <option key={p.id} value={p.id} style={{ color: '#000' }}>{p.name}</option>)}
        </select>
        <button
          type="button" onClick={handleSavePage} disabled={saving}
          style={{ padding: '0.6rem 1.5rem', backgroundColor: '#6F4B21', color: '#ffffff', border: 'none', borderRadius: '30px', fontSize: '0.9rem', fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}
        >
          {saving ? "⏳..." : "✔ Publier"}
        </button>
      </div>

      {message && (
        <div style={{ position: 'fixed', top: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '1rem 2rem', borderRadius: '50px', fontSize: '0.9rem', fontWeight: 500, backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2', color: message.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          {message.text}
        </div>
      )}

      {/* MODAL EDITION SETTINGS GLOBAUX */}
      {editingSettings && tempSettings && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>Éditer les éléments globaux</h3>
            
            <h4 style={{ color: '#6F4B21' }}>En-tête (Header)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <input type="text" value={tempSettings.header.title} onChange={e => setTempSettings({...tempSettings, header: {...tempSettings.header, title: e.target.value}})} placeholder="Titre (Nom)" style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}/>
              <input type="text" value={tempSettings.header.subtitle1} onChange={e => setTempSettings({...tempSettings, header: {...tempSettings.header, subtitle1: e.target.value}})} placeholder="Sous-titre 1" style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}/>
              <input type="text" value={tempSettings.header.subtitle2} onChange={e => setTempSettings({...tempSettings, header: {...tempSettings.header, subtitle2: e.target.value}})} placeholder="Sous-titre 2" style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}/>
              <input type="text" value={tempSettings.header.info1} onChange={e => setTempSettings({...tempSettings, header: {...tempSettings.header, info1: e.target.value}})} placeholder="Info 1 (Lieu)" style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}/>
              <input type="text" value={tempSettings.header.info2} onChange={e => setTempSettings({...tempSettings, header: {...tempSettings.header, info2: e.target.value}})} placeholder="Info 2 (Ville)" style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}/>
              <input type="text" value={tempSettings.header.info3} onChange={e => setTempSettings({...tempSettings, header: {...tempSettings.header, info3: e.target.value}})} placeholder="Info 3 (Téléphone)" style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}/>
            </div>

            <h4 style={{ color: '#6F4B21' }}>Pied de page (Footer)</h4>
            <input type="text" value={tempSettings.footer.text} onChange={e => setTempSettings({...tempSettings, footer: {...tempSettings.footer, text: e.target.value}})} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '2rem' }}/>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button onClick={() => setEditingSettings(false)} style={{ padding: '0.5rem 1rem', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleSaveSettings} style={{ padding: '0.5rem 1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '8rem 0', color: 'var(--text)', fontSize: '1.1rem' }}>Chargement et analyse de la page...</div>
      ) : (
        <div className="site-wrapper" style={{ flex: 1, backgroundColor: '#fcfbf9', textAlign: 'left', paddingBottom: '8rem' }}>
          
          {/* HEADER 1:1 AVEC BOUTON D'EDITION */}
          {settings && (
            <div style={{ position: 'relative' }} onMouseEnter={e => e.currentTarget.querySelector('.edit-overlay').style.opacity = '1'} onMouseLeave={e => e.currentTarget.querySelector('.edit-overlay').style.opacity = '0'}>
              <div className="edit-overlay" style={{ position: 'absolute', top: '10px', right: '10px', opacity: 0, transition: 'opacity 0.2s', zIndex: 10 }}>
                <button onClick={() => setEditingSettings(true)} style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: '30px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>✎ Éditer l'en-tête</button>
              </div>
              <header style={{ pointerEvents: 'none' }}>
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
                  <ul className="nav-menu">
                    {settings.menu.map(item => (
                      <li key={item.id} className={selectedPage.id.startsWith(item.slug) ? 'active' : ''}>
                        <a href={`#${item.slug}`}>{item.label}</a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </header>
            </div>
          )}

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
                          position: 'relative', borderRadius: '8px', border: '2px dashed transparent',
                          padding: isEditing ? '1.5rem' : '0.5rem', margin: isEditing ? '1rem 0' : '0',
                          backgroundColor: isEditing ? '#f8f9fa' : 'transparent', transition: 'all 0.2s',
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
                              <div>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                  <button type="button" onClick={() => insertTag(index, 'strong')} style={{ padding: '0.3rem 0.6rem', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>G</button>
                                  <button type="button" onClick={() => insertTag(index, 'em')} style={{ padding: '0.3rem 0.6rem', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontStyle: 'italic' }}>I</button>
                                  <button type="button" onClick={() => insertTag(index, 'u')} style={{ padding: '0.3rem 0.6rem', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer', textDecoration: 'underline' }}>S</button>
                                </div>
                                <textarea id={`textarea-${index}`} rows={6} value={block.content} onChange={(e) => handleBlockChange(index, 'content', e.target.value)} style={{ width: '100%', fontSize: '1rem', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit', resize: 'vertical' }} placeholder="Saisissez votre texte ici..." />
                              </div>
                            )}

                            {block.type === 'citation' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <textarea rows={3} value={block.text} onChange={(e) => handleBlockChange(index, 'text', e.target.value)} style={{ width: '100%', fontSize: '1rem', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit' }} placeholder="Texte de la citation..." />
                                <input type="text" value={block.author} onChange={(e) => handleBlockChange(index, 'author', e.target.value)} style={{ width: '100%', fontSize: '1rem', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit' }} placeholder="Auteur (laisser vide si aucun)" />
                              </div>
                            )}

                            {block.type === 'image' && (
                              <div>
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    <input type="radio" name={`variant-${index}`} checked={block.variant === 'parallax'} onChange={() => handleBlockChange(index, 'variant', 'parallax')} />
                                    Image Parallaxe pleine largeur
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    <input type="radio" name={`variant-${index}`} checked={block.variant === 'standard'} onChange={() => handleBlockChange(index, 'variant', 'standard')} />
                                    Image Standard intégrée
                                  </label>
                                </div>
                                <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.3rem', fontWeight: 'bold' }}>Chemin de l'image (dossier assets/img/)</label>
                                <input type="text" value={block.content} onChange={(e) => handleBlockChange(index, 'content', e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '0.5rem' }} />
                                
                                {block.variant === 'parallax' ? (
                                  <div className="parallax" style={{ backgroundImage: `url('${getPreviewImageUrl(block.content)}')`, height: '150px', borderRadius: '6px', backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid #e5e7eb' }} />
                                ) : (
                                  <img src={getPreviewImageUrl(block.content)} alt="preview" style={{ maxWidth: '100%', maxHeight: '200px', display: 'block', borderRadius: '6px', border: '1px solid #e5e7eb' }} />
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ pointerEvents: 'none' }}>
                            {block.type === 'heading1' && <h1 className="main-title text-center" style={{ fontSize: '2.2rem', marginBottom: '2rem', fontWeight: 300, color: '#4a4a4a' }}>{block.content}</h1>}
                            {block.type === 'heading2' && <h2 style={{ fontSize: '1.8rem', margin: '2rem 0 1rem', fontWeight: 300, color: '#4a4a4a' }}>{block.content}</h2>}
                            {block.type === 'paragraph' && <p style={{ fontSize: '1.15rem', fontWeight: 300, marginBottom: '1.2rem', textAlign: 'justify', lineHeight: 1.5, color: '#4a4a4a' }} dangerouslySetInnerHTML={{ __html: block.content.replace(/\n/g, '<br/>') }} />}
                            {block.type === 'citation' && (
                              <div style={{ margin: '0' }}>
                                <p style={{ fontSize: '30px', color: 'rgb(111, 75, 33)', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.3, marginBottom: '0', textAlign: 'center' }}>"{block.text}"</p>
                                {block.author && <p style={{ fontSize: '1.1rem', fontWeight: 300, marginTop: '0', marginBottom: '2rem', textAlign: 'center' }}>{block.author}</p>}
                              </div>
                            )}
                            {block.type === 'image' && block.variant === 'parallax' && (
                              <div style={{ backgroundImage: `url('${getPreviewImageUrl(block.content)}')`, height: '400px', width: '100vw', position: 'relative', left: '50%', right: '50%', marginLeft: '-50vw', marginRight: '-50vw', backgroundAttachment: 'fixed', backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat' }} />
                            )}
                            {block.type === 'image' && block.variant === 'standard' && (
                              <img src={getPreviewImageUrl(block.content)} alt="" style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '2rem auto', borderRadius: '8px' }} />
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
                  <button type="button" onClick={() => handleAddBlock('image')} style={{ padding: '0.6rem 1.2rem', backgroundColor: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '30px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>+ Image / Parallaxe</button>
                </div>

              </div>
            </section>
          </main>
          
          {/* FOOTER 1:1 AVEC BOUTON D'EDITION */}
          {settings && (
             <div style={{ position: 'relative' }} onMouseEnter={e => e.currentTarget.querySelector('.edit-overlay').style.opacity = '1'} onMouseLeave={e => e.currentTarget.querySelector('.edit-overlay').style.opacity = '0'}>
               <div className="edit-overlay" style={{ position: 'absolute', bottom: '20px', right: '10px', opacity: 0, transition: 'opacity 0.2s', zIndex: 10 }}>
                 <button onClick={() => setEditingSettings(true)} style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '0.4rem 1rem', borderRadius: '30px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>✎ Éditer le pied de page</button>
               </div>
               <footer style={{ pointerEvents: 'none' }}>
                 <div className="footer-container">
                   <div>{settings.footer.text}</div>
                   <div>Administration CMS</div>
                 </div>
               </footer>
             </div>
          )}
        </div>
      )}
    </div>
  );
}