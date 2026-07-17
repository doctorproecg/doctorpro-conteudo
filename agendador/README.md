# Agendador (Cloudflare Worker)

Relógio confiável que manda o GitHub publicar o post do dia.

**Por que existe:** o cron do GitHub Actions é "melhor esforço" — ele atrasa e
descarta execuções em silêncio. Falhou em 16/07 e de novo em 17/07/2026, já com
a escada de 4 tentativas. Nos dois dias o post só saiu no disparo manual.

**O que ele faz:** chama o `workflow_dispatch` do workflow "Publicar no
Instagram" — o mesmo caminho do botão "Run workflow". Ele **não** decide nada:
quem manda continua sendo o `fila.json` (só post `aprovado` com a data de hoje
vai ao ar).

A escada do `publicar.yml` fica ligada como rede de segurança. Disparo duplicado
é inofensivo: o `publicar.js` pula post já publicado.

---

## Instalar (uma vez só)

Pré-requisito: conta Cloudflare (a mesma do Workers AI).

```bash
cd publicacao/agendador
npx wrangler login          # abre o navegador pra autorizar
```

### 1. Criar o token no GitHub

Em **github.com/settings/personal-access-tokens/new** (fine-grained, não classic):

| Campo | Valor |
|---|---|
| Token name | `cloudflare-agendador` |
| Expiration | 1 ano — **anote a data** |
| Repository access | Only select repositories → `doctorpro-conteudo` |
| Permissions | Repository permissions → **Actions** → **Read and write** |

Nenhuma outra permissão. Não precisa de acesso ao código. O token aparece uma
única vez — copie e use já no passo 2.

### 2. Guardar o token no Cloudflare

```bash
npx wrangler secret put GITHUB_TOKEN
```

Cola o token quando pedir. Ele fica criptografado na conta Cloudflare e **não**
entra em nenhum arquivo deste repositório.

### 3. Subir

```bash
npx wrangler deploy
```

### 4. Testar sem esperar o dia seguinte

```bash
npx wrangler dev --test-scheduled
# noutro terminal:
curl "http://localhost:8787/__scheduled?cron=50+10+*+*+*"
```

Ou, já em produção: painel do Cloudflare → Workers → `doctorpro-agendador` →
Settings → Trigger Events → **Trigger cron**.

Deu certo se aparecer uma execução nova na aba Actions do GitHub.

---

## Horários

Cron do Cloudflare é **sempre UTC**. Brasília é UTC-3.

| Cron | Hora BRT | Papel |
|---|---|---|
| `50 10 * * *` | 07:50 | alvo principal (post cai ~8h) |
| `40 12 * * *` | 09:40 | rede, se o GitHub estiver instável |

Pra mudar horário, edite `crons` no `wrangler.toml` e rode `npx wrangler deploy`.

---

## Quando parar de publicar, olhe aqui primeiro

1. **Token venceu?** É a causa mais provável e falha em silêncio. Refaça o passo
   1 e o passo 2.
2. **Cloudflare → Workers → doctorpro-agendador → Logs.** Erro de token aparece
   como `GitHub respondeu 403`.
3. **403 mesmo com token novo:** se `doctorproecg` for uma organização, ela
   precisa permitir tokens fine-grained (Settings da org → Personal access
   tokens). É a causa mais comum de 403 aqui.
4. **Executou e mesmo assim não postou?** Aí não é o agendador — é a fila. Veja
   se o post de hoje está `aprovado` e se o push foi feito.
