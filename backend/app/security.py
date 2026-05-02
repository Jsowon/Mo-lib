import bcrypt

from app.config import get_settings


def hash_password(plain_password: str) -> str:
    rounds = get_settings().BCRYPT_ROUNDS
    salt = bcrypt.gensalt(rounds=rounds)
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    평문 비밀번호와 해시 비교.
    잘못된 해시 포맷이면 False 반환 (예외 던지지 않음).
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False
