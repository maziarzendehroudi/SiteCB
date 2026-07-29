import React from 'react';

export default function AdminDashboard({ username, onLogout, onNavigate }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Barre de navigation supérieure */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h1 className="text-lg font-semibold text-gray-900">CMS Admin</h1>
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
            Connecté en tant que <span className="font-medium text-gray-900">{username}</span>
          </span>
        </div>
        <button
          onClick={onLogout}
          className="text-sm text-gray-600 hover:text-red-600 transition-colors font-medium"
        >
          Déconnexion
        </button>
      </header>

      {/* Contenu principal / Grille des modules */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-light text-gray-900">Tableau de bord</h2>
          <p className="text-sm text-gray-600 mt-1">
            Sélectionnez un module ci-dessous pour gérer le contenu de votre site.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Carte Pages Statiques */}
          <div 
            onClick={() => onNavigate('pages')}
            className="bg-white p-6 rounded-lg border border-gray-200 hover:border-gray-400 cursor-pointer transition-all shadow-sm hover:shadow"
          >
            <div className="text-gray-900 font-semibold mb-2">Pages Statiques</div>
            <p className="text-sm text-gray-600">
              Modifier le contenu textuel et la structure des pages principales du site (Accueil, Cabinet, Approche, etc.).
            </p>
          </div>

          {/* Carte Blog */}
          <div 
            onClick={() => onNavigate('blog')}
            className="bg-white p-6 rounded-lg border border-gray-200 hover:border-gray-400 cursor-pointer transition-all shadow-sm hover:shadow"
          >
            <div className="text-gray-900 font-semibold mb-2">Articles de Blog</div>
            <p className="text-sm text-gray-600">
              Rédiger, éditer ou supprimer des articles et réflexions publiés sur le site.
            </p>
          </div>

          {/* Carte Médias */}
          <div 
            onClick={() => onNavigate('media')}
            className="bg-white p-6 rounded-lg border border-gray-200 hover:border-gray-400 cursor-pointer transition-all shadow-sm hover:shadow"
          >
            <div className="text-gray-900 font-semibold mb-2">Gestion des Médias</div>
            <p className="text-sm text-gray-600">
              Importer et organiser les images et documents utilisés dans les pages et les articles.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}