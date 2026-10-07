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


def _html(title, paragraphs, highlight=None, rows=None, after=(), button=None):
    """A plain, readable HTML body: paragraphs, then a big code (`highlight`), (label, value) `rows` or a
    (label, url) `button`, then the `after` paragraphs and the office footer."""
    parts = [f'<h2 style="margin:0 0 16px;font-size:20px;color:#14213D;">{escape(title)}</h2>']
    for p in paragraphs:
        parts.append(f'<p style="margin:0 0 14px;">{escape(p)}</p>')
    if button:
        label, url = button
        parts.append(f'<p style="margin:8px 0 18px;"><a href="{escape(url)}" style="display:inline-block;background:#1E3A8A;'
                     f'color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px;">{escape(label)}</a></p>'
                     f'<p style="margin:0 0 14px;font-size:13px;color:#586379;">Or open this link: {escape(url)}</p>')
    if highlight:
        parts.append(
            f'<p style="margin:8px 0 18px;font-size:30px;font-weight:bold;letter-spacing:6px;color:#1E3A8A;">{escape(highlight)}</p>')
    if rows:
        cells = ''.join(
            f'<tr><td style="padding:6px 16px 6px 0;color:#586379;vertical-align:top;">{escape(k)}</td>'
            f'<td style="padding:6px 0;vertical-align:top;">{escape(v)}</td></tr>' for k, v in rows)
        parts.append(f'<table style="border-collapse:collapse;margin:0 0 16px;font-size:15px;">{cells}</table>')
    for p in after:
        parts.append(f'<p style="margin:0 0 14px;">{escape(p)}</p>')
    return (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#14213D;'
        'max-width:560px;margin:0 auto;padding:24px;">'
        + ''.join(parts)
        + f'<p style="margin:24px 0 0;color:#586379;font-size:13px;">{escape(OFFICE)}<br>'
          f'<a href="{SITE_URL}" style="color:#1E3A8A;">{SITE_URL.replace("https://", "")}</a><br>'
          'This email was sent automatically. Replies to it are not read.</p>'
        '</div>'
    )


def _send(to, subject, text, html):
    message = EmailMultiAlternatives(subject=subject, body=text, from_email=settings.DEFAULT_FROM_EMAIL, to=[to])
    message.attach_alternative(html, 'text/html')
    message.send(fail_silently=False)


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
    student = report.student
    when = report.created_at.replace(tzinfo=datetime.timezone.utc).astimezone(PH_TZ) if report.created_at else None
    when_str = when.strftime('%B %d, %Y, %I:%M %p').replace(' 0', ' ') if when else 'Not recorded'
    subject = 'A violation report was filed for you (OSAConnect)'
    greeting = f'Hi {_first_name(student.name)},'
    intro = ('A campus guard or staff member filed a violation report under your student ID. '
             'The Office of Student Affairs will review it before any community service is assigned.')
    rows = [
        ('Violation', report.violation_type or 'Not specified'),
        ('Date and time', when_str),
        ('Details', report.description or 'None given'),
        ('Reported by', report.reporting_guard or 'Campus personnel'),
        ('Student ID', student.student_id),
    ]
    next_step = ('Log in to OSAConnect to follow the review. If it is approved, your e-ticket, assigned building '
                 'and required hours will appear there.')
    not_you = 'If you believe this report is wrong, visit the Office of Student Affairs with your student ID.'
    text = (f"{greeting}\n\n{intro}\n\n" + ''.join(f"{k}: {v}\n" for k, v in rows)
            + f"\n{next_step}\n{not_you}\n\n{OFFICE}\n{SITE_URL}\nThis email was sent automatically. Replies to it are not read.\n")
    html = _html('A violation report was filed for you', [greeting, intro], rows=rows, after=[next_step, not_you])
    _send(student.email, subject, text, html)


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
