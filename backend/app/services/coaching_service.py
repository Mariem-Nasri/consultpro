"""
coaching_service.py
--------------------
Portage du notebook `coaching_praticien_v2.ipynb` en module Python pur.

On garde EXACTEMENT les mêmes formules de calcul (stats, SVS, communication)
que le notebook, mais :
- Pas de Plotly / ipywidgets : on ne fait QUE calculer les données.
  L'affichage (jauge, timeline, graphes) est fait côté frontend React,
  avec les composants fournis séparément (SVSGauge, Timeline, CommunicationPanel).
- Pas de pandas nécessaire côté service pur (évite une dépendance lourde
  côté API si tu veux la garder légère) — réécrit en Python natif.
  Si tu préfères garder pandas (plus proche du notebook), c'est trivial
  à ré-adapter.

MODIF (correctif axes d'amélioration + diction) :
- BUG CORRIGÉ : `axes` ne vérifiait que 4 des 7 métriques calculées dans
  `comm`. `empathie`, `interruptions` et `resistance_patient` étaient
  calculées et affichées dans "points forts" quand elles étaient bonnes,
  mais n'avaient jamais de contrepartie "axe d'amélioration" quand elles
  étaient mauvaises (ex. Empathie=0% + Résistance=30% -> "rien à signaler").
  Les 3 conditions manquantes sont ajoutées ci-dessous.
- NOUVEAU : agrégation des indicateurs de diction (débit, variation de ton)
  exposés par diarization_service.py sur chaque segment Médecin
  (debit_mots_par_sec, pitch_std). Couvre l'axe "phonétique et diction"
  du cahier des charges, jusque-là absent du coaching.
  Le seuil sur pitch_std est indicatif — à calibrer avec de vraies données
  de test avant de s'appuyer dessus en production.
"""

import re
import datetime
from collections import defaultdict


def _pct_match(texts, pattern, scale=1.0):
    n = sum(1 for t in texts if re.search(pattern, t.lower()))
    return min(100, round(n / max(len(texts), 1) * 100 * scale))


def _avg(values):
    values = [v for v in values if v is not None]
    return round(sum(values) / len(values), 2) if values else None


