"""
BackupService — full JSON database backup and restore.
"""

from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings


class BackupService:
    """Creates and restores full JSON backups of the TMS database."""

    def __init__(self) -> None:
        self.backup_dir = Path(settings.BACKUP_DIR)
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    # ──────────────────────────────────────────
    # Create Backup
    # ──────────────────────────────────────────

    async def create_backup(self, db: AsyncSession, performed_by: str = "system") -> dict:
        """
        Export all main tables to a JSON structure and save to backup directory.
        Returns backup metadata.
        """
        timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
        filename = f"tms_backup_{timestamp}.json"
        filepath = self.backup_dir / filename

        tables = [
            "users",
            "batches",
            "students",
            "student_batches",
            "payments",
            "attendance",
            "test_scores",
            "fee_records",
            "fee_transactions",
            "notifications",
            "message_templates",
            "activity_logs",
        ]

        backup_data: dict = {
            "version": "1.0",
            "created_at": datetime.now(UTC).isoformat(),
            "performed_by": performed_by,
            "tables": {},
        }

        record_counts: dict = {}

        for table in tables:
            try:
                result = await db.execute(text(f"SELECT * FROM {table}"))  # noqa: S608
                cols = list(result.keys())
                rows = [dict(zip(cols, row)) for row in result.fetchall()]

                # Convert non-serializable types
                serializable_rows = []
                for row in rows:
                    clean_row = {}
                    for k, v in row.items():
                        if hasattr(v, "isoformat"):
                            clean_row[k] = v.isoformat()
                        elif isinstance(v, bytes):
                            clean_row[k] = v.decode("utf-8", errors="replace")
                        else:
                            clean_row[k] = v
                    serializable_rows.append(clean_row)

                backup_data["tables"][table] = serializable_rows
                record_counts[table] = len(rows)
            except Exception as e:
                # Table might not exist yet — skip gracefully
                backup_data["tables"][table] = []
                record_counts[table] = 0
                backup_data.setdefault("warnings", []).append(f"Skipped table '{table}': {e}")

        backup_data["record_counts"] = record_counts

        # Write to file
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(backup_data, f, ensure_ascii=False, indent=2, default=str)

        # Log to activity log
        try:
            from src.activity_log.repository import ActivityLogRepository
            log_repo = ActivityLogRepository(db)
            await log_repo.log(
                action="backup_created",
                summary=f"Backup created: {filename}",
                performed_by=performed_by,
                entity_type="Backup",
                details={"filename": filename, "record_counts": record_counts},
            )
        except Exception:
            pass

        return {
            "filename": filename,
            "filepath": str(filepath),
            "created_at": datetime.now(UTC).isoformat(),
            "size_bytes": filepath.stat().st_size,
            "record_counts": record_counts,
        }

    # ──────────────────────────────────────────
    # List Backups
    # ──────────────────────────────────────────

    def list_backups(self) -> list[dict]:
        """Return metadata for all backup files in the backup directory."""
        backups = []
        for f in sorted(self.backup_dir.glob("tms_backup_*.json"), reverse=True):
            try:
                stat = f.stat()
                # Quick peek at metadata without loading full file
                with open(f, encoding="utf-8") as fp:
                    data = json.load(fp)
                backups.append({
                    "filename": f.name,
                    "created_at": data.get("created_at", stat.st_mtime),
                    "size_bytes": stat.st_size,
                    "record_counts": data.get("record_counts", {}),
                })
            except Exception:
                pass
        return backups

    # ──────────────────────────────────────────
    # Restore Backup
    # ──────────────────────────────────────────

    async def restore_backup(
        self,
        backup_data: dict,
        db: AsyncSession,
        performed_by: str = "system",
    ) -> dict:
        """
        Restore a database from a JSON backup.
        CAUTION: This clears existing data for backed-up tables before restoring.
        """
        tables_in_order = [
            "activity_logs",
            "fee_transactions",
            "fee_records",
            "test_scores",
            "attendance",
            "payments",
            "student_batches",
            "notifications",
            "students",
            "batches",
            "message_templates",
            "users",
        ]

        restored_counts: dict = {}

        for table in tables_in_order:
            rows = backup_data.get("tables", {}).get(table, [])
            if not rows:
                restored_counts[table] = 0
                continue
            try:
                await db.execute(text(f"DELETE FROM {table}"))  # noqa: S608
                await db.flush()

                for row in rows:
                    cols = ", ".join(row.keys())
                    placeholders = ", ".join(f":{k}" for k in row.keys())
                    await db.execute(
                        text(f"INSERT INTO {table} ({cols}) VALUES ({placeholders})"),  # noqa: S608
                        row,
                    )
                await db.flush()
                restored_counts[table] = len(rows)
            except Exception as e:
                restored_counts[table] = -1
                restored_counts[f"{table}_error"] = str(e)

        # Log to activity log
        try:
            from src.activity_log.repository import ActivityLogRepository
            log_repo = ActivityLogRepository(db)
            await log_repo.log(
                action="restore_performed",
                summary="Database restored from backup",
                performed_by=performed_by,
                entity_type="Backup",
                details={"restored_counts": restored_counts},
            )
        except Exception:
            pass

        return {
            "success": True,
            "message": "Backup restored successfully.",
            "record_counts": restored_counts,
        }

    async def restore_from_file(
        self, filename: str, db: AsyncSession, performed_by: str = "system"
    ) -> dict:
        """Load a backup file by filename and restore it."""
        filepath = self.backup_dir / filename
        if not filepath.exists():
            return {"success": False, "message": f"Backup file not found: {filename}", "record_counts": {}}

        with open(filepath, encoding="utf-8") as f:
            backup_data = json.load(f)

        return await self.restore_backup(backup_data, db, performed_by)

    async def restore_from_bytes(
        self, data: bytes, db: AsyncSession, performed_by: str = "system"
    ) -> dict:
        """Parse uploaded backup bytes and restore."""
        backup_data = json.loads(data.decode("utf-8"))
        return await self.restore_backup(backup_data, db, performed_by)
