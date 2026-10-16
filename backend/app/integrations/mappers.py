from typing import Any


def normalize_supplier(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": payload.get("name") or payload.get("nombre"),
        "email": payload.get("email") or payload.get("correo"),
        "phone": payload.get("phone") or payload.get("telefono"),
        "municipality": payload.get("municipality")
        or payload.get("municipio")
        or "Pitalito",
        "department": payload.get("department")
        or payload.get("departamento")
        or "Huila",
    }


def validate_supplier(payload: dict[str, Any]) -> dict[str, Any]:
    normalized = normalize_supplier(payload)
    if not normalized["name"]:
        raise ValueError("La respuesta externa no contiene nombre")
    return normalized
