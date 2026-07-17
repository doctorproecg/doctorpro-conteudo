/**
 * Agendador da publicação da Doctor Pro.
 *
 * Todo dia, no horário do cron (ver wrangler.toml), pede ao GitHub que rode o
 * workflow "Publicar no Instagram". Não publica nada por conta própria: quem
 * decide o que vai ao ar continua sendo o fila.json, e só post 'aprovado' com a
 * data de hoje é publicado.
 *
 * O token fica em env.GITHUB_TOKEN (secret do Cloudflare, nunca em arquivo).
 * Permissão necessária: fine-grained PAT com Actions = Read and write, restrito
 * ao repositório doctorpro-conteudo. Não precisa de acesso ao código.
 */

const API_VERSION = '2026-03-10';

async function dispararPublicacao(env) {
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/${env.WORKFLOW}/dispatches`;

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': API_VERSION,
      'Content-Type': 'application/json',
      // O GitHub recusa requisição sem User-Agent.
      'User-Agent': 'doctorpro-agendador',
    },
    body: JSON.stringify({ ref: env.BRANCH }),
  });

  // 200/204 = aceito. O GitHub não devolve corpo útil em erro de permissão,
  // então logar o texto é o que permite diagnosticar um 403 depois.
  const corpo = await r.text();

  if (!r.ok) {
    // Lançar faz a execução aparecer como falha no painel do Cloudflare, em vez
    // de "sucesso" silencioso — falha silenciosa foi exatamente o problema que
    // este worker veio resolver.
    throw new Error(`GitHub respondeu ${r.status}: ${corpo || '(sem corpo)'}`);
  }

  console.log(`ok — GitHub aceitou (${r.status})`);
  return r.status;
}

export default {
  // Await direto, sem ctx.waitUntil: se dispararPublicacao lançar, a execução
  // aparece como ERRO no painel do Cloudflare. Com waitUntil, a falha poderia
  // passar como sucesso — e post que falha calado foi o que causou tudo isso.
  async scheduled(event, env, ctx) {
    await dispararPublicacao(env);
  },
};
