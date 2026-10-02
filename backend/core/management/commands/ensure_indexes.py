"""Creates the database indexes the app's lookups use, so lists and dashboards stay fast as years of records pile
up. Safe to run any number of times: an index that already exists is left alone. Only adds indexes; no data
changes.

    python manage.py ensure_indexes
"""
from django.core.management.base import BaseCommand
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import OperationFailure

from core.models import ViolationReport, ETicket, TimeLog, ClearanceProof

# (model, keys, why). The unique indexes (student_id, username, site_code, one ticket per violation) already exist.
INDEXES = [
    (ViolationReport, [('student', ASCENDING), ('created_at', DESCENDING)], "a student's violations; offense counts"),
    (ViolationReport, [('status', ASCENDING), ('created_at', DESCENDING)], 'pending reviews, open cases, archives'),
    (ViolationReport, [('created_at', DESCENDING)], 'reports and analytics by date'),
    (ViolationReport, [('reporting_account', ASCENDING), ('created_at', DESCENDING)], "a guard's History"),
    (ViolationReport, [('status', ASCENDING), ('cleared_at', ASCENDING)], 'clearance photo cleanup'),
    (ETicket, [('status', ASCENDING)], 'open and finished tickets'),
    (TimeLog, [('eticket', ASCENDING), ('time_in', DESCENDING)], "a ticket's sessions; served today"),
    (TimeLog, [('time_out', ASCENDING), ('tracked', ASCENDING), ('last_ping_at', ASCENDING)], 'running sessions'),
    (ClearanceProof, [('violation', ASCENDING), ('kind', ASCENDING)], "a case's clearance photos"),
]


class Command(BaseCommand):
    help = 'Create the indexes the app needs (safe to run again).'

    def handle(self, *args, **opts):
        for model, keys, why in INDEXES:
            collection = model._get_collection()
            name = '_'.join(f'{field}_{order}' for field, order in keys)
            try:
                collection.create_index(keys, name=name, background=True)
                self.stdout.write(f'ok  {collection.name}.{name}  ({why})')
            except OperationFailure as error:
                # Same keys already indexed under another name: nothing to do
                self.stdout.write(f'skip {collection.name}.{name}: {error.details.get("errmsg", error) if error.details else error}')
