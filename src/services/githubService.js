/**
 * Service de gestion des commits automatiques via l'API GitHub
 */

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Encode une chaîne de caractères UTF-8 en Base64 de manière sécurisée (compatible accents)
 */
function encodeUTF8ToBase64(str) {
  const utf8Bytes = new TextEncoder().encode(str);
  let binaryString = '';
  const len = utf8Bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binaryString += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binaryString);
}

/**
 * Décode une chaîne Base64 en texte UTF-8 lisible (utile pour récupérer le contenu des fichiers)
 */
export function decodeBase64ToUTF8(base64Str) {
  const cleanedBase64 = base64Str.replace(/\s/g, '');
  const binaryString = atob(cleanedBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Enregistre ou met à jour un fichier Markdown dans le dépôt GitHub du client.
 * 
 * @param {Object} params
 * @param {string} params.owner - Propriétaire du dépôt (ex: 'maziarzendehroudi')
 * @param {string} params.repo - Nom du dépôt (ex: 'SiteCB')
 * @param {string} params.path - Chemin du fichier dans le dépôt (ex: 'content/pages/accueil.md')
 * @param {string} params.message - Message du commit
 * @param {string} params.content - Contenu complet du fichier (Markdown + Frontmatter)
 * @param {string} params.token - Token d'accès personnel GitHub de l'administrateur
 * @param {string} [params.branch='main'] - Branche cible (par défaut 'main' ou 'master')
 */
export async function saveFileToGitHub({
  owner,
  repo,
  path,
  message,
  content,
  token,
  branch = 'main'
}) {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;

  try {
    // 1. Récupérer le SHA du fichier existant si il existe (requis par l'API GitHub pour une mise à jour)
    let sha = null;
    const getResponse = await fetch(`${url}?ref=${branch}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (getResponse.ok) {
      const fileData = await getResponse.json();
      sha = fileData.sha;
    }

    // 2. Encoder le contenu en Base64 compatible UTF-8 via TextEncoder
    const encodedContent = encodeUTF8ToBase64(content);

    // 3. Envoyer la requête PUT pour créer ou mettre à jour le fichier
    const putResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({
        message: message,
        content: encodedContent,
        branch: branch,
        ...(sha && { sha }) // Inclut le SHA uniquement s'il s'agit d'une mise à jour
      })
    });

    if (!putResponse.ok) {
      const errorData = await putResponse.json();
      throw new Error(`Erreur GitHub API: ${errorData.message || putResponse.statusText}`);
    }

    const result = await putResponse.json();
    return {
      success: true,
      commit: result.commit,
      content: result.content
    };

  } catch (error) {
    console.error('Erreur lors du commit automatique sur GitHub :', error);
    return {
      success: false,
      error: error.message
    };
  }
}