"""
Settings repository layer — system config CRUD and user profile updates.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.core.security import hash_password
from src.settings.models import SystemSetting
from src.settings.schemas import TeacherProfileUpdate


class SettingsRepository:
    """Handles all data access queries for settings and teacher user profile editing."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_settings(self) -> dict[str, any]:
        """Fetch all settings as a flat key-value dictionary, seeding defaults if empty."""
        stmt = select(SystemSetting)
        res = await self.db.execute(stmt)
        rows = res.scalars().all()
        settings_dict = {r.key: r.value for r in rows}

        # Seed default Excellence Tuition Classes settings if empty
        defaults = {
            "institute_name": "Excellence Tuition Classes",
            "institute_address": "Near Main Market, Station Road",
            "institute_phone": "",
            "institute_email": "",
            "preferred_currency": "₹",
            "receipt_prefix": "ETC",
            "receipt_start_num": 1000,
            "receipt_footer": "Thank you for choosing Excellence Tuition Classes. Keep this receipt for your records.",
            "primary_color": "#4F46E5",
            "secondary_color": "#10B981",
            "teacher_name": "Teacher",
            "academic_session": "2026-2027",
            "academic_term": "Full Year Course",
            "fee_due_date_day": 10,
        }

        missing = {k: v for k, v in defaults.items() if k not in settings_dict}
        if missing:
            for k, v in missing.items():
                new_s = SystemSetting(key=k, value=v)
                self.db.add(new_s)
                settings_dict[k] = v
            await self.db.flush()

        return settings_dict

    async def save_settings(self, settings: dict[str, any]) -> dict[str, any]:
        """Upsert (insert or update) settings bulk."""
        stmt = select(SystemSetting)
        res = await self.db.execute(stmt)
        existing = {r.key: r for r in res.scalars().all()}

        for key, value in settings.items():
            if key in existing:
                existing[key].value = value
            else:
                new_setting = SystemSetting(key=key, value=value)
                self.db.add(new_setting)

        await self.db.flush()
        return await self.get_all_settings()

    async def update_teacher_profile(self, user: User, data: TeacherProfileUpdate) -> User:
        """Update teacher profile details, including hashing new password if supplied."""
        user.name = data.name
        user.email = str(data.email)
        if data.password:
            user.hashed_password = hash_password(data.password)
        if data.phone:
            user.phone = data.phone
        if data.profile_image:
            user.profile_image = data.profile_image
        if data.signature_image:
            user.signature_image = data.signature_image
        self.db.add(user)
        await self.db.flush()
        return user

    async def complete_onboarding(self, user: User, data_dict: dict[str, any]) -> User:
        """Process onboarding wizard submission and mark user as onboarded."""
        # 1. Update user profile
        user.name = data_dict.get("teacher_name", user.name)
        user.email = str(data_dict.get("teacher_email", user.email))
        user.phone = data_dict.get("teacher_phone", user.phone)
        user.is_onboarded = True
        if data_dict.get("teacher_signature_url"):
            user.signature_image = data_dict["teacher_signature_url"]
        self.db.add(user)

        # 2. Save settings
        settings_to_save = {
            "institute_name": data_dict.get("institute_name", "Excellence Tuition Classes"),
            "institute_address": data_dict.get("address", ""),
            "institute_phone": data_dict.get("teacher_phone", ""),
            "institute_email": data_dict.get("teacher_email", ""),
            "teacher_name": data_dict.get("teacher_name", user.name),
            "academic_session": data_dict.get("academic_session", "2026-2027"),
            "preferred_currency": data_dict.get("preferred_currency", "₹"),
            "receipt_prefix": data_dict.get("receipt_prefix", "ETC"),
            "receipt_footer": data_dict.get("receipt_footer", "Thank you for choosing Excellence Tuition Classes."),
            "primary_color": data_dict.get("primary_color", "#4F46E5"),
            "secondary_color": data_dict.get("secondary_color", "#10B981"),
            "city": data_dict.get("city", ""),
            "state": data_dict.get("state", ""),
            "pin_code": data_dict.get("pin_code", ""),
            "institute_logo_url": data_dict.get("institute_logo_url", ""),
            "teacher_signature_url": data_dict.get("teacher_signature_url", ""),
        }
        await self.save_settings(settings_to_save)
        await self.db.flush()
        return user

