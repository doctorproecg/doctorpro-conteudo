# Sobe os slides pro R2 do hub e cria o post agendado na agenda do Worker.
# Uso: python agendar-no-hub.py            (mostra o que faria)
#      python agendar-no-hub.py --agendar  (faz de verdade)
import json, os, re, sys, time, datetime, urllib.request

HUB = "https://doctorpro-hub.doctorpro-ecg.workers.dev"
KEY = os.environ.get("DASH_KEY", "DP-5rXwURAp3XL4g1VTySRIlXQabq")
CLIENT = "doctor-pro"
BASE = os.path.join(os.path.dirname(__file__), "..", "doctor-pro", "marketing", "conteudo")

# (pasta, data local, hora local)
LOTE = [
    ("carrossel-crm-rqe-bio-2026-08-20",       "2026-08-20", "09:00"),
    ("carrossel-ja-decidiu-2026-08-24",        "2026-08-24", "09:00"),
    ("post-alivio-2026-08-31",                 "2026-08-31", "09:00"),
    ("carrossel-balde-retencao-2026-09-03",    "2026-09-03", "09:00"),
    ("post-especialidade-2026-09-07",          "2026-09-07", "09:00"),
    ("carrossel-avaliacoes-google-2026-09-10", "2026-09-10", "09:00"),
]


def legenda(pasta):
    """Tira o corpo da legenda do legenda.md. Os arquivos vem em dois formatos:
    uns tem o titulo '## Legenda', outros separam o corpo depois do segundo '---'."""
    txt = open(os.path.join(BASE, pasta, "legenda.md"), encoding="utf-8").read()
    if "## Legenda" in txt:
        corpo = txt.split("## Legenda", 1)[1]
    else:
        partes = txt.split("\n---\n")
        corpo = partes[1] if len(partes) > 1 else txt
    # corta no proximo titulo (primeiro comentario, hashtags, notas)
    corpo = re.split(r"\n#{1,3} ", corpo)[0]
    # tira as linhas de metadado que nao sao legenda
    corpo = "\n".join(l for l in corpo.splitlines()
                      if not re.match(r"\s*\*\*(Arte|Artes|Carrossel|Post|Tema)", l))
    return corpo.strip()


def epoch(data, hora):
    """Horario de Brasilia (UTC-3) -> epoch em segundos."""
    dt = datetime.datetime.strptime(f"{data} {hora}", "%Y-%m-%d %H:%M")
    return int((dt - datetime.datetime(1970, 1, 1)).total_seconds()) + 3 * 3600


# A Cloudflare na frente do Worker BLOQUEIA (403) requisicao sem User-Agent de navegador.
# Sem esta linha o script inteiro morre em 403 e parece senha errada, mas nao e.
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")


def post_json(caminho, body):
    req = urllib.request.Request(f"{HUB}{caminho}", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "User-Agent": UA},
                                 method="POST")
    return json.load(urllib.request.urlopen(req))


def sobe(pasta, arquivo):
    dados = open(os.path.join(BASE, pasta, "instagram", arquivo), "rb").read()
    url = f"{HUB}/api/hub/upload?key={KEY}&client={CLIENT}&name={pasta[:30]}-{arquivo}"
    req = urllib.request.Request(url, data=dados,
                                 headers={"Content-Type": "image/png", "User-Agent": UA}, method="POST")
    return json.load(urllib.request.urlopen(req))["url"]


def main():
    faz = "--agendar" in sys.argv
    for pasta, data, hora in LOTE:
        slides = sorted(f for f in os.listdir(os.path.join(BASE, pasta, "instagram")) if f.endswith(".png"))
        tipo = "carrossel" if len(slides) > 1 else "imagem"
        cap = legenda(pasta)
        print(f"{data} {hora} · {tipo} · {len(slides)} slide(s) · {pasta}")
        print(f"   legenda: {cap[:80]}...")
        if not faz:
            continue
        urls = [sobe(pasta, s) for s in slides]
        r = post_json(f"/api/hub/agenda?key={KEY}", {
            "client": CLIENT, "tipo": tipo, "caption": cap, "images": urls,
            "scheduled_at": epoch(data, hora), "aprovar": True,
        })
        print(f"   -> hub id {r.get('id')} status {r.get('status')}")
        time.sleep(1)


main()
