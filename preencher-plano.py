# Joga no Plano de Conteudo do hub o que ja esta agendado nos dois canais.
# Instagram: sai da propria agenda do hub. LinkedIn: a lista que agendei no LinkedIn.
# Uso: python preencher-plano.py --gravar
import json, os, sys, datetime, urllib.request

HUB = "https://doctorpro-hub.doctorpro-ecg.workers.dev"
KEY = os.environ.get("DASH_KEY", "DP-5rXwURAp3XL4g1VTySRIlXQabq")
CLIENT = "doctor-pro"
# Cloudflare devolve 403 pra requisicao sem User-Agent de navegador.
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")

# O que esta agendado no LinkedIn (conferido na tela de publicacoes agendadas em 15/08)
LINKEDIN = [
    ("2026-08-18", "texto", "A fila da decisão: o que já responde por você antes da ligação"),
    ("2026-08-20", "texto", "CRM e RQE na bio (documento)"),
    ("2026-08-25", "texto", "Captação x retenção: as oito agências que a gente olhou"),
    ("2026-08-27", "texto", "Preço decide quando é a única coisa que sabem de você"),
    ("2026-09-01", "texto", "A avaliação que você não pediu (documento)"),
    ("2026-09-03", "texto", "O paciente pergunta pra IA, não pro Google (documento)"),
    ("2026-09-08", "texto", "A conversa que morre depois do preço (documento)"),
    ("2026-09-10", "texto", "O CFM colocou uma IA pra fiscalizar (documento)"),
    ("2026-09-15", "texto", "Os três clientes que a gente recusa (documento)"),
    ("2026-09-17", "texto", "Os três batimentos do Método ECG (documento)"),
    ("2026-09-22", "texto", "A recepção que atende 24 horas (documento)"),
    ("2026-09-24", "texto", "Antes e depois voltou a ser permitido (documento)"),
    ("2026-09-29", "texto", "Quem responde o WhatsApp é o seu funil (documento)"),
    ("2026-10-01", "texto", "Você não precisa dançar no Reels (documento)"),
    ("2026-10-06", "texto", "Confirmou e não apareceu (documento)"),
    ("2026-10-08", "texto", "Selfie de médico não é mais proibida (documento)"),
    ("2026-10-13", "texto", "O médico bom é o menos conhecido"),
]


def pega(path):
    req = urllib.request.Request(f"{HUB}{path}", headers={"User-Agent": UA})
    return json.load(urllib.request.urlopen(req, timeout=30))


def manda(path, body):
    req = urllib.request.Request(f"{HUB}{path}", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "User-Agent": UA},
                                 method="POST")
    return json.load(urllib.request.urlopen(req, timeout=30))


def primeira_linha(caption):
    for linha in (caption or "").split("\n"):
        if linha.strip():
            return linha.strip()[:120]
    return "Post"


def main():
    grava = "--gravar" in sys.argv
    itens = []

    for p in pega(f"/api/hub/agenda?key={KEY}&client={CLIENT}")["posts"]:
        if p["status"] == "publicado":
            continue
        dia = datetime.datetime.utcfromtimestamp(p["scheduled_at"] - 3 * 3600).strftime("%Y-%m-%d")
        itens.append((dia, "carrossel" if p["tipo"] == "carrossel" else "imagem",
                      "instagram", primeira_linha(p["caption"])))

    for dia, formato, tema in LINKEDIN:
        itens.append((dia, formato, "linkedin", tema))

    itens.sort()
    for dia, formato, canal, tema in itens:
        print(f"{dia} · {canal:9} · {formato:9} · {tema[:60]}")
        if grava:
            r = manda(f"/api/hub/plano?key={KEY}", {
                "client": CLIENT, "data": dia, "formato": formato, "canal": canal,
                "tema": tema, "observacao": "Já agendado pela agência",
            })
            if not r.get("ok"):
                print("   FALHOU:", r)
    print(f"\n{len(itens)} itens{' gravados' if grava else ' (nada gravado, rode com --gravar)'}")


main()
