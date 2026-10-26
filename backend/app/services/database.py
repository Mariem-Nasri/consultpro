import os
import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


_DEFAULT_DB_PATH = Path(__file__).resolve().parents[2] / "data" / "consultpro.sqlite3"
DB_PATH = Path(os.environ.get("CONSULTPRO_DB_PATH", str(_DEFAULT_DB_PATH))).expanduser()


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=15)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    with connect() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL COLLATE NOCASE UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
            CREATE TABLE IF NOT EXISTS analyses (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TEXT NOT NULL,
                status TEXT NOT NULL,
                duration_s REAL,
                score INTEGER,
                result_json TEXT,
                error TEXT
            );
            CREATE INDEX IF NOT EXISTS analyses_user_created_idx
                ON analyses(user_id, created_at DESC);
            """
        )


def create_analysis(analysis_id: str, user_id: str, created_at: str) -> None:
    with connect() as connection:
        connection.execute(
            "INSERT INTO analyses (id, user_id, created_at, status) VALUES (?, ?, ?, 'pending')",
            (analysis_id, user_id, created_at),
        )


def update_analysis_status(analysis_id: str, status: str, error: str | None = None) -> None:
    with connect() as connection:
        connection.execute(
            "UPDATE analyses SET status = ?, error = ? WHERE id = ?",
            (status, error, analysis_id),
        )


def save_analysis_result(
    analysis_id: str,
    result: dict,
    duration_s: float | None,
    score: int | None,
) -> None:
    with connect() as connection:
        connection.execute(
            "UPDATE analyses SET status = 'done', error = NULL, result_json = ?, "
            "duration_s = ?, score = ? WHERE id = ?",
            (json.dumps(result, ensure_ascii=False), duration_s, score, analysis_id),
        )


def get_analysis_for_user(analysis_id: str, user_id: str) -> dict | None:
    with connect() as connection:
        row = connection.execute(
            "SELECT id, user_id, created_at, status, duration_s, score, result_json, error "
            "FROM analyses WHERE id = ? AND user_id = ?",
            (analysis_id, user_id),
        ).fetchone()
    if row is None:
        return None
    analysis = dict(row)
    analysis["result"] = json.loads(analysis.pop("result_json")) if analysis["result_json"] else None
    return analysis


def list_analyses_for_user(user_id: str) -> list[dict]:
    with connect() as connection:
        rows = connection.execute(
            "SELECT id, created_at, status, duration_s, score, error "
            "FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
            (user_id,),
        ).fetchall()
    return [dict(row) for row in rows]
