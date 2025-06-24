# backend/parser/crypto_utils.py

import os
import base64
from pathlib import Path
from dotenv import load_dotenv


def decrypt_api_key(obfuscated_key: str) -> str:
    # Load secret
    env_path = Path(__file__).parent.parent / "frontend" / ".env"
    load_dotenv(dotenv_path=env_path)
    secret = os.getenv("VITE_ENCRYPTION_SECRET_KEY")
    if not secret:
        raise ValueError("Missing VITE_ENCRYPTION_SECRET_KEY")


    return obfuscated_key
