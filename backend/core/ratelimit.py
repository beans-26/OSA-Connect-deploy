"""Rate limiting for the endpoints people could abuse: logins, sign-ups, email codes and password resets.

Vercel runs the API as many short-lived copies, so counts are kept in MongoDB (collection rate_limits), not in
memory. Each limit counts requests in a fixed window per key; a TTL index deletes old windows by itself.

Two kinds of key per endpoint:
- the client's internet address: generous, because a whole classroom on the school Wi-Fi shares one address
- the account or email being tried: strict, so one account can't be guessed at from many places
Too many requests get HTTP 429 with how long to wait (and a Retry-After header).
"""
import datetime
import functools
import logging
import math

from mongoengine.connection import get_db
from rest_framework import status
from rest_framework.response import Response

log = logging.getLogger(__name__)
_index_ready = False


def _collection():
    global _index_ready
    col = get_db()['rate_limits']
    if not _index_ready:
        try:
            # Each window's document is deleted by MongoDB once its reset time has passed
            col.create_index('reset_at', expireAfterSeconds=0)
        except Exception:  # an index already there, or no permission: counting still works
            pass
        _index_ready = True
    return col


def client_ip(request):
    """The caller's address. On Vercel x-real-ip / x-forwarded-for are set by the platform, not the caller."""
    meta = request.META
    ip = meta.get('HTTP_X_REAL_IP') or (meta.get('HTTP_X_FORWARDED_FOR') or '').split(',')[0] or meta.get('REMOTE_ADDR') or 'unknown'
    return ip.strip()[:64]


def hit(key, limit, window_s):
    """Counts one request for key. Returns 0 if allowed, else the seconds until the window resets."""
    now = datetime.datetime.utcnow()
    col = _collection()
    doc = col.find_one_and_update(
        {'_id': key, 'reset_at': {'$gt': now}},
        {'$inc': {'count': 1}},
        return_document=True,
    )
    if doc is None:
        # No open window: start one (a race here at worst lets one extra request through)
        reset_at = now + datetime.timedelta(seconds=window_s)
        col.replace_one({'_id': key}, {'_id': key, 'count': 1, 'reset_at': reset_at}, upsert=True)
        return 0
    if doc['count'] > limit:
        return max(1, math.ceil((doc['reset_at'] - now).total_seconds()))
    return 0


def _wait_text(seconds):
    minutes = math.ceil(seconds / 60)
    return f"{seconds} seconds" if seconds < 60 else f"{minutes} minute{'s' if minutes != 1 else ''}"


def rate_limited(name, *, per_ip=None, per_target=None, target=None):
    """Decorator for a view or a viewset action.
    per_ip / per_target: (max requests, window in seconds). target(request) -> the account or email (or '')."""
    def decorate(view):
        @functools.wraps(view)
        def wrapper(*args, **kwargs):
            request = next((a for a in args if hasattr(a, 'META')), None)
            if request is None or request.method == 'OPTIONS':
                return view(*args, **kwargs)
            try:
                checks = []
                if per_ip:
                    checks.append((f'{name}:ip:{client_ip(request)}', *per_ip))
                if per_target and target:
                    who = str(target(request) or '').strip().lower()[:200]
                    if who:
                        checks.append((f'{name}:t:{who}', *per_target))
                wait = 0
                for key, limit, window in checks:
                    wait = max(wait, hit(key, limit, window))
            except Exception:  # never lock everyone out because the counter itself failed
                log.exception('rate limit check failed')
                wait = 0
            if wait:
                response = Response(
                    {"error": f"Too many attempts. Please wait {_wait_text(wait)} and try again.", "retry_after": wait},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
                response['Retry-After'] = str(wait)
                return response
            return view(*args, **kwargs)
        return wrapper
    return decorate


def field(*names):
    """target= helper: the first of these request fields that is text (the email or username being tried)."""
    def get(request):
        data = getattr(request, 'data', None) or {}
        for n in names:
            value = data.get(n) if hasattr(data, 'get') else None
            if isinstance(value, str) and value.strip():
                return value
        return ''
    return get
