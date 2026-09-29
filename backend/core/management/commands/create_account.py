"""Create a system account (admin, staff, guard) or change its password, from the terminal.

    venv\\Scripts\\python.exe manage.py create_account admin --role admin
    venv\\Scripts\\python.exe manage.py create_account guard1 --role guard --name "Juan Guard"
    venv\\Scripts\\python.exe manage.py create_account guard1 --generate      # new random password
    venv\\Scripts\\python.exe manage.py create_account guard1 --disable       # can no longer log in
    venv\\Scripts\\python.exe manage.py create_account guard1 --enable

Writes to whatever MONGODB_URI points at (backend/.env: the live database). This is the way in when
there is no admin to use the website with, so it is deliberately not a web endpoint.
"""
import getpass
import secrets

from django.core.management.base import BaseCommand, CommandError

from core.models import SystemUser
from core.passwords import hash_password

# admin = OSA staff, staff = faculty and other school staff, guard = campus guards
ROLES = ('admin', 'staff', 'guard')


class Command(BaseCommand):
    help = 'Create a system account (admin/staff/guard) or change its password.'

    def add_arguments(self, parser):
        parser.add_argument('username')
        parser.add_argument('--role', choices=ROLES, help='Required when creating a new account.')
        parser.add_argument('--name', help='Full name shown in the app.')
        parser.add_argument('--password', help='Set this password (otherwise you are asked, hidden).')
        parser.add_argument('--generate', action='store_true', help='Set a random password and print it once.')
        parser.add_argument('--disable', action='store_true', help='Block this account from logging in.')
        parser.add_argument('--enable', action='store_true', help='Allow this account to log in again.')

    def handle(self, *args, **opts):
        username = opts['username'].strip()
        if not username:
            raise CommandError('Username is required.')
        user = SystemUser.objects.filter(username__iexact=username).first()
        creating = user is None

        if opts['disable'] or opts['enable']:
            if creating:
                raise CommandError(f'No account named "{username}".')
            user.is_active = bool(opts['enable'])
            user.save()
            self.stdout.write(self.style.SUCCESS(f'{user.username} is now {"enabled" if user.is_active else "disabled"}.'))
            return

        if creating and not opts['role']:
            raise CommandError('New account: add --role admin|staff|guard.')

        if opts['generate']:
            password = secrets.token_urlsafe(9)
        elif opts['password']:
            password = opts['password']
        else:
            password = getpass.getpass('New password: ')
            if password != getpass.getpass('Repeat password: '):
                raise CommandError('Passwords do not match.')
        if not password:
            raise CommandError('Password cannot be empty.')

        if creating:
            user = SystemUser(username=username, role=opts['role'])
        elif opts['role']:
            user.role = opts['role']
        if opts['name']:
            user.full_name = opts['name']
        elif creating:
            # Without --name, name the account after its role; the model's default ("OSA Administrator") made
            # guards' reports show up as the administrator's
            user.full_name = {'admin': 'OSA Administrator', 'staff': 'Faculty & Staff', 'guard': 'Security Guard'}[user.role]
        user.password = hash_password(password)
        user.is_active = True
        user.save()

        self.stdout.write(self.style.SUCCESS(f'{"Created" if creating else "Updated"} {user.role} account "{user.username}".'))
        if opts['generate']:
            self.stdout.write(f'Password (shown once): {password}')