def generate_coaching(report: dict) -> dict:
    """
    :param report: dict équivalent à report.json (sortie de diarization_service)
    :return: dict équivalent à coaching_output.json, prêt à être renvoyé au
             frontend et affiché avec les composants React fournis.
    """
    segments_raw = report.get("segments", [])
    if not segments_raw:
        raise ValueError("Aucun segment trouvé dans le rapport de diarisation.")

    rows = []
    for seg in segments_raw:
        if "start_ms" in seg:
            start = seg["start_ms"] / 1000.0
            end = seg["end_ms"] / 1000.0
            duration = seg["duration_ms"] / 1000.0
        else:
            start = float(seg.get("start", seg.get("start_time", 0)))
            end = float(seg.get("end", seg.get("end_time", 0)))
            duration = round(end - start, 3)

        role = seg.get("speaker") or seg.get("role", "")
        if not role:
            sid = seg.get("speaker_id", "")
            role = report.get("role_map", {}).get(sid, sid)

        rows.append({
            "role": role,
            "start": round(start, 3),
            "end": round(end, 3),
            "duration": round(duration, 3),
            "text": seg.get("text", seg.get("transcript", "")),
            "debit_mots_par_sec": seg.get("debit_mots_par_sec"),
            "pitch_std": seg.get("pitch_std"),
            "energy_mean": seg.get("energy_mean"),
        })

    total_duration = report.get("duration_s", max((r["end"] for r in rows), default=0))
    total_speech = sum(r["duration"] for r in rows)
    silence_dur = max(0.0, total_duration - total_speech)

    # ── Stats par rôle ──────────────────────────────────────────────
    by_role = defaultdict(list)
    for r in rows:
        by_role[r["role"]].append(r)

    stats = []
    for role, items in by_role.items():
        total = sum(i["duration"] for i in items)
        stats.append({
            "role": role,
            "segments": len(items),
            "total": round(total, 1),
            "mean": round(total / len(items), 2) if items else 0,
            "pct": round(total / total_duration * 100, 1) if total_duration else 0,
        })

    med_texts = [r["text"] for r in rows if r["role"] == "Médecin"]
    pat_texts = [r["text"] for r in rows if r["role"] == "Patient"]
    med_rows = [r for r in rows if r["role"] == "Médecin"]

    comm = {
        "questions_ouvertes": _pct_match(
            med_texts, r"\b(comment|pourquoi|qu[e'] |quel|depuis|racontez|décrivez|parlez)", 2.5),
        "reformulations": _pct_match(
            med_texts, r"\b(donc|c'est-à-dire|vous dites|si je comprends|autrement dit)", 3.0),
        "empathie": _pct_match(
            med_texts, r"\b(merci|je comprends|normal|rassure|bien sûr|je vous remercie)", 3.5),
        "interruptions": min(35, round(len(med_rows) / max(len(rows), 1) * 40)),
        "hesitations_patient": _pct_match(
            pat_texts, r"\b(euh|hm|ben|enfin|je sais pas|peut-être|j'hésite|je sais plus)", 2.5),
        "resistance_patient": _pct_match(
            pat_texts, r"\b(non|mais|pourtant|je refuse|jamais|trop cher)", 2.0),
        "max_segment_dur": round(max((r["duration"] for r in med_rows), default=0), 1),
        "nb_long_segments": sum(1 for r in med_rows if r["duration"] > 60),
        # ── Diction (nouveau) ──────────────────────────────────────
        "debit_moyen": _avg([r["debit_mots_par_sec"] for r in med_rows]),
        "pitch_std_moyen": _avg([r["pitch_std"] for r in med_rows]),
    }
    comm["engagement_patient"] = min(100, max(
        20, 100 - comm["hesitations_patient"] - comm["resistance_patient"] // 2
    ))

    # ── Score SVS ────────────────────────────────────────────────────
    med_stat = next((s for s in stats if s["role"] == "Médecin"), None)
    med_pct = med_stat["pct"] if med_stat else 60.0

    s1 = min(100, round(comm["empathie"] * 0.5 + (100 - comm["hesitations_patient"]) * 0.5))
    s2 = min(100, round(85 - max(0, med_pct - 65)))
    s3 = 61  # non évaluable sans questionnaire médical
    s4 = min(100, round((100 - comm["interruptions"]) * 0.5 + comm["engagement_patient"] * 0.5))
    svs = {
        "S1_emotionnel": s1,
        "S2_fonctionnel": s2,
        "S3_systemique": s3,
        "S4_relationnel": s4,
        "global": round(s1 * .25 + s2 * .30 + s3 * .20 + s4 * .25),
    }

    report_text = _make_coaching_report_text(comm, svs, stats, total_duration)

    return {
        "generated_at": datetime.datetime.now().isoformat(),
        "total_duration_s": round(total_duration, 2),
        "silence_s": round(silence_dur, 2),
        "segments": rows,          # pour la timeline
        "stats": stats,            # pour le tableau / bar chart par rôle
        "svs": svs,                # pour la jauge SVS
        "communication": comm,     # pour le panneau communication
        "report_text": report_text,  # rapport texte formaté (cellule 7 du notebook)
        "garde_fous": {
            "aucun_diagnostic": True,
            "aucun_terme_pathologique": True,
            "usage_praticien_uniquement": True,
            "aucun_message_patient": True,
        },
    }


