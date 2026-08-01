import { getFileFromGitHub, getDirectoryFromGitHub } from './githubService.js';

// Importe tous les fichiers .md situés dans content/pages/ et content/blog/ (Mode Public/Build)
const pageFiles = import.meta.glob('../../content/pages/*.md', { query: '?raw', import: 'default' });
const blogFiles = import.meta.glob('../../content/blog/*.md', { query: '?raw', import: 'default' });
// Import conditionnel des paramètres globaux
const settingsFileGlob = import.meta.glob('../../content/settings.json', { query: '?raw', import: 'default' });

// Configuration du dépôt
const GITHUB_OWNER = 'maziarzendehroudi';
const GITHUB_REPO = 'SiteCB';

export const DEFAULT_SETTINGS = {
  header: {
    title: "Camille Bongue",
    subtitle1: "Psychothérapeute",
    subtitle2: "Psychanalyste",
    info1: "Centre médical Adamantium",
    info2: "Cap Alpha, Clapiers",
    info3: "07 68 99 07 07"
  },
  menu: [
    { id: 'home', label: 'Accueil', slug: 'home', submenu: [] },
    { id: 'pour-qui', label: 'Pour qui ?', slug: 'pour-qui', submenu: [
        { id: 'enfants', label: 'Enfants', slug: 'pour-qui-enfants' },
        { id: 'ados', label: 'Adolescents', slug: 'pour-qui-adolescents' },
        { id: 'adultes', label: 'Adultes', slug: 'pour-qui-adultes' }
      ]
    },
    { id: 'contact', label: 'Où me trouver ?', slug: 'contact', submenu: [] },
    { id: 'apropos', label: 'A propos', slug: 'a-propos', submenu: [] },
    { id: 'cadre', label: 'Cadre et tarifs', slug: 'cadre-et-tarifs', submenu: [] },
    { id: 'blog', label: 'Blog', slug: 'blog', submenu: [] }
  ],
  footer: {
    text: "Camille Bongue - Psychothérapeute - Psychanalyste - 07 68 99 07 07"
  }
};

/**
 * Récupère le token d'administration s'il existe dans la session
 */
export function getAdminToken() {
  return sessionStorage.getItem('github_admin_token') || localStorage.getItem('github_token');
}

/**
 * Helper léger pour séparer le Frontmatter (YAML) et le contenu Markdown
 */
function parseFrontmatter(rawContent) {
  if (!rawContent) return { data: {}, content: '' };
  
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = rawContent.match(frontmatterRegex);
  
  if (!match) {
    return { data: {}, content: rawContent };
  }
  
  const yamlBlock = match[1];
  const content = match[2];
  const data = {};
  
  yamlBlock.split('\n').forEach((line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      data[key] = value;
    }
  });
  
  return { data, content };
}

/**
 * NOUVEAU : Récupère les paramètres globaux (Header, Footer, Menu)
 */
export async function getGlobalSettings() {
  const token = getAdminToken();

  if (token) {
    try {
      const rawContent = await getFileFromGitHub({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: 'content/settings.json',
        token: token,
        branch: 'main'
      });
      if (rawContent) return JSON.parse(rawContent);
    } catch (error) {
      console.warn("Fichier settings.json absent sur GitHub, utilisation des valeurs par défaut.");
    }
  }

  const key = Object.keys(settingsFileGlob)[0];
  if (key && settingsFileGlob[key]) {
    try {
      const raw = await settingsFileGlob[key]();
      return JSON.parse(raw);
    } catch (e) {
      console.error("Erreur lecture settings locaux", e);
    }
  }
  
  return DEFAULT_SETTINGS;
}

/**
 * Récupère le contenu et les métadonnées d'une page statique par son slug
 */
export async function getPageContent(slug) {
  const token = getAdminToken();

  if (token) {
    try {
      const rawContent = await getFileFromGitHub({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: `content/pages/${slug}.md`,
        token: token,
        branch: 'main'
      });
      
      if (rawContent) {
        const { data, content } = parseFrontmatter(rawContent);
        return { meta: data, content };
      }
    } catch (error) {
      console.warn(`Mode admin: Impossible de fetch en direct ${slug}.md`, error);
    }
  }

  const matchingKey = Object.keys(pageFiles).find(
    (path) => path.endsWith(`/${slug}.md`)
  );

  if (!matchingKey || !pageFiles[matchingKey]) {
    throw new Error(`Page introuvable : ${slug}`);
  }

  const rawContent = await pageFiles[matchingKey]();
  const { data, content } = parseFrontmatter(rawContent);
  return { meta: data, content };
}

/**
 * Récupère la liste de tous les articles de blog
 */
export async function getAllBlogPosts() {
  const token = getAdminToken();
  const posts = [];

  if (token) {
    try {
      const files = await getDirectoryFromGitHub({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: 'content/blog',
        token: token,
        branch: 'main'
      });

      const markdownFiles = files.filter(f => f.name.endsWith('.md'));

      await Promise.all(markdownFiles.map(async (file) => {
        const rawContent = await getFileFromGitHub({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path: file.path,
          token: token,
          branch: 'main'
        });
        
        if (rawContent) {
          const { data, content } = parseFrontmatter(rawContent);
          const slug = file.name.replace('.md', '');
          posts.push({ slug, meta: data, content });
        }
      }));

      return posts.sort((a, b) => new Date(b.meta.date) - new Date(a.meta.date));
    } catch (error) {
      console.warn('Mode admin: Impossible de fetch le dossier blog en direct', error);
    }
  }

  for (const path in blogFiles) {
    const rawContent = await blogFiles[path]();
    const { data, content } = parseFrontmatter(rawContent);
    const slug = path.split('/').pop().replace('.md', '');
    posts.push({ slug, meta: data, content });
  }
  return posts.sort((a, b) => new Date(b.meta.date) - new Date(a.meta.date));
}