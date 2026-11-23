"""Emails sent to students: verification codes and violation notices.

Written to look like what they are (a school office writing to a student), which is what keeps them
out of spam folders: a greeting by name, why the student got the email, what to do if it wasn't them,
who sent it, and both a plain-text and a simple HTML version. No images, no tracking, one link to the
site itself.
"""
import datetime
import os
from html import escape

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

OFFICE = 'Office of Student Affairs, University of Science and Technology of Southern Philippines (USTP)'
SITE_URL = 'https://osaconnect.vercel.app'
PH_TZ = datetime.timezone(datetime.timedelta(hours=8))  # Philippine time, no daylight saving

_CODE_PURPOSES = {
    'register': {
        'subject': 'Your OSAConnect verification code',
        'why': 'You are creating an OSAConnect account (the student portal of the USTP Office of Student Affairs). '
               'Enter this code on the registration page to confirm this is your email address.',
    },
    'reset': {
        'subject': 'Your OSAConnect password reset code',
        'why': 'Someone asked to reset the password of your OSAConnect account. '
               'Enter this code on the Forgot Password page to choose a new password.',
    },
    'email_change': {
        'subject': 'Confirm your new email for OSAConnect',
        'why': 'You asked to use this email address for your OSAConnect account. '
               'Enter this code in your Profile Settings to confirm it.',
    },
    'faculty_signup': {
        'subject': 'Your OSAConnect faculty sign-up code',
        'why': 'You are creating an OSAConnect faculty & staff account to file student violation reports. '
               'Enter this code on the sign-up page to confirm this is your USTP email.',
    },
    'faculty': {
        'subject': 'Your OSAConnect report confirmation code',
        'why': 'You are filing a student violation report on OSAConnect as USTP faculty or staff. '
               'Enter this code on the report page to confirm this is your USTP email.',
    },
}


def _first_name(name):
    name = (name or '').strip()
    return name.split()[0].title() if name else 'there'


def app_url(path=''):
    """A link into the website: FRONTEND_URL if set, this computer's dev site while DEBUG, else the live site."""
    base = os.getenv('FRONTEND_URL') or ('http://localhost:5173' if settings.DEBUG else SITE_URL)
    return base.rstrip('/') + path


def _button_html(button):
    label, url = button
    return (f'<p style="margin:8px 0 18px;"><a href="{escape(url)}" style="display:inline-block;background:#1E3A8A;'
            f'color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px;">{escape(label)}</a></p>'
            f'<p style="margin:0 0 14px;font-size:13px;color:#586379;">Or open this link: <a href="{escape(url)}" '
            f'style="color:#1E3A8A;">{escape(url)}</a></p>')


def _html(title, paragraphs, highlight=None, rows=None, after=(), button=None, button_after_first=False):
    """A plain, readable HTML body: paragraphs, then a big code (`highlight`), (label, value) `rows` or a
    (label, url) `button`, then the `after` paragraphs and the office footer. button_after_first: the button
    goes under the first `after` paragraph instead (the violation emails: "Log in to see..." then the button)."""
    parts = [f'<h2 style="margin:0 0 16px;font-size:20px;color:#14213D;">{escape(title)}</h2>']
    for p in paragraphs:
        parts.append(f'<p style="margin:0 0 14px;">{escape(p)}</p>')
    if button and not button_after_first:
        parts.append(_button_html(button))
    if highlight:
        parts.append(
            f'<p style="margin:8px 0 18px;font-size:30px;font-weight:bold;letter-spacing:6px;color:#1E3A8A;">{escape(highlight)}</p>')
    if rows:
        cells = ''.join(
            f'<tr><td style="padding:6px 16px 6px 0;color:#586379;vertical-align:top;">{escape(k)}</td>'
            f'<td style="padding:6px 0;vertical-align:top;">{escape(v)}</td></tr>' for k, v in rows)
        parts.append(f'<table style="border-collapse:collapse;margin:0 0 16px;font-size:15px;">{cells}</table>')
    for i, p in enumerate(after):
        parts.append(f'<p style="margin:0 0 14px;">{escape(p)}</p>')
        if button and button_after_first and i == 0:
            parts.append(_button_html(button))
    return (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#14213D;'
        'max-width:560px;margin:0 auto;padding:24px;">'
        + ''.join(parts)
        + f'<p style="margin:24px 0 0;color:#586379;font-size:13px;">{escape(OFFICE)}<br>'
          f'<a href="{SITE_URL}" style="color:#1E3A8A;">{SITE_URL.replace("https://", "")}</a><br>'
          'This email was sent automatically. Replies to it are not read.</p>'
        '</div>'
    )


