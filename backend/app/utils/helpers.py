import hashlib
from pathlib import Path
from app.config import settings


def get_index_path(filename: str) -> Path:
    name_hash = hashlib.md5(filename.encode()).hexdigest()[:8]
    stem = Path(filename).stem
    index_dir = Path(settings.storage_dir) / f"{stem}_{name_hash}"
    index_dir.mkdir(parents=True, exist_ok=True)
    return index_dir


def index_exists(index_path: Path) -> bool:
    return index_path.exists() and any(index_path.iterdir())