/**
 * Lê as métricas dos posts já publicados sem expor o token. Executado apenas
 * pelo GitHub Actions, onde IG_ACCESS_TOKEN fica guardado como secret.
 */
const fs = require('fs');
const path = require('path');

const GRAPH = 'v23.0';
const token = process.env.IG_ACCESS_TOKEN;
if (!token) throw new Error('IG_ACCESS_TOKEN não definido.');

const filaPath = path.join(__dirname, 'fila.json');
const destino = path.join(__dirname, 'metricas.json');
const fila = JSON.parse(fs.readFileSync(filaPath, 'utf8')).posts;
const metricas = ['views', 'reach', 'total_interactions', 'likes', 'comments', 'saved', 'shares'];

async function graph(id, params) {
  const url = new URL(`https://graph.facebook.com/${GRAPH}/${id}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('access_token', token);
  const resposta = await fetch(url);
  const corpo = await resposta.json();
  if (!resposta.ok) throw new Error(corpo?.error?.message || `HTTP ${resposta.status}`);
  return corpo;
}

async function insights(id) {
  try {
    const resposta = await graph(`${id}/insights`, { metric: metricas.join(',') });
    return { valores: Object.fromEntries((resposta.data || []).map(x => [x.name, x.values?.[0]?.value ?? null])) };
  } catch (erroDoGrupo) {
    const valores = {};
    const indisponiveis = [];
    for (const metric of metricas) {
      try {
        const resposta = await graph(`${id}/insights`, { metric });
        valores[metric] = resposta.data?.[0]?.values?.[0]?.value ?? null;
      } catch {
        indisponiveis.push(metric);
      }
    }
    return { valores, indisponiveis, aviso: erroDoGrupo.message };
  }
}

(async () => {
  const publicados = fila.filter(p => p.status === 'publicado' && p.instagram_media_id);
  const posts = [];
  for (const post of publicados) {
    const basico = await graph(post.instagram_media_id, {
      fields: 'id,permalink,media_type,media_product_type,timestamp,like_count,comments_count'
    });
    const leitura = await insights(post.instagram_media_id);
    posts.push({
      id: post.id,
      titulo: post.titulo,
      data_publicacao: post.publicado_em,
      instagram_media_id: post.instagram_media_id,
      permalink: basico.permalink || null,
      tipo: basico.media_type || null,
      curtidas: basico.like_count ?? null,
      comentarios: basico.comments_count ?? null,
      ...leitura
    });
    console.log(`Métricas lidas: ${post.id}`);
  }
  fs.writeFileSync(destino, JSON.stringify({
    atualizado_em: new Date().toISOString(),
    total_posts: posts.length,
    posts
  }, null, 2) + '\n');
})();
