// Importe tous les fichiers .md situés dans content/pages/ et content/blog/
const pageFiles = import.meta.glob('../../content/pages/*.md', { query: '?raw', import: 'default' });
const blogFiles = import.meta.glob('../../content/blog/*.md', { query: '?raw', import: 'default' });

/**
 * Helper léger pour séparer le Frontmatter (YAML) et le contenu Markdown
 * sans dépendre de Node.js Buffer / gray-matter.
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
      // Retire les guillemets autour des chaînes de caractères
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      data[key] = value;
    }
  });
  
  return { data, content };
}

/**
 * Récupère le contenu et les métadonnées d'une page statique par son slug
 */
export async function getPageContent(slug) {
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
  const posts = [];
  for (const path in blogFiles) {
    const rawContent = await blogFiles[path]();
    const { data, content } = parseFrontmatter(rawContent);
    const slug = path.split('/').pop().replace('.md', '');
    posts.push({ slug, meta: data, content });
  }
  return posts.sort((a, b) => new Date(b.meta.date) - new Date(a.meta.date));
}