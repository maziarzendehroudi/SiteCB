import React, { useState, useEffect } from 'react';
import { saveFileToGitHub } from '../services/githubService';

// Liste exhaustive des pages statiques réelles du projet
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
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const owner = 'maziarzendehroudi';
  const repo = 'SiteCB';
  // Harmonisation avec le localStorage utilisé dans App.jsx
  const token = localStorage.getItem('github_token') || sessionStorage.getItem('github_admin_token');

  // Charger le contenu de la page sélectionnée depuis GitHub
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
        // Décodage du Base64 propre en UTF-8
        const decodedContent = decodeURIComponent(
          atob(data.content).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        );
        setContent(decodedContent);
      } catch (err) {
        setMessage({ type: 'error', text: err.message });
        setContent('');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchPageContent();
    } else {
      setMessage({ type: 'error', text: "Token d'authentification manquant. Veuillez vous reconnecter." });
      setLoading(false);
    }
  }, [selectedPage, token]);

  // Sauvegarde des modifications
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const result = await saveFileToGitHub({
      owner,
      repo,
      path: selectedPage.path,
      message: `Mise à jour de la page ${selectedPage.name} via CMS Admin`,
      content,
      token,
    });

    setSaving(false);
    if (result.success) {
      setMessage({ type: 'success', text: "Modifications enregistrées et commitées avec succès sur GitHub !" });
    } else {
      setMessage({ type: 'error', text: `Erreur lors de la sauvegarde : ${result.error}` });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Barre de navigation interne */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <button
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium flex items-center space-x-2 cursor-pointer"
        >
          <span>← Retour au tableau de bord</span>
        </button>
        <h1 className="text-sm font-semibold text-gray-900">Éditeur de Pages Statiques</h1>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-light text-gray-900">Édition de contenu</h2>
            <p className="text-sm text-gray-600 mt-1">Sélectionnez la page à modifier et ajustez son code Markdown (Frontmatter inclus).</p>
          </div>

          {/* Sélecteur de page */}
          <select
            value={selectedPage.id}
            onChange={(e) => {
              const page = STATIC_PAGES.find(p => p.id === e.target.value);
              setSelectedPage(page);
            }}
            className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 cursor-pointer"
          >
            {STATIC_PAGES.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {message && (
          <div className={`p-4 mb-6 text-sm rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-500 text-sm">Chargement du contenu...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-2">
                Contenu brut (Markdown & Frontmatter) : {selectedPage.path}
              </label>
              <textarea
                rows={18}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full font-mono text-xs p-4 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900 leading-relaxed"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="py-2.5 px-6 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {saving ? "Enregistrement en cours..." : "Enregistrer sur GitHub"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}