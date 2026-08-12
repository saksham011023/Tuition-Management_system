"""
Settings service layer — handles backups, database file exports, and system settings.
"""

import os
import shutil
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.settings.repository import SettingsRepository


def get_db_file_path() -> str:
    """Extract SQLite database file path from settings."""
    db_url = settings.DATABASE_URL
    if "sqlite" in db_url:
        parts = db_url.split("///")
        if len(parts) > 1:
            return parts[1]
    return "./tms.db"  # Fallback default


class SettingsService:
    """Coordinates backup, export, configuration, and profile editing workflows."""

    def __init__(self, db: AsyncSession):
        self.repo = SettingsRepository(db)

    async def get_all_settings(self) -> dict[str, any]:
        """Fetch current settings configurations."""
        return await self.repo.get_all_settings()

    async def save_settings(self, settings_dict: dict[str, any]) -> dict[str, any]:
        """Save settings configurations."""
        return await self.repo.save_settings(settings_dict)

    def trigger_db_backup(self) -> str:
        """Create a timestamped copy of the SQLite database file in a backups folder."""
        db_path = get_db_file_path()
        if not os.path.exists(db_path):
            raise FileNotFoundError(f"Active database file not found at path: {db_path}")

        # Establish backups folder
        backups_dir = "./backups"
        os.makedirs(backups_dir, exist_ok=True)

        # Create timestamped file name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"tms_backup_{timestamp}.db"
        backup_path = os.path.join(backups_dir, backup_filename)

        # Copy database file
        shutil.copy2(db_path, backup_path)
        return os.path.abspath(backup_path)
