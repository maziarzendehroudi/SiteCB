/**
 * Service de gestion des commits automatiques via l'API GitHub
 */

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Encode une chaîne de caractères UTF-8 en Base64 de manière sécurisée (compatible accents)
 */
export function encodeUTF8ToBase64(str) {
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
 * NOUVEAU : Récupère la liste des fichiers d'un dossier en direct depuis GitHub (bypass cache)
 */
export async function getDirectoryFromGitHub({ owner, repo, path, token, branch = 'main' }) {
  const timestamp = new Date().getTime();
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}&t=${timestamp}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    }
  });

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Erreur GitHub API (Directory): ${response.statusText}`);
  }

  return await response.json();
}

/**
 * NOUVEAU : Récupère le contenu d'un fichier en direct depuis GitHub (bypass cache)
 */
export async function getFileFromGitHub({ owner, repo, path, token, branch = 'main' }) {
  const timestamp = new Date().getTime();
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}&t=${timestamp}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    }
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Erreur GitHub API (File): ${response.statusText}`);
  }

  const data = await response.json();
  return decodeBase64ToUTF8(data.content);
}

/**
 * Enregistre ou met à jour un fichier Markdown dans le dépôt GitHub du client.
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
    // 1. Récupérer le SHA du fichier existant (Requis pour UPDATE). 
    // AJOUT CACHE-BUSTING : t=${timestamp} pour forcer la lecture du nouveau SHA.
    let sha = null;
    const timestamp = new Date().getTime();
    const getResponse = await fetch(`${url}?ref=${branch}&t=${timestamp}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    if (getResponse.ok) {
      const fileData = await getResponse.json();
      sha = fileData.sha;
    }

    // 2. Encoder le contenu en Base64 compatible UTF-8
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