"""Password storage for students and system users (admin, staff, guard).

Passwords are stored as Django hashes (PBKDF2). Accounts created before hashing still hold the plain
password; verify_password accepts it once and the caller saves the upgraded hash.
"""
from django.contrib.auth.hashers import check_password, identify_hasher, make_password


def hash_password(raw):
    return make_password(str(raw))


def is_hashed(stored):
    try:
        identify_hasher(stored)
        return True
    except (ValueError, TypeError):
        return False


def verify_password(stored, raw):
    """(matches, needs_upgrade). An empty stored password never matches."""
    if not stored or raw is None or str(raw) == '':
        return False, False
    if is_hashed(stored):
        return check_password(str(raw), stored), False
    # Legacy plain-text password
    return str(stored) == str(raw), True


def check_and_upgrade(account, raw):
    """True when `raw` is the account's password; a legacy plain password is re-saved as a hash."""
    matches, needs_upgrade = verify_password(account.password, raw)
    if matches and needs_upgrade:
        account.password = hash_password(raw)
        account.save()
    return matches
