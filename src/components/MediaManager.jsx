import React, { useState, useEffect } from 'react';
import { saveFileToGitHub } from '../services/githubService';

export default function MediaManager({ onBack }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  const owner = 'maziarzendehroudi';
  const repo = 'SiteCB';
  const token = sessionStorage.getItem('github_admin_token');
  const mediaPath = 'public/uploads';

  // Charger la liste des images depuis le dépôt
  const fetchImages = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${mediaPath}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
        }
      });

      if (!res.ok) {
        if (res.status === 404) {
          setImages([]);
          setLoading(false);
          return;
        }
        throw new Error("Impossible de récupérer la liste des images.");
      }

      const data = await res.json();
      // Filtrer les fichiers images courants
      const imgFiles = data.filter(file => file.type === 'file' && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file.name));
      setImages(imgFiles);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [token]);

  // Gérer l'upload d'un nouveau fichier image
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      // Extraire la partie Base64 pure du résultat du FileReader
      const base64Content = reader.result.split(',')[1];
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      const path = `${mediaPath}/${fileName}`;

      try {
        const result = await saveFileToGitHub({
          owner,
          repo,
          path,
          message: `Upload de l'image ${fileName} via CMS`,
          content: base64Content, // Note: notre service gérera l'encodage ou on peut l'adapter
          token,
        });

        if (result.success) {
          setMessage({ type: 'success', text: "Image uploadée avec succès !" });
          fetchImages();
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        setMessage({ type: 'error', text: `Erreur d'upload : ${err.message}` });
      } finally {
        setUploading(false);
        e.target.value = null; // Reset input
      }
    };
    reader.onerror = () => {
      setUploading(false);
      setMessage({ type: 'error', text: "Erreur lors de la lecture du fichier." });
    };
    reader.readAsDataURL(file);
  };

  // Supprimer une image
  const handleDelete = async (file) => {
    if (!window.confirm(`Voulez-vous supprimer l'image ${file.name} ?`)) return;

    setLoading(true);
    try {
      const getRes = await fetch(file.url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
        }
      });
      if (!getRes.ok) throw new Error("Impossible de récupérer les métadonnées de l'image.");
      const fileData = await getRes.json();

      const delRes = await fetch(file.url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Suppression de l'image ${file.name}`,
          sha: fileData.sha,
        })
      });

      if (!delRes.ok) throw new Error("Erreur lors de la suppression sur GitHub.");

      fetchImages();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <button
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium flex items-center space-x-2"
        >
          <span>← Retour au tableau de bord</span>
        </button>
        <h1 className="text-sm font-semibold text-gray-900">Gestion des Médias</h1>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-light text-gray-900">Bibliothèque d'images</h2>
            <p className="text-sm text-gray-600 mt-1">Ajoutez et gérez les visuels du site.</p>
          </div>
          <div>
            <label className={`py-2 px-4 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer inline-block ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploading ? "Téléversement..." : "+ Ajouter une image"}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {message && (
          <div className={`p-4 mb-6 text-sm rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-500 text-sm">Chargement des médias...</div>
        ) : images.length === 0 ? (
          <div className="bg-white p-8 rounded-lg border border-gray-200 text-center text-gray-500 text-sm">
            Aucune image trouvée dans <code className="bg-gray-100 px-1 py-0.5 rounded">{mediaPath}/</code>.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img) => (
              <div key={img.sha} className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col justify-between shadow-sm">
                <div className="h-32 bg-gray-100 rounded mb-3 overflow-hidden flex items-center justify-center">
                  <img src={img.download_url} alt={img.name} className="object-cover h-full w-full" />
                </div>
                <div className="text-xs text-gray-700 truncate mb-2 font-mono" title={img.name}>
                  {img.name}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`/uploads/${img.name}`);
                      alert("Chemin copié dans le presse-papier !");
                    }}
                    className="text-gray-600 hover:text-gray-900 font-medium"
                  >
                    Copier le chemin
                  </button>
                  <button
                    onClick={() => handleDelete(img)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}