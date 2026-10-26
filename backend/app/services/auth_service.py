import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from app.services.database import connect


SESSION_DAYS = 14
SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _public_user(row) -> dict:
    return {"id": row["id"], "name": row["name"], "email": row["email"], "role": "PRACTITIONER"}


def _hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    derived = hashlib.scrypt(
        password.encode("utf-8"), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, dklen=64
    )
    return f"scrypt${salt.hex()}${derived.hex()}"


def _verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, salt_hex, expected_hex = encoded.split("$", 2)
        if algorithm != "scrypt":
            return False
        actual = _hash_password(password, bytes.fromhex(salt_hex)).split("$", 2)[2]
        return hmac.compare_digest(actual, expected_hex)
    except (ValueError, TypeError):
        return False


def _issue_session(connection, user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires_at = (_now() + timedelta(days=SESSION_DAYS)).isoformat(timespec="seconds")
    connection.execute(
        "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
        (token_hash, user_id, expires_at),
    )
    return token


def register(name: str, email: str, password: str) -> tuple[dict, str]:
    normalized_name = " ".join(name.split())
    normalized_email = email.strip().lower()
    if len(normalized_name) < 2:
        raise ValueError("Veuillez saisir votre nom complet.")
    if "@" not in normalized_email or "." not in normalized_email.rsplit("@", 1)[-1]:
        raise ValueError("Veuillez saisir une adresse email valide.")
    if len(password) < 10 or len(password) > 128:
        raise ValueError("Le mot de passe doit contenir entre 10 et 128 caractères.")

    user_id = uuid.uuid4().hex
    created_at = _now().isoformat(timespec="seconds")
    password_hash = _hash_password(password)
    try:
        with connect() as connection:
            connection.execute(
                "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
                (user_id, normalized_name, normalized_email, password_hash, created_at),
            )
            row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            token = _issue_session(connection, user_id)
    except Exception as error:
        if "UNIQUE constraint failed: users.email" in str(error):
            raise ValueError("Un compte existe déjà avec cette adresse email.") from error
        raise
    return _public_user(row), token


def login(email: str, password: str) -> tuple[dict, str]:
    normalized_email = email.strip().lower()
    with connect() as connection:
        row = connection.execute("SELECT * FROM users WHERE email = ?", (normalized_email,)).fetchone()
        if row is None or not _verify_password(password, row["password_hash"]):
            raise ValueError("Adresse email ou mot de passe incorrect.")
        token = _issue_session(connection, row["id"])
        return _public_user(row), token


def get_user_for_token(token: str) -> dict | None:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    now = _now().isoformat(timespec="seconds")
    with connect() as connection:
        row = connection.execute(
            "SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id "
            "WHERE sessions.token_hash = ? AND sessions.expires_at > ?",
            (token_hash, now),
        ).fetchone()
        if row is None:
            connection.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))
            return None
        return _public_user(row)


def revoke_token(token: str) -> None:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    with connect() as connection:
        connection.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))
