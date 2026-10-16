from __future__ import annotations

from dataclasses import asdict, dataclass

from .models import TrustSignals

FORMULA_VERSION = "trust-v1"


@dataclass(frozen=True)
class TrustAssessment:
    score: int
    level: str
    formula_version: str
    signals: dict[str, int | bool]
    explanations: list[str]
    limitations: list[str]

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


def _bounded_int(value: int, field: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError(f"{field} must be a non-negative integer")
    return value


def calculate_trust(signals: TrustSignals) -> TrustAssessment:
    """Return a deterministic score with visible evidence and limitations.

    The score is intentionally a transparent rule set for the hackathon. It is
    not a proof of identity, solvency, product quality or legal compliance.
    """

    evidence_count = _bounded_int(signals.evidence_count, "evidence_count")
    verified_events = _bounded_int(signals.verified_events, "verified_events")
    consistency_checks = _bounded_int(
        signals.consistency_checks, "consistency_checks"
    )
    resolved_incidents = _bounded_int(
        signals.resolved_incidents, "resolved_incidents"
    )
    open_incidents = _bounded_int(signals.open_incidents, "open_incidents")

    profile_points = 20 if signals.profile_complete else 0
    evidence_points = min(evidence_count, 5) * 4
    event_points = min(verified_events, 5) * 4
    consistency_points = min(consistency_checks, 5) * 5
    resolution_points = min(resolved_incidents, 3) * 5
    penalty = min(open_incidents * 10, 50)
    score = max(
        0,
        min(
            100,
            profile_points
            + evidence_points
            + event_points
            + consistency_points
            + resolution_points
            - penalty,
        ),
    )
    level = "ALTA" if score >= 80 else "MEDIA" if score >= 60 else "BAJA"
    explanations = [
        f"Perfil completo: +{profile_points}/20.",
        f"Evidencias verificables: +{evidence_points}/20 ({evidence_count} registradas).",
        f"Eventos de trazabilidad verificados: +{event_points}/20 ({verified_events}).",
        f"Controles de consistencia: +{consistency_points}/25 ({consistency_checks}).",
        f"Incidencias resueltas: +{resolution_points}/15 ({resolved_incidents}).",
    ]
    if penalty:
        explanations.append(
            f"Incidencias abiertas: -{penalty} ({open_incidents} registradas)."
        )
    else:
        explanations.append("Sin incidencias abiertas: no se aplica penalización.")

    return TrustAssessment(
        score=score,
        level=level,
        formula_version=FORMULA_VERSION,
        signals={
            "profile_complete": signals.profile_complete,
            "evidence_count": evidence_count,
            "verified_events": verified_events,
            "consistency_checks": consistency_checks,
            "resolved_incidents": resolved_incidents,
            "open_incidents": open_incidents,
        },
        explanations=explanations,
        limitations=[
            "La puntuación orienta decisiones; no reemplaza verificación humana.",
            "La confianza depende de los datos disponibles y puede cambiar con nuevos eventos.",
        ],
    )