def _message(to, subject, text, html):
    message = EmailMultiAlternatives(subject=subject, body=text, from_email=settings.DEFAULT_FROM_EMAIL, to=[to])
    message.attach_alternative(html, 'text/html')
    return message


def _send(to, subject, text, html):
    _message(to, subject, text, html).send(fail_silently=False)


def send_code_email(to, code, purpose, name=None):
    """A 6-digit code for registration ('register'), password reset ('reset') or a new email ('email_change')."""
    info = _CODE_PURPOSES[purpose]
    greeting = f'Hi {_first_name(name)},'
    expiry = 'The code expires in 5 minutes.'
    not_you = "If you didn't ask for this, you can ignore this email; nothing will change."
    text = (f"{greeting}\n\n{info['why']}\n\nYour code: {code}\n\n{expiry}\n{not_you}\n\n"
            f"{OFFICE}\n{SITE_URL}\nThis email was sent automatically. Replies to it are not read.\n")
    html = _html(info['subject'], [greeting, info['why']], highlight=code, after=[f'{expiry} {not_you}'])
    _send(to, info['subject'], text, html)


def send_violation_notice(report):
    """Tells a student that a violation report was filed for them and that OSA will review it."""
    violation_notice_message(report).send(fail_silently=False)


# Gmail takes about 1.6 s to open a connection and 1.3 s per email on it (measured 2026-11-22), so one connection
# made a 50-student bulk report wait over a minute. The emails go out over up to this many connections at once.
MAX_MAIL_CONNECTIONS = 6


def send_all(messages):
    """Sends many emails, split over up to MAX_MAIL_CONNECTIONS connections working at the same time. A connection
    that fails only loses its own share (logged). Returns how many were sent."""
    from concurrent.futures import ThreadPoolExecutor
    from django.core.mail import get_connection
    if not messages:
        return 0
    lanes = min(MAX_MAIL_CONNECTIONS, len(messages))
    groups = [messages[i::lanes] for i in range(lanes)]

    def send_group(group):
        try:
            with get_connection(fail_silently=False) as connection:
                return connection.send_messages(group) or 0
        except Exception as e:
            print(f"EMAIL ERROR: {len(group)} emails not sent: {e}")
            return 0

    with ThreadPoolExecutor(max_workers=lanes) as pool:
        return sum(pool.map(send_group, groups))


def send_violation_notices(reports):
    """The same notices for many reports (the admin's bulk report), sent several at a time (send_all). Reports
    whose student has no email are skipped. Returns how many were sent."""
    return send_all([violation_notice_message(r, testing=True, approved=True)
                     for r in reports if getattr(r.student, 'email', None)])


# DEMO ONLY (2026-11-16): bulk reports are only used for testing for now, so their emails say so first and the
# student can ignore them. Remove TEST_NOTICE (and testing=True in send_violation_notices) before real use.
TEST_NOTICE = ('This is only a test, please disregard. You did nothing wrong and you don\'t need to do anything.')


