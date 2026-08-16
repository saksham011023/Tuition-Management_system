"""
Settings API routes.
"""

import os

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.core.config import settings
from src.core.dependencies import get_current_user, get_db
from src.settings.repository import SettingsRepository
from src.settings.schemas import OnboardingWizardPayload, SystemSettingsUpdate, TeacherProfileUpdate
from src.settings.service import SettingsService, get_db_file_path

router = APIRouter()


@router.post("/onboarding", tags=["Settings"])
async def complete_onboarding(
    data: OnboardingWizardPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Complete first-time teacher setup wizard."""
    repo = SettingsRepository(db)
    updated_user = await repo.complete_onboarding(current_user, data.model_dump())
    from src.auth.schemas import UserResponse
    return {
        "status": "success",
        "message": "Onboarding setup completed successfully!",
        "user": UserResponse.model_validate(updated_user),
    }


@router.get("", tags=["Settings"])
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Get all system settings configurations."""
    service = SettingsService(db)
    return await service.get_all_settings()


@router.put("", tags=["Settings"])
async def update_settings(
    data: SystemSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Bulk update system settings configurations."""
    service = SettingsService(db)
    return await service.save_settings(data.settings)


@router.put("/profile", tags=["Settings"])
async def update_profile(
    data: TeacherProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current teacher user profile details (Name, Email, Password)."""
    repo = SettingsRepository(db)
    updated_user = await repo.update_teacher_profile(current_user, data)
    return {
        "id": updated_user.id,
        "name": updated_user.name,
        "email": updated_user.email,
        "role": updated_user.role,
    }


@router.post("/backup", tags=["Settings"])
async def trigger_backup(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger an immediate database backup."""
    service = SettingsService(db)
    try:
        backup_path = await service.trigger_db_backup()
        return {
            "status": "success",
            "message": "Database backup created successfully.",
            "backup_path": os.path.basename(backup_path),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create database backup: {str(e)}",
        )


@router.get("/export", tags=["Settings"])
async def export_database(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    """Download database file export (SQLite binary file or PostgreSQL JSON backup)."""
    if "sqlite" in settings.DATABASE_URL:
        db_path = get_db_file_path()
        if not os.path.exists(db_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Database file not found on host.",
            )
        return FileResponse(
            path=db_path,
            media_type="application/x-sqlite3",
            filename="tms_database_export.db",
        )
    else:
        from src.data_management.backup_service import BackupService
        backup_service = BackupService()
        result = await backup_service.create_backup(db, performed_by=current_user.email)
        return FileResponse(
            path=result["filepath"],
            media_type="application/json",
            filename=result["filename"],
        )
