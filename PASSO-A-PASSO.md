# Passo a passo — ligar a publicação automática

São 4 blocos. Faz tudo numa sentada (~40 min) que nunca mais mexe.
Onde aparecer 👉, é pra me colar o resultado aqui no chat que eu monto o próximo valor pra você.

O repositório local **já está pronto e commitado**. Você não precisa criar nada de conteúdo.

---

## BLOCO 1 — Colocar os arquivos no GitHub (~8 min)

Isso deixa as imagens num link público, que é de onde o Instagram vai buscar.

1. Entra em https://github.com e faz login (ou cria conta grátis).
2. Clica no **+** no canto superior direito → **New repository**.
3. Preenche:
   - **Repository name:** `doctorpro-conteudo`
   - Marca **Public** (tem que ser público).
   - **NÃO** marca "Add a README".
4. Clica **Create repository**.
5. A próxima tela mostra uns comandos. Ignora. Abre o terminal na pasta `publicacao` e roda **só** estas duas linhas (troca `SEU-USUARIO` pelo seu usuário do GitHub):

   ```
   git remote add origin https://github.com/SEU-USUARIO/doctorpro-conteudo.git
   git push -u origin main
   ```

   Na primeira vez, vai abrir uma janela pedindo pra logar no GitHub. Loga.

6. Recarrega a página do repositório. Se aparecerem as pastas `imagens/`, `publicar.js` etc., o Bloco 1 acabou.

👉 Me manda seu usuário do GitHub. Eu já te devolvo o link exato que o robô vai usar pras imagens, pra você conferir que abre.

---

## BLOCO 2 — Preparar a conta (~10 min)

O Instagram só publica por API se a conta for profissional e estiver ligada a uma Página do Facebook.

1. **Instagram profissional:** no app do Instagram → Configurações → Tipo de conta → confirma que está como **Comercial** ou **Criador de conteúdo**. (Você já tem, é só conferir.)
2. **Página do Facebook:** se ainda não tem, cria uma em https://facebook.com/pages/create (pode ser simples, tipo "Doctor Pro"). Ela pode ficar vazia — serve só de ponte técnica.
3. **Ligar as duas:** no Instagram → Configurações → **Central de Contas** → adiciona a Página do Facebook. Ou pela Página no Facebook → Configurações → **Contas vinculadas** → Instagram.

Quando o Instagram e a Página estiverem ligados, o Bloco 2 acabou.

---

## BLOCO 3 — Criar o app e o token na Meta (~15 min)

Aqui é onde nasce a "chave" que deixa o robô postar. **Só você consegue gerar, é a sua conta.**

### 3a. Criar o app
1. Entra em https://developers.facebook.com e loga com o mesmo Facebook.
2. Canto superior direito → **Meus Apps** → **Criar app**.
3. Em "Caso de uso", escolhe **Outro** → **Avançar** → tipo **Empresa** → **Avançar**.
4. Dá um nome (ex.: `Doctor Pro Publicador`) → **Criar app**.
5. No painel do app, procura **Adicionar produto** e adiciona **Instagram** (ou "Instagram Graph API").

> Você **não** precisa de "Revisão do app". Postando na sua própria conta, com o app em modo de desenvolvimento, já funciona.

### 3b. Pegar o token
Caminho recomendado (token que **nunca expira**):

1. Entra em https://business.facebook.com → **Configurações do negócio** (Business Settings).
2. Menu esquerdo → **Usuários** → **Usuários do sistema** → **Adicionar**.
3. Nome: `publicador`, função **Admin** → cria.
4. Clica em **Adicionar ativos** → escolhe a **Página** do Bloco 2 → dá controle total.
5. Clica em **Gerar novo token** → escolhe o app que você criou.
6. **Expiração: Nunca.**
7. Marca estas permissões:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
   - `business_management`
8. Gera. **Copia o token e guarda num lugar seguro** (é uma senha — não me manda ele).

### 3c. Descobrir o número da conta (IG_USER_ID)
1. Abre https://developers.facebook.com/tools/explorer
2. No topo, seleciona o seu app e cola o token que você gerou.
3. No campo da consulta, digita: `me/accounts` → **Enviar**.
4. Vai vir um `id` da Página. Copia esse número.
5. Troca a consulta por: `NUMERO_DA_PAGINA?fields=instagram_business_account` → **Enviar**.
6. Vem um `instagram_business_account` com um `id`. **Esse número é o IG_USER_ID.**

👉 Pode me colar a resposta desses dois passos (é só número de conta, não é senha). Eu confirmo qual é o IG_USER_ID certo.

---

## BLOCO 4 — Guardar o token no GitHub (~5 min)

Assim o robô usa o token sem ele aparecer em lugar nenhum.

1. No repositório `doctorpro-conteudo` → aba **Settings**.
2. Menu esquerdo → **Secrets and variables** → **Actions**.
3. **New repository secret** e cria dois:
   - Nome `IG_USER_ID`, valor = o número do passo 3c.
   - Nome `IG_ACCESS_TOKEN`, valor = o token do passo 3b.
4. Testa sem publicar: aba **Actions** → **Publicar no Instagram** → **Run workflow** → marca **seco** → roda. Se ele imprimir os links das imagens e terminar verde, está tudo certo.

---

## Pronto. Como fica o dia a dia

- Eu gero os 3 carrosséis da semana e te aviso.
- Você abre, revisa, e nos aprovados troca `"status": "rascunho"` por `"status": "aprovado"` no arquivo `fila.json`, e dá push (ou me pede que eu deixo pronto).
- Segunda, quarta e sexta às 9h o robô publica sozinho. Seu PC pode estar desligado.

**Não quer fazer o Bloco 3 agora?** Sem problema. Os 3 carrosséis estão prontos em imagem. Você posta na mão pelo celular esta semana, e liga a automática quando tiver os 40 minutos.