def violation_notice_message(report, testing=False, approved=False):
    """The violation notice as an email, not sent yet. Guard and faculty reports: OSA will review it.
    approved=True (the admin's bulk report, approved at once): the penalty and service location assigned.
    testing=True puts TEST_NOTICE before the real notice. Both end with a "Click here to log in" button."""
    student = report.student
    caught = getattr(report, 'incident_at', None) or report.created_at  # when it happened (the report form's date and time)
    when = caught.replace(tzinfo=datetime.timezone.utc).astimezone(PH_TZ) if caught else None
    when_str = when.strftime('%B %d, %Y, %I:%M %p').replace(' 0', ' ') if when else 'Not recorded'
    subject = 'A violation report was filed for you (OSAConnect)'
    greeting = f'Hi {_first_name(student.name)},'
    if approved:
        intro = 'The Office of Student Affairs recorded a violation under your student ID and assigned the penalty below.'
        rows = [('Violation', report.violation_type or 'Not specified'),
                ('Penalty', report.punishment or 'To be determined')]
        if report.assigned_building:
            rows.append(('Service location', report.assigned_building))
        next_step = 'Log in to OSAConnect to see your e-ticket, your service location, the hours to serve and your deadline.'
    else:
        intro = ('A campus guard or staff member filed a violation report under your student ID. '
                 'The Office of Student Affairs will review it before any community service is assigned.')
        rows = [('Violation', report.violation_type or 'Not specified')]
        next_step = ('Log in to OSAConnect to follow the review. If it is approved, your e-ticket, assigned building '
                     'and required hours will appear there.')
    rows += [
        ('Date and time', when_str),
        ('Details', report.description or 'None given'),
        ('Reported by', report.reporting_guard or 'Campus personnel'),
        ('Student ID', student.student_id),
    ]
    not_you = 'If you believe this report is wrong, visit the Office of Student Affairs with your student ID.'
    # /open: the Android app if the student has it, else the website's student login (frontend pages/OpenApp.jsx)
    login = app_url('/open')
    text = (f"{greeting}\n\n{intro}\n\n" + ''.join(f"{k}: {v}\n" for k, v in rows)
            + f"\n{next_step}\nClick here to log in: {login}\n\n{not_you}\n\n" + _footer_text())
    html = _html('A violation report was filed for you', [greeting, intro], rows=rows,
                 after=[next_step, not_you], button=('Click here to log in', login), button_after_first=True)
    if testing:
        subject = '[Test only] ' + subject
        text = f"TEST ONLY: {TEST_NOTICE}\n\n" + text
        box = ('<p style="margin:0 0 18px;padding:12px 14px;border:2px solid #F59E0B;border-radius:8px;'
               f'background:#FFFBEB;color:#92400E;font-weight:bold;">Test only: {escape(TEST_NOTICE)}</p>')
        html = html.replace('<h2 ', box + '<h2 ', 1)
    return _message(student.email, subject, text, html)


def _footer_text():
    return f"{OFFICE}\n{SITE_URL}\nThis email was sent automatically. Replies to it are not read.\n"


def send_faculty_invite(to, first_name, link):
    """OSA confirmed a faculty member who reported without an account: the link to finish making one."""
    subject = 'Finish creating your OSAConnect faculty account'
    greeting = f'Hi {_first_name(first_name)},'
    intro = ('The Office of Student Affairs confirmed you as USTP faculty after the violation report you filed. '
             'You can now finish creating your OSAConnect account: your email is already filled in, you only add '
             'your details and confirm one last code.')
    after = ['The link works for 14 days. After that, you can still sign up on the faculty login page.']
    text = f"{greeting}\n\n{intro}\n\nFinish your account: {link}\n\n{after[0]}\n\n" + _footer_text()
    html = _html('Finish creating your account', [greeting, intro], button=('Finish my account', link), after=after)
    _send(to, subject, text, html)


def send_faculty_activated(to, first_name, login_link):
    """OSA confirmed a faculty account made through the sign-up page: it can log in now."""
    subject = 'Your OSAConnect faculty account is active'
    greeting = f'Hi {_first_name(first_name)},'
    intro = ('The Office of Student Affairs confirmed you as USTP faculty. Your OSAConnect account is now active: '
             'log in with your USTP email and the password you chose.')
    text = f"{greeting}\n\n{intro}\n\nLog in: {login_link}\n\n" + _footer_text()
    html = _html('Your account is active', [greeting, intro], button=('Log in', login_link))
    _send(to, subject, text, html)
