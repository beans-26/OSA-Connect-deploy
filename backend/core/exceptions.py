"""API error handling: a request body over Django's size limit (DATA_UPLOAD_MAX_MEMORY_SIZE, 2.5 MB) answers
413 with a short message instead of crashing with a 500."""
from django.core.exceptions import RequestDataTooBig
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    if isinstance(exc, RequestDataTooBig):
        return Response({"error": "This request is too large."}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
    return drf_exception_handler(exc, context)
