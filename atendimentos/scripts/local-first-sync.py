#!/usr/bin/env python3
"""
local-first-sync.py
Increment 2 — Local-First Sync Helper & Unified Clinical Studio Server for Atendimentos.

Capabilities:
1. Validates and normalizes Legacy v1 arrays or Schema v2.0.0 envelopes using both:
   - Python `clinical_export_adapter.py` (SchemaV2Importer / ClientDataValidatorV1)
   - Production APK `client-data.js` (`validateClients` via Node.js)
2. Stages the compiled `clients_data.json` payload into `workspace/staging/clients_data.json`
   (keeping `app/src/main/assets/` free of bundled client JSONs per `verify_source.py`).
3. Provides `--serve` mode (127.0.0.1:8765) to host the Unified Atendimentos Studio UI on desktop
   with automatic roster loading, 1-click staging sync, and local transcript analysis.
"""

import argparse
import hashlib
import http.server
import importlib.util
import json
import re
import socketserver
import subprocess
import sys
import urllib.parse
import webbrowser
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

SCRIPT_DIR = Path(__file__).resolve().parent
WORKSPACE_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = WORKSPACE_DIR.parent
ASSETS_DIR = (
    WORKSPACE_DIR / "atendimentos" / "app" / "src" / "main" / "assets"
    if (WORKSPACE_DIR / "atendimentos" / "app" / "src" / "main" / "assets").exists()
    else WORKSPACE_DIR / "app" / "src" / "main" / "assets"
)
STAGING_DIR = WORKSPACE_DIR / "staging"
CLIENT_DATA_JS = ASSETS_DIR / "client-data.js"

# Load clinical_export_adapter.py
spec = importlib.util.spec_from_file_location(
    "clinical_export_adapter", str(SCRIPT_DIR / "clinical_export_adapter.py")
)
adapter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter)

CPF_REGEX = re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b")
EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")


