"""
Unit tests for security utilities (password hashing & JWT tokens).
No database required.
"""

from src.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    """Tests for password hashing and verification."""

    def test_hash_password_returns_hash(self):
        hashed = hash_password("mysecretpass")
        assert hashed != "mysecretpass"
        assert len(hashed) > 0

    def test_verify_correct_password(self):
        hashed = hash_password("correctpassword")
        assert verify_password("correctpassword", hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("correctpassword")
        assert verify_password("wrongpassword", hashed) is False

    def test_different_hashes_for_same_password(self):
        """bcrypt should produce different hashes each time (salt)."""
        hash1 = hash_password("samepassword")
        hash2 = hash_password("samepassword")
        assert hash1 != hash2  # Different salts


class TestJWTTokens:
    """Tests for JWT token creation and decoding."""

    def test_create_and_decode_access_token(self):
        data = {"sub": "user-123", "email": "test@example.com"}
        token = create_access_token(data)
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user-123"
        assert payload["email"] == "test@example.com"
        assert payload["type"] == "access"

    def test_create_and_decode_refresh_token(self):
        data = {"sub": "user-456", "email": "refresh@example.com"}
        token = create_refresh_token(data)
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user-456"
        assert payload["type"] == "refresh"

    def test_decode_invalid_token_returns_none(self):
        result = decode_token("this.is.not.a.valid.token")
        assert result is None

    def test_access_token_has_exp_claim(self):
        token = create_access_token({"sub": "user-1"})
        payload = decode_token(token)
        assert "exp" in payload

    def test_refresh_token_has_exp_claim(self):
        token = create_refresh_token({"sub": "user-1"})
        payload = decode_token(token)
        assert "exp" in payload

    def test_token_types_are_different(self):
        data = {"sub": "user-1"}
        access = create_access_token(data)
        refresh = create_refresh_token(data)
        assert decode_token(access)["type"] == "access"
        assert decode_token(refresh)["type"] == "refresh"
