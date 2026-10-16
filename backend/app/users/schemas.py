import re


def validate_user_payload(data: dict, *, require_password_hash: bool = True) -> dict:
    required = ('full_name', 'email') + (('password_hash',) if require_password_hash else ())
    missing = [field for field in required if data.get(field) in (None, '')]
    if missing: raise ValueError(f'Campos requeridos: {", ".join(missing)}')
    if not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', str(data['email'])): raise ValueError('Email inválido')
    if require_password_hash and len(str(data['password_hash'])) < 20: raise ValueError('password_hash no parece un hash válido')
    roles = [str(role).upper() for role in data.get('roles', ['BUYER'])]
    invalid = set(roles) - {'OPERATOR','ADMIN','BUYER'}
    if invalid: raise ValueError(f'Roles inválidos: {", ".join(sorted(invalid))}')
    return {**data, 'roles': roles}
