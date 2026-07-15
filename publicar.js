#!/usr/bin/env node
/**
 * Publica no Instagram o post do dia — se, e somente se, estiver aprovado.
 *
 *   node publicar.js            # publica o post de hoje
 *   node publicar.js --seco     # simula, não chama a API de publicação
 *   node publicar.js --data 2026-07-13
 *
 * Roda no GitHub Actions (seg/qua/sex 09h BRT) e também na mão.
 *
 * Variáveis obrigatórias:
 *   IG_USER_ID        id da conta Instagram Business
 *   IG_ACCESS_TOKEN   token de longa duração (secret)
 *   GITHUB_REPOSITORY owner/repo — monta a URL pública das imagens
 *
 * Opcionais:
 *   GRAPH_VERSION     default v23.0
 *   GITHUB_REF_NAME   branch, default main
 */

import { readFile, writeFile } from 'node:fs/promises';

const FILA = new URL('./fila.json', import.meta.url);
const GRAPH = process.env.GRAPH_VERSION || 'v23.0';
const BASE = `https://graph.facebook.com/${GRAPH}`;

const seco = process.argv.includes('--seco');
const dataArg = argOf('--data');

function argOf(nome) {
  const i = process.argv.indexOf(nome);
  return i === -1 ? null : process.argv[i + 1];
}

/** Data de hoje em São Paulo, no formato YYYY-MM-DD. O runner do Actions roda em UTC. */
function hojeBRT() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function exigir(nome) {
  const v = process.env[nome];
  if (!v) {
    console.error(`Falta a variável ${nome}.`);
    process.exit(1);
  }
  return v;
}

async function graph(caminho, params, metodo = 'POST') {
  const url = new URL(`${BASE}/${caminho}`);
  const corpo = new URLSearchParams({ ...params, access_token: token });

  const r = metodo === 'GET'
    ? await fetch(`${url}?${corpo}`)
    : await fetch(url, { method: 'POST', body: corpo });

  const json = await r.json();

  if (!r.ok || json.error) {
    const e = json.error || {};
    throw new Error(
      `Graph API ${r.status} em ${caminho}: ${e.message || JSON.stringify(json)}` +
      (e.code === 190 ? '\n→ Token expirado ou inválido. Gere um novo (validade 60 dias).' : '')
    );
  }
  return json;
}

/**
 * Container de mídia não fica pronto na hora. Publicar antes do FINISHED
 * devolve erro genérico e confuso, então esperamos de verdade.
 */
async function esperarContainer(id, tentativas = 12) {
  for (let i = 0; i < tentativas; i++) {
    const { status_code, status } = await graph(id, { fields: 'status_code,status' }, 'GET');

    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR') throw new Error(`Container ${id} falhou: ${status || 'sem detalhe'}`);

    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Container ${id} não ficou pronto em ${tentativas * 5}s.`);
}

const igUser = exigir('IG_USER_ID');
const token = exigir('IG_ACCESS_TOKEN');
const repo = exigir('GITHUB_REPOSITORY');
const branch = process.env.GITHUB_REF_NAME || 'main';

const fila = JSON.parse(await readFile(FILA, 'utf8'));
const alvo = dataArg || hojeBRT();

const post = fila.posts.find((p) => p.data === alvo);

if (!post) {
  console.log(`Nada agendado para ${alvo}. Encerrando sem erro.`);
  process.exit(0);
}

if (post.status === 'publicado') {
  console.log(`"${post.titulo}" já foi publicado (${post.instagram_media_id}). Nada a fazer.`);
  process.exit(0);
}

// A trava. Sem aprovação explícita, nada vai pro feed.
if (post.status !== 'aprovado') {
  console.log(
    `"${post.titulo}" está como "${post.status}", não "aprovado".\n` +
    `Pulando ${alvo} — nenhuma peça é publicada sem revisão.`
  );
  process.exit(0);
}

if (!post.slides?.length) {
  console.error(`"${post.titulo}" não tem slides.`);
  process.exit(1);
}
if (post.slides.length > 10) {
  console.error(`Carrossel tem ${post.slides.length} slides. O Instagram aceita no máximo 10.`);
  process.exit(1);
}

const urlDe = (arquivo) =>
  `https://raw.githubusercontent.com/${repo}/${branch}/imagens/${post.pasta}/${arquivo}`;

console.log(`Publicando "${post.titulo}" (${post.slides.length} slides) em ${alvo}`);
post.slides.forEach((s) => console.log(`  ${urlDe(s)}`));

if (seco) {
  console.log('\n--seco: parei antes de chamar a API de publicação.');
  process.exit(0);
}

let mediaId;

if (post.slides.length === 1) {
  const { id } = await graph(`${igUser}/media`, {
    image_url: urlDe(post.slides[0]),
    caption: post.legenda,
  });
  await esperarContainer(id);
  ({ id: mediaId } = await graph(`${igUser}/media_publish`, { creation_id: id }));
} else {
  // Todos os slides são cortados na proporção do primeiro. Os nossos são 1080x1350
  // uniformes, então não há corte — mas se um dia divergirem, o primeiro manda.
  const filhos = [];
  for (const slide of post.slides) {
    const { id } = await graph(`${igUser}/media`, {
      image_url: urlDe(slide),
      is_carousel_item: 'true',
    });
    filhos.push(id);
    console.log(`  container ${slide} → ${id}`);
  }

  const { id: carrossel } = await graph(`${igUser}/media`, {
    media_type: 'CAROUSEL',
    children: filhos.join(','),
    caption: post.legenda,
  });

  await esperarContainer(carrossel);
  ({ id: mediaId } = await graph(`${igUser}/media_publish`, { creation_id: carrossel }));
}

post.status = 'publicado';
post.instagram_media_id = mediaId;
post.publicado_em = new Date().toISOString();

await writeFile(FILA, JSON.stringify(fila, null, 2) + '\n');

console.log(`\nPublicado. media_id ${mediaId}`);