def build_active_clinical_envelope() -> Dict[str, Any]:
    """Builds the 5-patient Schema v2.0.0 clinical roster (Helena M., Rafael S., Camila V., Lucas B., Mariana T.)."""
    return {
        "schema_version": "2.0.0",
        "exported_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "export_environment": "local_first_sync_helper",
        "theoretical_framework_primary": "Person-Centered Approach (Carl Rogers)",
        "theoretical_framework_secondary": "Contextual Behavioral (ACT / RFT / FAP)",
        "clients": [
            {
                "id": "helena-m",
                "codename": "Helena M.",
                "last_session_date": "2026-10-15",
                "status": "Ativo",
                "source_documents": {
                    "drive_folder_url": "https://drive.google.com/drive/folders/pasta_helena_m",
                    "dossier_url": "https://docs.google.com/document/d/dossie_helena_m/edit",
                    "roadmap_url": "https://docs.google.com/document/d/roteiro_helena_m/edit",
                    "notebook_url": "https://notebooklm.google.com"
                },
                "formulations": {
                    "rogers_acp": {
                        "briefing": "Helena M. encerrou a última sessão em contato profundo com a exaustão crônica após estabelecer seu primeiro limite claro no trabalho. Chega hoje entre o alívio organísmico e a culpa antecipatória.",
                        "affective_zones": [
                            "Culpa aguda por não estar disponível ininterruptamente para a equipe e família",
                            "Medo visceral de desapontar figuras de autoridade ao priorizar o próprio descanso",
                            "Tristeza silenciosa pelo tempo de vida consumido em hipervigilância"
                        ],
                        "therapist_posture": "Presença despressurizadora e consideração positiva incondicional. Evitar reforçar lógica de desempenho ('parabéns por dizer não'); acompanhar o custo emocional vivido nessa escolha.",
                        "empathic_reflections": [
                            "Parece que dizer esse primeiro 'não' trouxe um respiro para o corpo, mas também um medo grande de perder o lugar de quem sempre dá conta de tudo...",
                            "É como se descansar ainda parecesse um ato perigoso, quase uma quebra de contrato com quem espera você sempre forte.",
                            "Quando você para de correr, aparece um cansaço antigo que pede para ser escutado sem pressa."
                        ],
                        "internal_frame_of_reference": "Experiência cotidiana vivida como 'uma esteira rolante que nunca desliga'. Sensação somática de aperto epigástrico e alerta contínuo aos domingos à noite.",
                        "incongruence_self_threat": "Tensão acentuada entre o Self Ideal ('a profissional e filha infalível que nunca precisa de ajuda') e o Self Organísmico Real (corpo exausto pedindo pausa e amparo).",
                        "conditions_of_worth": "Locus de avaliação fortemente externo. Crença introjetada de que o afeto e o respeito dependem exclusivamente da utilidade e da alta entrega.",
                        "relational_climate": "Transição significativa na última sessão: abandonou o relato em formato de relatório executivo, silenciou por 40 segundos e chorou ao sentir que não precisava performar na relação terapêutica.",
                        "actualizing_tendency": "Movimento autêntico de autorregulação ao recusar demandas no fim de semana e retomar caminhadas matinais sem celular."
                    },
                    "contextual_behavioral": {
                        "experiential_avoidance": "Engajamento em hiperatividade produtiva e planejamento obsessivo para esquivar-se do sentimento de desamparo e solidão.",
                        "cognitive_fusion": "Fusão literal com a regra verbal: 'Se eu desacelerar, tudo ao meu redor desmorona e serei descartada'.",
                        "valued_directions": ["Saúde física e vitalidade", "Presença inteira nos vínculos", "Autonomia com autocompaixão"],
                        "crb1_in_session": "Pedir desculpas ao terapeuta por 'gastar o tempo da sessão falando de cansaço' e acelerar a fala quando se emociona.",
                        "crb2_in_session": "Sustentar o contato visual durante o choro e nomear diretamente a própria vulnerabilidade sem recorrer à intelectualização."
                    }
                }
            },
            {
                "id": "rafael-s",
                "codename": "Rafael S.",
                "last_session_date": "2026-10-14",
                "status": "Ativo",
                "source_documents": {
                    "drive_folder_url": "https://drive.google.com/drive/folders/pasta_rafael_s",
                    "dossier_url": "https://docs.google.com/document/d/dossie_rafael_s/edit",
                    "roadmap_url": "https://docs.google.com/document/d/roteiro_rafael_s/edit",
                    "notebook_url": "https://gemini.google.com/notebook/caderno_rafael_s"
                },
                "formulations": {
                    "rogers_acp": {
                        "briefing": "Rafael S. atravessa impasse conjugal e profissional marcado por esquiva de conflito e sobrecarga silenciosa. Na última sessão tocou pela primeira vez na raiva que encobre sob a postura conciliadora.",
                        "affective_zones": [
                            "Ressentimento acumulado por ceder sistematicamente antes de consultar o próprio desejo",
                            "Angústia diante da fantasia de que qualquer discordância levará ao rompimento",
                            "Solidão dentro do próprio relacionamento"
                        ],
                        "therapist_posture": "Congruência firme e empatia sintonizada às nuances de voz própria. Receber a irritação emergente como sinal vital de fronteira pessoal, sem julgamento.",
                        "empathic_reflections": [
                            "Por trás dessa calma que você mantém para proteger a paz em casa, parece existir um cansaço imenso de nunca aparecer por inteiro...",
                            "É como se discordar significasse colocar tudo a perder, então você se apaga para manter o vínculo seguro.",
                            "Existe uma parte sua que está começando a sentir que o preço dessa harmonia tem sido alto demais para você."
                        ],
                        "internal_frame_of_reference": "Vivencia-se como o 'amortecedor emocional' da família, sempre atento ao humor alheio e desconectado das próprias preferências.",
                        "incongruence_self_threat": "Subcepção da própria assertividade e raiva como agressividade destrutiva, incompatível com o autoconceito de 'homem pacífico e compreensivo'.",
                        "conditions_of_worth": "Introjeção precoce de que expressar insatisfação gera rejeição imediata e retirada de afeto.",
                        "relational_climate": "Alta deferência inicial ao terapeuta; começa a testar pequenas discordâncias quando percebe que o espaço terapêutico permanece estável e acolhedor.",
                        "actualizing_tendency": "Desejo crescente de honestidade emocional com a parceira e retomada de decisões alinhadas aos próprios valores."
                    },
                    "contextual_behavioral": {
                        "experiential_avoidance": "Concordância imediata e mudança de assunto para evitar o desconforto autonômico de tensões interpessoais.",
                        "cognitive_fusion": "Fusão com a narrativa 'Conflito é sinal de fracasso afetivo'.",
                        "valued_directions": ["Intimidade autêntica", "Honestidade relacional", "Respeito às próprias fronteiras"],
                        "crb1_in_session": "Sorrir e minimizar relatos dolorosos dizendo 'mas no fundo não é nada demais'.",
                        "crb2_in_session": "Reconhecer ao vivo quando uma pontuação não fez sentido e sustentar sua discordância com clareza."
                    }
                }
            },
            {
                "id": "camila-v",
                "codename": "Camila V.",
                "last_session_date": "2026-10-13",
                "status": "Ativo",
                "source_documents": {
                    "drive_folder_url": "https://drive.google.com/drive/folders/pasta_camila_v",
                    "dossier_url": "https://docs.google.com/document/d/dossie_camila_v/edit",
                    "roadmap_url": "https://docs.google.com/document/d/roteiro_camila_v/edit",
                    "notebook_url": "https://notebooklm.google.com"
                },
                "formulations": {
                    "rogers_acp": {
                        "briefing": "Camila V. trabalha o luto pela perda materna enquanto lida com crises de ansiedade interoceptiva noturna. Começa a diferenciar a dor legítima da saudade do pânico de descontrole.",
                        "affective_zones": [
                            "Saudade aguda ativada por marcos cotidianos e silêncio noturno",
                            "Hipervigilância às sensações cardíacas e respiratórias (medo de passar mal sozinha)",
                            "Sentimento de orfandade mesmo sendo a referência de cuidado da família"
                        ],
                        "therapist_posture": "Acolhimento seguro, validação do ritmo próprio do luto (Worden) e ancoragem serena diante da ansiedade somática.",
                        "empathic_reflections": [
                            "Quando a casa silencia à noite, parece que toda a falta que você segurou durante o dia vem à tona no próprio corpo...",
                            "Você precisou ser a rocha para todo mundo nos últimos meses, e aqui finalmente pode ser quem sente falta de colo.",
                            "Sentir o coração acelerar assusta muito, mas também parece ser o seu corpo contando o tamanho do que você viveu."
                        ],
                        "internal_frame_of_reference": "Percepção do próprio corpo como território vulnerável após o estresse prolongado do cuidado paliativo materno.",
                        "incongruence_self_threat": "Tensão entre a necessidade de demonstrar 'superação rápida' e a vivência real do pesar e da vulnerabilidade física.",
                        "conditions_of_worth": "Exigência internalizada de controle emocional absoluto perante situações de perda.",
                        "relational_climate": "Forte aliança terapêutica; utiliza a sessão como refúgio seguro onde não precisa cuidar do outro.",
                        "actualizing_tendency": "Reconstrução gradual de significado através da escrita memorial e retomada progressiva da rotina de sono."
                    },
                    "contextual_behavioral": {
                        "experiential_avoidance": "Monitoramento constante de sinais vitais e adiamento do horário de dormir para evitar o contato com a tristeza e sensações interoceptivas.",
                        "cognitive_fusion": "Fusão com pensamentos catastróficos perante taquicardia ('Vou perder o controle se sentir essa dor').",
                        "valued_directions": ["Honrar a memória materna com presença", "Cuidado compassivo com o próprio corpo", "Conexão fraterna"],
                        "crb1_in_session": "Mudar rapidamente para detalhes burocráticos do inventário quando a voz embarga.",
                        "crb2_in_session": "Permanecer em contato com a emoção da saudade na sessão, notando a taquicardia diminuir sem fugir do tema."
                    }
                }
            },
            {
                "id": "lucas-b",
                "codename": "Lucas B.",
                "last_session_date": "2026-10-12",
                "status": "Ativo",
                "source_documents": {
                    "drive_folder_url": "https://drive.google.com/drive/folders/pasta_lucas_b",
                    "dossier_url": "https://docs.google.com/document/d/dossie_lucas_b/edit",
                    "roadmap_url": "https://docs.google.com/document/d/roteiro_lucas_b/edit",
                    "notebook_url": "https://notebooklm.google.com"
                },
                "formulations": {
                    "rogers_acp": {
                        "briefing": "Lucas B. lida com sobrecarga executiva (TDAH adulto) e autocrítica severa após atrasos em entregas acadêmicas. Na última sessão explorou o ciclo de paralisia por perfeccionismo e vergonha.",
                        "affective_zones": [
                            "Vergonha intensa diante de tarefas acumuladas e mensagens não respondidas",
                            "Frustração com a oscilação entre hiperfoco exaustivo e bloqueio executivo",
                            "Medo de ser visto como irresponsável ou desinteressado"
                        ],
                        "therapist_posture": "Aceitação incondicional radical que separa o valor pessoal do funcionamento executivo; presença estruturante e livre de tom corretivo.",
                        "empathic_reflections": [
                            "Não é falta de importância; pelo contrário, parece que você se importa tanto que o medo de não fazer perfeito trava o primeiro passo...",
                            "A vergonha faz parecer mais seguro se esconder do que mostrar que você está precisando de ajuda com o prazo.",
                            "Quando você se trata como inimigo, o peso da tarefa dobra antes mesmo de você abrir o computador."
                        ],
                        "internal_frame_of_reference": "Sensação de viver atrasado em relação a um relógio invisível, carregando culpa constante mesmo nos momentos de lazer.",
                        "incongruence_self_threat": "Abismo entre a capacidade intelectual reconhecida e as dificuldades práticas de iniciação e manutenção de rotina.",
                        "conditions_of_worth": "Histórico de validações condicionais: sentia-se aceito apenas quando apresentava resultados brilhantes sem esforço aparente.",
                        "relational_climate": "Alívio visível ao poder confessar atrasos e desorganização em sessão sem receber conselhos moralizantes.",
                        "actualizing_tendency": "Criação espontânea de blocos curtos de trabalho com metas realistas e pedido honesto de prorrogação ao orientador."
                    },
                    "contextual_behavioral": {
                        "experiential_avoidance": "Procrastinação e imersão em estímulos digitais imediatos para aliviar o afeto aversivo de inadequação perante a escrita.",
                        "cognitive_fusion": "Fusão com o rótulo 'Sou indisciplinado e sempre estrago minhas oportunidades'.",
                        "valued_directions": ["Pesquisa com curiosidade genuína", "Honestidade consigo e com a equipe", "Equilíbrio de rotina"],
                        "crb1_in_session": "Chegar justificando preventivamente suas falhas da semana com humor autodepreciativo.",
                        "crb2_in_session": "Olhar para as dificuldades da semana com curiosidade funcional e planejar um passo concreto pequeno em sessão."
                    }
                }
            },
            {
                "id": "mariana-t",
                "codename": "Mariana T.",
                "last_session_date": "2026-10-11",
                "status": "Ativo",
                "source_documents": {
                    "drive_folder_url": "https://drive.google.com/drive/folders/pasta_mariana_t",
                    "dossier_url": "https://docs.google.com/document/d/dossie_mariana_t/edit",
                    "roadmap_url": "https://docs.google.com/document/d/roteiro_mariana_t/edit",
                    "notebook_url": "https://gemini.google.com/notebook/caderno_mariana_t"
                },
                "formulations": {
                    "rogers_acp": {
                        "briefing": "Mariana T. explora exaustão por camuflagem social prolongada e hipersensibilidade sensorial. Começa a legitimar sua necessidade de recolhimento e comunicação direta sem máscaras sociais.",
                        "affective_zones": [
                            "Esgotamento físico e cognitivo após interações sociais grupais prolongadas",
                            "Dor de ter passado anos moldando gestos e falas para parecer 'espontânea'",
                            "Alívio ao descobrir que suas necessidades sensoriais são legítimas"
                        ],
                        "therapist_posture": "Ambiente terapêutico de baixa demanda performática; respeito absoluto ao tempo de processamento, pausas e linguagem direta.",
                        "empathic_reflections": [
                            "Passar o dia inteiro calculando cada reação para se encaixar parece deixar você completamente sem energia para existir para si mesma...",
                            "Aqui você não precisa sustentar nenhuma máscara social; pode falar ou silenciar exatamente do seu jeito.",
                            "Reconhecer os seus limites sensoriais está deixando de parecer 'frescura' para se tornar um gesto de respeito por quem você é."
                        ],
                        "internal_frame_of_reference": "Mundo social percebido como excessivamente ruidoso e cheio de regras implícitas que exigem tradução manual constante.",
                        "incongruence_self_threat": "Desgaste severo entre a persona social altamente adaptada (camuflagem) e a experiência organísmica de sobrecarga sensorial.",
                        "conditions_of_worth": "Introjeção de que suas formas naturais de expressão e regulação deveriam ser escondidas para garantir pertencimento.",
                        "relational_climate": "Crescente espontaneidade em sessão; relata que a terapia é o primeiro lugar onde não ensaia mentalmente o que vai dizer.",
                        "actualizing_tendency": "Reorganização do ambiente de trabalho remoto, uso de estratégias de proteção sensorial e seleção de vínculos onde pode ser autêntica."
                    },
                    "contextual_behavioral": {
                        "experiential_avoidance": "Hiperadaptação e mascaramento automático em situações sociais para evitar o risco de estranhamento alheio.",
                        "cognitive_fusion": "Fusão com a regra 'Preciso parecer confortável o tempo todo para ser aceita'.",
                        "valued_directions": ["Autenticidade sem camuflagem", "Respeito ao perfil sensorial", "Relações profundas e seguras"],
                        "crb1_in_session": "Monitorar a expressão facial do terapeuta buscando confirmar se sua fala foi 'adequada'.",
                        "crb2_in_session": "Pedir diretamente uma pausa silenciosa em sessão quando sente sobrecarga cognitiva."
                    }
                }
            }
        ]
    }


