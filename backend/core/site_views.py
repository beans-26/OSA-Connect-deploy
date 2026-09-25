"""Service sites: GPS-registered community service locations (Admin Settings > Service Sites)."""
import datetime
import io
import re

import segno
from django.http import HttpResponse
from mongoengine.errors import NotUniqueError, ValidationError as MongoValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import ServiceSite, SystemUser

RADIUS_MIN, RADIUS_MAX, RADIUS_DEFAULT = 10, 300, 50
SITE_CODE_PATTERN = re.compile(r'^[A-Z0-9]{2,10}-[A-Z0-9]{1,6}$')


def _admin_from_request(request):
    """The admin making the request, or None.

    The app has no server-side sessions yet: the website sends the logged-in username in the
    X-OSA-User header (like the rest of the API trusts localStorage). We at least require that it
    names a real admin account, and registered_by always comes from here, never the request body.
    """
    username = (request.headers.get('X-OSA-User') or '').strip()
    if not username:
        return None
    return SystemUser.objects.filter(username__iexact=username, role='admin').first()


def _forbidden():
    return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)


def _serialize(site):
    return {
        "id": str(site.id),
        "site_code": site.site_code,
        "name": site.name,
        "description": site.description or '',
        "latitude": site.latitude,
        "longitude": site.longitude,
        "radius_m": site.radius_m,
        "accuracy_m": site.accuracy_m,
        "sample_count": site.sample_count,
        "is_active": site.is_active,
        "registered_by": site.registered_by.username if site.registered_by else None,
        "registered_at": site.registered_at.isoformat() if site.registered_at else None,
        "updated_at": site.updated_at.isoformat() if site.updated_at else None,
    }


def _suggest_code(name):
    """"Library" -> "LIB-01", "Main Gym" -> "MG-01"; bumps the number until it is free."""
    words = re.findall(r'[A-Za-z0-9]+', name.upper())
    if not words:
        prefix = 'SITE'
    elif len(words) == 1:
        prefix = words[0][:3]
    else:
        prefix = ''.join(w[0] for w in words)[:4]
    n = 1
    while ServiceSite.objects.filter(site_code=f'{prefix}-{n:02d}').first():
        n += 1
    return f'{prefix}-{n:02d}'


def _parse_location(data, errors):
    try:
        lat = float(data.get('latitude'))
        lng = float(data.get('longitude'))
    except (TypeError, ValueError):
        errors.append("Latitude and longitude are required numbers.")
        return None
    if not -90 <= lat <= 90:
        errors.append("Latitude must be between -90 and 90.")
    if not -180 <= lng <= 180:
        errors.append("Longitude must be between -180 and 180.")

    def optional_int(key):
        value = data.get(key)
        if value in (None, ''):
            return None
        try:
            return max(0, round(float(value)))
        except (TypeError, ValueError):
            errors.append(f"{key} must be a number.")
            return None

    return {
        "latitude": round(lat, 7),
        "longitude": round(lng, 7),
        "accuracy_m": optional_int('accuracy_m'),
        "sample_count": optional_int('sample_count'),
    }


def _parse_radius(value, errors):
    if value in (None, ''):
        return RADIUS_DEFAULT
    try:
        radius = int(float(value))
    except (TypeError, ValueError):
        errors.append("Radius must be a whole number of meters.")
        return None
    if not RADIUS_MIN <= radius <= RADIUS_MAX:
        errors.append(f"Radius must be between {RADIUS_MIN} and {RADIUS_MAX} meters.")
    return radius


def _bad_request(errors):
    return Response({"error": " ".join(errors)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def sites(request):
    admin = _admin_from_request(request)
    if not admin:
        return _forbidden()

    if request.method == 'GET':
        return Response([_serialize(s) for s in ServiceSite.objects.all()])

    data = request.data
    errors = []
    name = str(data.get('name') or '').strip()
    if not name:
        errors.append("Site name is required.")
    radius = _parse_radius(data.get('radius_m'), errors)
    location = _parse_location(data, errors)

    code = str(data.get('site_code') or '').strip().upper()
    if code and not SITE_CODE_PATTERN.match(code):
        errors.append("Site code must look like LIB-01 (letters/numbers, a dash, then letters/numbers).")
    if errors:
        return _bad_request(errors)
    if not code:
        code = _suggest_code(name)
    elif ServiceSite.objects.filter(site_code=code).first():
        return _bad_request([f"Site code {code} is already used by another site."])

    now = datetime.datetime.now()
    try:
        site = ServiceSite(
            site_code=code,
            name=name,
            description=str(data.get('description') or '').strip(),
            radius_m=radius,
            registered_by=admin,
            registered_at=now,
            updated_at=now,
            **location,
        ).save()
    except NotUniqueError:
        return _bad_request([f"Site code {code} is already used by another site."])
    except MongoValidationError as e:
        return _bad_request([str(e)])
    return Response(_serialize(site), status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def suggest_site_code(request):
    if not _admin_from_request(request):
        return _forbidden()
    return Response({"site_code": _suggest_code(str(request.query_params.get('name') or ''))})


def _get_site(site_id):
    try:
        return ServiceSite.objects.filter(id=site_id).first()
    except Exception:
        return None


@api_view(['PUT'])
@permission_classes([AllowAny])
def site_detail(request, site_id):
    """Edit name, description, radius and active status. The site code never changes here,
    so QR codes that are already printed keep working."""
    if not _admin_from_request(request):
        return _forbidden()
    site = _get_site(site_id)
    if not site:
        return Response({"error": "Site not found."}, status=status.HTTP_404_NOT_FOUND)

    data = request.data
    errors = []
    if 'name' in data:
        name = str(data.get('name') or '').strip()
        if not name:
            errors.append("Site name is required.")
        site.name = name
    if 'description' in data:
        site.description = str(data.get('description') or '').strip()
    if 'radius_m' in data:
        site.radius_m = _parse_radius(data.get('radius_m'), errors)
    if 'is_active' in data:
        site.is_active = data.get('is_active') in (True, 'true', 'True', 1, '1')
    if errors:
        return _bad_request(errors)

    site.updated_at = datetime.datetime.now()
    site.save()
    return Response(_serialize(site))


@api_view(['PUT'])
@permission_classes([AllowAny])
def site_location(request, site_id):
    """Replace the coordinates from a re-capture; the site code stays the same."""
    if not _admin_from_request(request):
        return _forbidden()
    site = _get_site(site_id)
    if not site:
        return Response({"error": "Site not found."}, status=status.HTTP_404_NOT_FOUND)

    errors = []
    location = _parse_location(request.data, errors)
    if errors:
        return _bad_request(errors)
    for key, value in location.items():
        setattr(site, key, value)
    site.updated_at = datetime.datetime.now()
    site.save()
    return Response(_serialize(site))


@api_view(['GET'])
@permission_classes([AllowAny])
def site_qr(request, site_id):
    """PNG QR code that encodes only the site code (never the coordinates)."""
    if not _admin_from_request(request):
        return _forbidden()
    site = _get_site(site_id)
    if not site:
        return Response({"error": "Site not found."}, status=status.HTTP_404_NOT_FOUND)

    buf = io.BytesIO()
    segno.make(site.site_code, error='h').save(buf, kind='png', scale=16, border=4)
    response = HttpResponse(buf.getvalue(), content_type='image/png')
    response['Content-Disposition'] = f'attachment; filename="{site.site_code}_qr.png"'
    return response
