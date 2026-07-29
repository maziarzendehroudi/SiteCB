import React, { useState } from 'react';

export default function AdminLogin({ onLoginSuccess }) {
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!tokenInput.trim()) {
      setError("Veuillez entrer un token valide.");
      setLoading(false);
      return;
    }

    try {
      // Test rapide de validité du token via l'API GitHub (appel à l'utilisateur authentifié)
      const res = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${tokenInput.trim()}`,
          'Accept': 'application/vnd.github+json',
        }
      });

      if (!res.ok) {
        throw new Error("Token invalide ou permissions insuffisantes.");
      }

      const userData = await res.json();
      
      // Stockage sécurisé en session uniquement
      sessionStorage.setItem('github_admin_token', tokenInput.trim());
      sessionStorage.setItem('github_admin_user', userData.login);

      setLoading(false);
      onLoginSuccess(tokenInput.trim());

    } catch (err) {
      setError(err.message || "Échec de l'authentification.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-8 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">Administration CMS</h2>
      <p className="text-sm text-gray-600 mb-6">
        Entrez votre Personal Access Token GitHub (avec les droits <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">repo</code>) pour accéder au panneau de gestion.
      </p>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 uppercase tracking-wider mb-1">
            GitHub PAT (Token)
          </label>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="ghp_************************************"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 text-sm"
          />
        </div>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-colors"
        >
          {loading ? "Vérification..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}