def scan_privacy_violations(raw_text: str) -> List[str]:
    """Scans serialized JSON for raw CPF or email patterns."""
    issues = []
    if CPF_REGEX.search(raw_text):
        issues.append("Detected raw CPF pattern (XXX.XXX.XXX-XX) in payload.")
    if EMAIL_REGEX.search(raw_text):
        issues.append("Detected raw email address in payload.")
    return issues


def validate_with_apk_js(payload: Any) -> Tuple[bool, List[Dict[str, Any]], str]:
    """Runs the exact Android APK `client-data.js` `validateClients()` via Node.js."""
    node_script = (
        f"const {{validateClients}} = require({json.dumps(str(CLIENT_DATA_JS))});"
        "let input = '';"
        "process.stdin.on('data', d => input += d);"
        "process.stdin.on('end', () => {"
        "  try {"
        "    const out = validateClients(JSON.parse(input));"
        "    process.stdout.write(JSON.stringify({ok: true, clients: out}));"
        "  } catch (e) {"
        "    process.stdout.write(JSON.stringify({ok: false, error: e.message}));"
        "    process.exit(1);"
        "  }"
        "});"
    )
    proc = subprocess.run(
        ["node", "-e", node_script],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    try:
        res = json.loads(proc.stdout)
        if res.get("ok"):
            return True, res["clients"], ""
        return False, [], res.get("error", "Unknown JS validation error")
    except Exception as exc:
        return False, [], proc.stderr or str(exc)


def stage_clients_payload(
    raw_payload: Any,
    output_dir: Path = STAGING_DIR,
    strict_privacy: bool = True,
) -> Dict[str, Any]:
    """
    Validates, normalizes, and stages `clients_data.json` (APK-ready) and
    `clients_v2_envelope.json` into `output_dir`.
    """
    serialized_in = json.dumps(raw_payload, ensure_ascii=False)
    privacy_issues = scan_privacy_violations(serialized_in)
    if strict_privacy and privacy_issues:
        raise ValueError("Privacy Gate Rejected Payload: " + "; ".join(privacy_issues))

    # 1. Python Adapter Validation
    normalized_py, mode, py_errors = adapter.SchemaV2Importer.import_and_normalize(raw_payload)
    if py_errors:
        raise ValueError(f"Python Adapter Rejected ({mode}): {'; '.join(py_errors)}")

    # 2. APK client-data.js Cross-Runtime Validation (preserves contextualBehavioral)
    ok_js, validated_clients, js_err = validate_with_apk_js(raw_payload)
    if not ok_js:
        raise ValueError(f"APK client-data.js Rejected Payload: {js_err}")

    output_dir.mkdir(parents=True, exist_ok=True)
    staged_file = output_dir / "clients_data.json"
    staged_text = json.dumps(validated_clients, ensure_ascii=False, indent=2)
    staged_file.write_text(staged_text, encoding="utf-8")

    if isinstance(raw_payload, dict) and raw_payload.get("schema_version") == "2.0.0":
        (output_dir / "clients_v2_envelope.json").write_text(
            json.dumps(raw_payload, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    sha256_hash = hashlib.sha256(staged_text.encode("utf-8")).hexdigest()
    manifest = {
        "staged_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "mode": mode,
        "client_count": len(validated_clients),
        "client_ids": [c["id"] for c in validated_clients],
        "has_contextual_behavioral": any("contextualBehavioral" in c for c in validated_clients),
        "staged_file": str(staged_file),
        "sha256": sha256_hash,
        "privacy_gate": "PASSED",
    }
    (output_dir / "sync_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return {"manifest": manifest, "clients": validated_clients}


def analyze_transcript_text(raw_text: str) -> Dict[str, Any]:
    """In-memory transcript turn & therapist intervention analyzer."""
    lines = raw_text.splitlines()
    dialogues = []
    current_speaker = None
    current_text = []

    for line in lines:
        line_s = line.strip()
        if (
            not line_s
            or line_s.startswith("#")
            or line_s.startswith("**Duração")
            or line_s.startswith("**Participantes")
        ):
            continue
        m = re.match(r"^(André Fiker|[A-ZÀ-Ú][a-zà-ú]+(?: [A-ZÀ-Úa-zà-ú.]+)*):\s*(.*)", line_s)
        if m:
            speaker = m.group(1).strip()
            text = m.group(2).strip()
            if speaker == current_speaker:
                current_text.append(text)
            else:
                if current_speaker and current_text:
                    dialogues.append((current_speaker, " ".join(current_text)))
                current_speaker = speaker
                current_text = [text]
        elif current_speaker:
            current_text.append(line_s)

    if current_speaker and current_text:
        dialogues.append((current_speaker, " ".join(current_text)))

    therapist_turns = [t for s, t in dialogues if "andré" in s.lower() or "terapeuta" in s.lower()]
    client_turns = [t for s, t in dialogues if "andré" not in s.lower() and "terapeuta" not in s.lower()]
    sorted_interventions = sorted(therapist_turns, key=lambda x: len(x.split()), reverse=True)

    return {
        "total_turns": len(dialogues),
        "therapist_turns": len(therapist_turns),
        "therapist_words": sum(len(t.split()) for t in therapist_turns),
        "client_turns": len(client_turns),
        "client_words": sum(len(t.split()) for t in client_turns),
        "top_interventions": [
            {"words": len(t.split()), "excerpt": t[:350] + ("..." if len(t) > 350 else "")}
            for t in sorted_interventions[:3]
        ],
    }


class UnifiedStudioHandler(http.server.SimpleHTTPRequestHandler):
    """Serves the Unified Atendimentos UI from `ASSETS_DIR` plus local-only helper APIs."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ASSETS_DIR), **kwargs)

    def log_message(self, format: str, *args: Any) -> None:
        pass

    def _send_json(self, status: int, data: Any) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/status":
            manifest_path = STAGING_DIR / "sync_manifest.json"
            manifest = (
                json.loads(manifest_path.read_text(encoding="utf-8"))
                if manifest_path.exists()
                else None
            )
            self._send_json(
                200,
                {
                    "ok": True,
                    "server": "local-first-sync",
                    "staging_manifest": manifest,
                },
            )
            return
        if parsed.path == "/api/staged-clients":
            staged_path = STAGING_DIR / "clients_data.json"
            if not staged_path.exists():
                stage_clients_payload(build_active_clinical_envelope(), STAGING_DIR)
            clients = json.loads(staged_path.read_text(encoding="utf-8"))
            self._send_json(200, {"ok": True, "clients": clients})
            return
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"

        if parsed.path == "/api/stage":
            try:
                payload = json.loads(raw_body)
                result = stage_clients_payload(payload, STAGING_DIR)
                self._send_json(200, {"ok": True, **result})
            except Exception as exc:
                self._send_json(400, {"ok": False, "error": str(exc)})
            return

        if parsed.path == "/api/analyze-transcript":
            try:
                payload = json.loads(raw_body)
                stats = analyze_transcript_text(payload.get("text", ""))
                self._send_json(200, {"ok": True, "stats": stats})
            except Exception as exc:
                self._send_json(400, {"ok": False, "error": str(exc)})
            return

        self._send_json(404, {"ok": False, "error": "Unknown endpoint"})


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Local-First Sync Helper & Unified Studio Server for Atendimentos."
    )
    parser.add_argument("--input", "-i", type=str, help="Path to v1 or Schema v2.0.0 JSON file")
    parser.add_argument(
        "--stage-active",
        "--synthetic-demo",
        dest="stage_active",
        action="store_true",
        help="Validate and stage the 5-patient Schema v2.0.0 clinical roster (Helena M., Rafael S., Camila V., Lucas B., Mariana T.)",
    )
    parser.add_argument(
        "--output-dir",
        "-o",
        type=str,
        default=str(STAGING_DIR),
        help="Staging output directory (defaults to workspace/staging)",
    )
    parser.add_argument(
        "--serve",
        action="store_true",
        help="Launch the local Unified Studio server on http://127.0.0.1:8765",
    )
    parser.add_argument("--port", type=int, default=8765, help="Port for --serve mode")
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Do not automatically open the browser when starting --serve",
    )
    args = parser.parse_args()

    out_dir = Path(args.output_dir).resolve()
    if out_dir == ASSETS_DIR.resolve():
        print(
            "ERROR: Refusing to write clients_data.json inside APK assets directory.",
            file=sys.stderr,
        )
        return 1

    if args.stage_active or (not args.input and not (out_dir / "clients_data.json").exists()):
        payload = build_active_clinical_envelope()
        result = stage_clients_payload(payload, out_dir)
        print(
            f"[OK] Staged {result['manifest']['client_count']} clinical cases (Schema v2.0.0 -> APK format)"
        )
        print(f"     Cases:  {', '.join(result['manifest']['client_ids'])}")
        print(f"     File:   {result['manifest']['staged_file']}")
        print(f"     SHA256: {result['manifest']['sha256']}")
    elif args.input:
        in_path = Path(args.input).resolve()
        payload = json.loads(in_path.read_text(encoding="utf-8"))
        result = stage_clients_payload(payload, out_dir)
        print(
            f"[OK] Validated & staged {result['manifest']['client_count']} clinical cases ({result['manifest']['mode']})"
        )
        print(f"     File:   {result['manifest']['staged_file']}")
        print(f"     SHA256: {result['manifest']['sha256']}")

    if args.serve:
        url = f"http://127.0.0.1:{args.port}/index.html"
        print(f"[SERVER] Unified Atendimentos Studio running at {url}")
        if not args.no_browser:
            webbrowser.open(url)
        with socketserver.TCPServer(("127.0.0.1", args.port), UnifiedStudioHandler) as httpd:
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n[SERVER] Stopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
