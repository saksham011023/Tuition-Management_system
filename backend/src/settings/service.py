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
        self.db = db
        self.repo = SettingsRepository(db)

    async def get_all_settings(self) -> dict[str, any]:
        """Fetch current settings configurations."""
        return await self.repo.get_all_settings()

    async def save_settings(self, settings_dict: dict[str, any]) -> dict[str, any]:
        """Save settings configurations."""
        return await self.repo.save_settings(settings_dict)

    async def trigger_db_backup(self) -> str:
        """Create a timestamped backup. Uses file copy for SQLite, or database-agnostic JSON backup for PostgreSQL."""
        if "sqlite" in settings.DATABASE_URL:
            db_path = get_db_file_path()
            if not os.path.exists(db_path):
                raise FileNotFoundError(f"Active database file not found at path: {db_path}")

            backups_dir = settings.BACKUP_DIR
            os.makedirs(backups_dir, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"tms_backup_{timestamp}.db"
            backup_path = os.path.join(backups_dir, backup_filename)

            shutil.copy2(db_path, backup_path)
            return os.path.abspath(backup_path)
        else:
            from src.data_management.backup_service import BackupService
            backup_service = BackupService()
            result = await backup_service.create_backup(self.db, performed_by="settings_backup")
            return result["filepath"]
