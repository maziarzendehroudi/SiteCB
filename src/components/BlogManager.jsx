import React, { useState, useEffect } from 'react';
import { saveFileToGitHub } from '../services/githubService';

export default function BlogManager({ onBack }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('list'); // 'list', 'edit', 'create'
  const [selectedArticle, setSelectedArticle] = useState(null);
  
  // Champs du formulaire d'édition/création
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [date, setDate] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const owner = 'maziarzendehroudi';
  const repo = 'SiteCB';
  const token = localStorage.getItem('github_token') || sessionStorage.getItem('github_admin_token');

  // Charger la liste des articles depuis le dossier /content/blog/
  const fetchArticles = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/content/blog`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
        }
      });

      if (!res.ok) {
        if (res.status === 404) {
          setArticles([]);
          setLoading(false);
          return;
        }
        throw new Error("Impossible de récupérer la liste des articles.");
      }

      const data = await res.json();
      // Filtrer uniquement les fichiers .md
      const mdFiles = data.filter(file => file.type === 'file' && file.name.endsWith('.md'));
      setArticles(mdFiles);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [token]);

  // Préparer la création d'un nouvel article
  const handleNewArticle = () => {
    setTitle('');
    setSlug('');
    setDate(new Date().toISOString().split('T')[0]);
    setSummary('');
    setBody('Écrivez votre article ici...');
    setSelectedArticle(null);
    setCurrentView('create');
    setMessage(null);
  };

  // Charger un article pour édition
  const handleEditArticle = async (file) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(file.download_url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
        }
      });
      if (!res.ok) throw new Error("Erreur lors du chargement de l'article.");
      
      const rawContent = await res.text();
      
      // Analyse basique du Frontmatter YAML et du contenu
      // Format attendu : ---\ntitle: ...\ndate: ...\nsummary: ...\n---\nCorps
      const match = rawContent.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/);
      
      let parsedTitle = '';
      let parsedDate = '';
      let parsedSummary = '';
      let parsedBody = rawContent;

      if (match) {
        const frontmatter = match[1];
        parsedBody = match[2].trim();

        const tMatch = frontmatter.match(/title:\s*"?(.*?)"?$/m);
        const dMatch = frontmatter.match(/date:\s*"?(.*?)"?$/m);
        const sMatch = frontmatter.match(/summary:\s*"?(.*?)"?$/m);

        if (tMatch) parsedTitle = tMatch[1].trim();
        if (dMatch) parsedDate = dMatch[1].trim();
        if (sMatch) parsedSummary = sMatch[1].trim();
      }

      setTitle(parsedTitle);
      setSlug(file.name.replace('.md', ''));
      setDate(parsedDate);
      setSummary(parsedSummary);
      setBody(parsedBody);
      setSelectedArticle(file);
      setCurrentView('edit');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder (Création ou Mise à jour)
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const generatedSlug = slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const path = `content/blog/${generatedSlug}.md`;

    // Reconstitution du fichier Markdown avec Frontmatter
    const fileContent = `---
title: "${title}"
date: "${date}"
summary: "${summary}"
---
${body}
`;

    const result = await saveFileToGitHub({
      owner,
      repo,
      path,
      message: currentView === 'create' ? `Création de l'article de blog: ${title}` : `Mise à jour de l'article: ${title}`,
      content: fileContent,
      token,
    });

    setSaving(false);
    if (result.success) {
      setMessage({ type: 'success', text: "Article enregistré avec succès !" });
      setTimeout(() => {
        setCurrentView('list');
        fetchArticles();
      }, 1000);
    } else {
      setMessage({ type: 'error', text: `Erreur : ${result.error}` });
    }
  };

  // Supprimer un article
  const handleDelete = async (file) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer l'article ${file.name} ?`)) return;

    setLoading(true);
    try {
      // Récupérer le SHA requis pour la suppression via l'API GitHub
      const getRes = await fetch(file.url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
        }
      });
      if (!getRes.ok) throw new Error("Impossible de récupérer les métadonnées du fichier.");
      const fileData = await getRes.json();

      const delRes = await fetch(file.url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Suppression de l'article ${file.name}`,
          sha: fileData.sha,
        })
      });

      if (!delRes.ok) throw new Error("Erreur lors de la suppression sur GitHub.");

      fetchArticles();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <button
          onClick={() => currentView === 'list' ? onBack() : setCurrentView('list')}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium flex items-center space-x-2"
        >
          <span>← {currentView === 'list' ? 'Retour au tableau de bord' : 'Retour à la liste des articles'}</span>
        </button>
        <h1 className="text-sm font-semibold text-gray-900">Gestionnaire de Blog</h1>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-8">
        {message && (
          <div className={`p-4 mb-6 text-sm rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {currentView === 'list' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-light text-gray-900">Articles de Blog</h2>
                <p className="text-sm text-gray-600 mt-1">Gérez vos publications et réflexions.</p>
              </div>
              <button
                onClick={handleNewArticle}
                className="py-2 px-4 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                + Nouvel article
              </button>
            </div>

            {loading ? (
              <div className="text-center py-16 text-gray-500 text-sm">Chargement des articles...</div>
            ) : articles.length === 0 ? (
              <div className="bg-white p-8 rounded-lg border border-gray-200 text-center text-gray-500 text-sm">
                Aucun article trouvé dans le dossier <code className="bg-gray-100 px-1 py-0.5 rounded">content/blog/</code>.
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">Nom du fichier / Slug</th>
                      <th className="px-6 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {articles.map((file) => (
                      <tr key={file.sha} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{file.name}</td>
                        <td className="px-6 py-4 text-right space-x-4">
                          <button
                            onClick={() => handleEditArticle(file)}
                            className="text-gray-600 hover:text-gray-900 font-medium"
                          >
                            Éditer
                          </button>
                          <button
                            onClick={() => handleDelete(file)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {(currentView === 'create' || currentView === 'edit') && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-light text-gray-900">
                {currentView === 'create' ? 'Rédiger un nouvel article' : `Modifier : ${selectedArticle?.name}`}
              </h2>
            </div>

            <form onSubmit={handleSave} className="space-y-4 bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">Titre</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">Slug (nom du fichier .md)</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="mon-super-article"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">Résumé / Extrait</label>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">Contenu (Markdown)</label>
                <textarea
                  rows={12}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full font-mono text-xs p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900 leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('list')}
                  className="py-2 px-4 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="py-2 px-6 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Enregistrer et publier"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}