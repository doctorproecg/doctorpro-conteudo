# Publicação automática — Doctor Pro

Publica os carrosséis no Instagram segunda, quarta e sexta às 09h, sem seu PC ligado.

**A trava:** só publica post com `"status": "aprovado"` na `fila.json`. O que estiver como `rascunho` é pulado em silêncio. Nenhuma peça vai ao feed sem você ter olhado.

---

## Como o dia a dia funciona

1. **Domingo** — os 3 carrosséis da semana são gerados. Slides em `imagens/<pasta>/`, legenda dentro da `fila.json`.
2. **Você revisa.** Se aprovar, troca `"status": "rascunho"` por `"status": "aprovado"` e dá push.
3. **Seg/Qua/Sex 09h** — o GitHub Actions publica o post do dia e marca como `publicado`.

Se você não aprovar até o horário, o post não sai. Sem drama, sem post ruim no ar.

---

## Estado atual

Os 3 carrosséis da semana de 13/07 **já estão prontos e renderizados**, com legenda, em `imagens/`. Todos como `rascunho`.

Falta só o setup abaixo (feito uma vez) e a sua aprovação.

---

## Setup (uma vez)

### 1. Repositório público

As imagens precisam estar num link HTTPS público — a API da Meta busca a imagem pela URL, ela não aceita upload direto de arquivo. Por isso este repo é separado do `MazyOS` e **precisa ser público**.

```bash
cd publicacao
git init -b main
git add .
git commit -m "publicação automática"
gh repo create doctorpro-conteudo --public --source=. --push
```

Sem o `gh` instalado, crie o repo pelo site e faça `git remote add origin ... && git push -u origin main`.

> Os slides ficam visíveis no GitHub antes de irem ao ar. Como eles vão pro Instagram de qualquer jeito, o risco é baixo — mas se incomodar, dá pra trocar por um bucket do Cloudflare R2 (free tier) depois.

### 2. Conta e Página

- Instagram em **Business ou Creator** (você já tem).
- Ligado a uma **Página do Facebook**. É obrigatório: a API de publicação não funciona sem a Página, mesmo que ela fique vazia.

### 3. App na Meta

1. [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App** → tipo **Business**.
2. Adicione o produto **Instagram** → **Instagram Graph API**.
3. Em **App roles**, confirme que você é **Administrator**.

> **Você não precisa de App Review.** Enquanto o app está em modo de desenvolvimento, quem tem cargo no app (admin, developer, tester) pode usar `instagram_content_publish` na própria conta. App Review só é exigido pra publicar em contas de terceiros — que não é o seu caso.

### 4. Token

No **Graph API Explorer**, selecione o app e peça as permissões:

```
instagram_basic
instagram_content_publish
pages_show_list
pages_read_engagement
business_management
```

Gere o token e **troque por um de longa duração** (60 dias):

```
GET https://graph.facebook.com/v23.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id=<APP_ID>
  &client_secret=<APP_SECRET>
  &fb_exchange_token=<TOKEN_CURTO>
```

Pegue o **IG_USER_ID**:

```
GET https://graph.facebook.com/v23.0/me/accounts
GET https://graph.facebook.com/v23.0/<PAGE_ID>?fields=instagram_business_account
```

> **Token de 60 dias vence.** Coloque um lembrete. A alternativa definitiva é um **System User token** no Business Manager, que não expira — 10 minutos a mais de configuração e você nunca mais mexe nisso. Recomendo fazer direto assim.

### 5. Secrets

No repo → **Settings → Secrets and variables → Actions**:

| Secret | Valor |
|---|---|
| `IG_USER_ID` | id da conta Instagram Business |
| `IG_ACCESS_TOKEN` | token de longa duração |

O token nunca entra no código.

### 6. Testar antes de confiar

```bash
# Actions → "Publicar no Instagram" → Run workflow → marque "seco"
```

O modo seco monta as URLs e para antes de publicar. Se as URLs abrirem no navegador, está tudo certo.

---

## Limites que importam

- **10 slides** por carrossel, no máximo.
- Todos os slides são cortados na proporção **do primeiro**. Os nossos são 1080×1350 uniformes, então não há corte.
- **100 posts publicados por API a cada 24h.** Nós fazemos 3 por semana.
- A versão da Graph API (`v23.0`) é depreciada com o tempo. Se um dia der erro de versão, ajuste `GRAPH_VERSION` no workflow.

---

## Quando algo falha

| Sintoma | Causa provável |
|---|---|
| `code 190` | Token expirou. Gere outro. |
| `Container não ficou pronto` | Imagem grande demais ou URL não pública. Abra a URL numa aba anônima. |
| Actions não rodou no horário | Cron do GitHub atrasa em pico. Rode `workflow_dispatch` na mão. |
| Nada publicado, sem erro | O post do dia não estava `aprovado`. É o comportamento correto. |
