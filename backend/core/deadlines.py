"""Service deadline: a student has DAYS_TO_FINISH days to serve all the hours of an e-ticket. The days start
the day after approval (the ticket's created_at) and Sundays don't count. After the deadline, every day
(again not Sundays) with no service time at all adds MISSED_DAY_HOURS to the ticket, until it's completed.
Any time served that day counts as progress.

Days are Philippine calendar days. apply_missed_day_hours() runs when tickets are listed (the dashboards
poll), looks only at days that are over, and records how far it has checked on each ticket
(missed_checked_through), so a day is never counted twice.
"""
import datetime
import time

from .models import ETicket, TimeLog

DAYS_TO_FINISH = 3
MISSED_DAY_HOURS = 1
OPEN_STATUSES = ('Active', 'Ongoing')
CHECK_EVERY_S = 60  # per server process

PH = datetime.timezone(datetime.timedelta(hours=8))
_last_check = [0.0]


def counts(day):
    """Days that count toward the deadline and the penalty: Monday to Saturday."""
    return day.weekday() != 6


def ph_date(naive_utc):
    return naive_utc.replace(tzinfo=datetime.timezone.utc).astimezone(PH).date()


def _utc_midnight(day):
    """Start of a Philippine calendar day, as naive UTC (how times are stored)."""
    return datetime.datetime.combine(day, datetime.time.min, tzinfo=PH).astimezone(datetime.timezone.utc).replace(tzinfo=None)


def deadline_date(ticket):
    """The last day to finish: the DAYS_TO_FINISH-th counted day after approval."""
    day = ph_date(ticket.created_at)
    counted = 0
    while counted < DAYS_TO_FINISH:
        day += datetime.timedelta(days=1)
        if counts(day):
            counted += 1
    return day


def deadline_end(ticket):
    """End of the deadline day (midnight after it), naive UTC."""
    return _utc_midnight(deadline_date(ticket) + datetime.timedelta(days=1))


def _missed_days(ticket, first, last):
    """Counted days from first to last (inclusive) on which the student served no time."""
    served = set()
    logs = TimeLog.objects(eticket=ticket, time_in__lt=_utc_midnight(last + datetime.timedelta(days=1))).only(
        'time_in', 'time_out', 'duration_seconds')
    for log in logs:
        if not log.time_in:
            continue
        if log.time_out is None or (log.duration_seconds or 0) > 0:
            served.add(ph_date(log.time_in))
            if log.time_out:
                served.add(ph_date(log.time_out))  # a session that ran past midnight
    days = []
    day = first
    while day <= last:
        if counts(day) and day not in served:
            days.append(day)
        day += datetime.timedelta(days=1)
    return days


def apply_missed_day_hours(force=False):
    """Adds MISSED_DAY_HOURS to every open ticket for each missed day after its deadline."""
    if not force and time.monotonic() - _last_check[0] < CHECK_EVERY_S:
        return
    _last_check[0] = time.monotonic()
    yesterday = datetime.datetime.now(PH).date() - datetime.timedelta(days=1)
    for ticket in ETicket.objects(status__in=OPEN_STATUSES, created_at__ne=None).only(
            'id', 'created_at', 'missed_checked_through'):
        try:
            first = deadline_date(ticket) + datetime.timedelta(days=1)
            checked = ticket.missed_checked_through
            if checked:
                first = max(first, datetime.date.fromisoformat(checked) + datetime.timedelta(days=1))
            if first > yesterday:
                continue
            missed = _missed_days(ticket, first, yesterday)
            hours = len(missed) * MISSED_DAY_HOURS
            # Only applies if no other request checked these days meanwhile (same checked-through value)
            update = {'set__missed_checked_through': yesterday.isoformat()}
            if hours:
                update.update(inc__total_hours_required=hours, inc__remaining_hours=hours, inc__added_hours=hours,
                              push_all__missed_days=[d.isoformat() for d in missed])
            ETicket.objects(id=ticket.id, missed_checked_through=checked, status__in=OPEN_STATUSES).update_one(**update)
        except Exception as e:
            print(f"apply_missed_day_hours: ticket {ticket.id}: {e}")
