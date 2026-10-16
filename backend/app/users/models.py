from dataclasses import dataclass


@dataclass(frozen=True)
class UserInput:
    full_name: str
    email: str
    password_hash: str
    roles: tuple[str, ...] = ("BUYER",)
    phone: str | None = None
    municipality: str | None = None