def _make_coaching_report_text(comm, svs, stats, total_duration) -> str:
    """Reproduit le rapport texte de la cellule 7 du notebook (sans les emojis
    superflus, prêt à être affiché tel quel dans un <pre> ou une carte)."""
    mention = "Excellente" if svs["global"] >= 80 else "Bonne" if svs["global"] >= 65 else "À améliorer"

    lines = [
        "RAPPORT DE COACHING PRATICIEN",
        "Usage interne uniquement · non diagnostique",
        "",
        "STATISTIQUES",
        f"  Durée totale : {total_duration:.0f}s ({total_duration/60:.1f} min)",
    ]
    for r in stats:
        lines.append(f"  {r['role']:<12}: {r['segments']} seg · {r['total']:.0f}s ({r['pct']}%)")

    lines += [
        "",
        "SCORE SVS",
        f"  Global         : {svs['global']}/100 ({mention})",
        f"  S1 Émotionnel  : {svs['S1_emotionnel']}/100",
        f"  S2 Fonctionnel : {svs['S2_fonctionnel']}/100",
        f"  S3 Systémique  : {svs['S3_systemique']}/100 (questionnaire médical recommandé)",
        f"  S4 Relationnel : {svs['S4_relationnel']}/100",
    ]

    if comm.get("debit_moyen") is not None:
        lines += [
            "",
            "DICTION (indicatif — seuils à calibrer)",
            f"  Débit moyen    : {comm['debit_moyen']} mots/s",
        ]
        if comm.get("pitch_std_moyen") is not None:
            lines.append(f"  Variation de ton : {comm['pitch_std_moyen']}")

    points_forts = []
    if comm["empathie"] >= 50:
        points_forts.append(f"Empathie verbale : {comm['empathie']}%")
    if comm["questions_ouvertes"] >= 40:
        points_forts.append(f"Questions ouvertes : {comm['questions_ouvertes']}%")
    if comm["resistance_patient"] < 20:
        points_forts.append("Faible résistance patient")
    if comm["nb_long_segments"] <= 1:
        points_forts.append("Structure de consultation cohérente")
    lines += ["", "POINTS FORTS"] + [f"  - {p}" for p in points_forts]

    axes = []
    if comm["reformulations"] < 40:
        axes += [f"Reformulations {comm['reformulations']}% -> viser 40%",
                 "  Ex : \"Si je comprends bien, vous ressentez...\""]
    if comm["max_segment_dur"] > 90:
        axes += [f"Monologue long : {comm['max_segment_dur']:.0f}s sans retour patient",
                 "  Fragmenter : \"Est-ce que cela vous semble clair ?\""]
    if comm["questions_ouvertes"] < 60:
        axes += [f"Questions ouvertes {comm['questions_ouvertes']}% -> viser 60%",
                 "  \"Comment décrivez-vous la douleur ?\" plutôt que \"Vous avez mal ?\""]
    if comm["hesitations_patient"] > 30:
        axes += [f"Hésitations patient : {comm['hesitations_patient']}%",
                 "  Vérifier la compréhension du plan de traitement"]
    # ── Conditions manquantes ajoutées (bug corrigé) ────────────────
    if comm["empathie"] < 30:
        axes += [f"Empathie verbale {comm['empathie']}% -> viser 30%+",
                 "  Ex : \"Je comprends que cela puisse être difficile...\""]
    if comm["interruptions"] > 20:
        axes += [f"Interruptions {comm['interruptions']}% -> laisser le patient terminer",
                 "  Marquer une pause avant de répondre"]
    if comm["resistance_patient"] > 25:
        axes += [f"Résistance patient {comm['resistance_patient']}% -> explorer les réticences",
                 "  Ex : \"Qu'est-ce qui vous inquiète dans ce traitement ?\""]
    # ── Diction (nouveau, seuil indicatif) ───────────────────────────
    if comm.get("debit_moyen") is not None and comm["debit_moyen"] > 4.0:
        axes += [f"Débit rapide : {comm['debit_moyen']} mots/s -> ralentir",
                 "  Marquer des pauses entre les phrases clés"]

    if not axes:
        axes = ["Rien à signaler sur cette consultation."]

    lines += ["", "AXES D'AMÉLIORATION"] + [f"  - {a}" for a in axes]

    return "\n".join(lines)