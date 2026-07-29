import matter from 'gray-matter';

// Importe tous les fichiers .md situés à la racine dans content/pages/ et content/blog/
const pageFiles = import.meta.glob('../content/pages/*.md', { query: '?raw', import: 'default' });
const blogFiles = import.meta.glob('../content/blog/*.md', { query: '?raw', import: 'default' });

/**
 * Récupère le contenu et les métadonnées d'une page statique par son slug
 */
export async function getPageContent(slug) {
  const path = `../content/pages/${slug}.md`;
  if (!pageFiles[path]) {
    throw new Error(`Page introuvable : ${slug}`);
  }
  const rawContent = await pageFiles[path]();
  const { data, content } = matter(rawContent);
  return { meta: data, content };
}

/**
 * Récupère la liste de tous les articles de blog
 */
export async function getAllBlogPosts() {
  const posts = [];
  for (const path in blogFiles) {
    const rawContent = await blogFiles[path]();
    const { data, content } = matter(rawContent);
    const slug = path.split('/').pop().replace('.md', '');
    posts.push({ slug, meta: data, content });
  }
  return posts.sort((a, b) => new Date(b.meta.date) - new Date(a.meta.date));
}