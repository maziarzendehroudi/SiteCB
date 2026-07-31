import React from 'react';

export default function AdminDashboard({ username, onLogout, onNavigate }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fcfbf9', display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
      {/* Barre de navigation supérieure */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e6e2dd', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 400, color: '#4a4a4a', margin: 0 }}>CMS Admin</h1>
          <span style={{ fontSize: '0.8rem', backgroundColor: '#f4f2ee', color: '#4a4a4a', padding: '0.25rem 0.75rem', borderRadius: '50px' }}>
            Connecté <span style={{ fontWeight: 500 }}>{username || 'au dépôt GitHub'}</span>
          </span>
        </div>
        <button
          onClick={onLogout}
          style={{ fontSize: '0.9rem', color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
          onMouseOver={(e) => e.target.style.color = '#dc2626'}
          onMouseOut={(e) => e.target.style.color = '#666'}
        >
          Déconnexion
        </button>
      </header>

      {/* Contenu principal / Grille des modules */}
      <main style={{ flex: 1, maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '3rem 2rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 300, color: '#4a4a4a', margin: '0 0 0.5rem 0' }}>Tableau de bord</h2>
          <p style={{ fontSize: '1.05rem', color: '#666', margin: 0 }}>
            Sélectionnez un module ci-dessous pour gérer le contenu de votre site.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Carte Pages Statiques */}
          <div 
            onClick={() => onNavigate('pages')}
            style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '4px', border: '1px solid #e6e2dd', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#A3B1A9'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#e6e2dd'}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 400, color: '#4a4a4a', marginBottom: '0.75rem' }}>Pages Statiques</div>
            <p style={{ fontSize: '0.95rem', color: '#666', margin: 0, lineHeight: 1.5 }}>
              Modifier le contenu textuel et la structure des pages principales du site (Accueil, À propos, Cadre & tarifs, etc.).
            </p>
          </div>

          {/* Carte Blog */}
          <div 
            onClick={() => onNavigate('blog')}
            style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '4px', border: '1px solid #e6e2dd', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#A3B1A9'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#e6e2dd'}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 400, color: '#4a4a4a', marginBottom: '0.75rem' }}>Articles de Blog</div>
            <p style={{ fontSize: '0.95rem', color: '#666', margin: 0, lineHeight: 1.5 }}>
              Rédiger, éditer ou supprimer des articles et réflexions publiés sur le blog.
            </p>
          </div>

          {/* Carte Médias */}
          <div 
            onClick={() => onNavigate('media')}
            style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '4px', border: '1px solid #e6e2dd', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#A3B1A9'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#e6e2dd'}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 400, color: '#4a4a4a', marginBottom: '0.75rem' }}>Gestion des Médias</div>
            <p style={{ fontSize: '0.95rem', color: '#666', margin: 0, lineHeight: 1.5 }}>
              Importer et organiser les images utilisées dans les pages et les articles.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}