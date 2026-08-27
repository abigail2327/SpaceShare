from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

class Command(BaseCommand):
    help = "Create a superuser from environment variables if one doesn't exist"

    def handle(self, *args, **options):
        User = get_user_model()
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')

        if not email or not password:
            self.stdout.write('Skipping: DJANGO_SUPERUSER_EMAIL or DJANGO_SUPERUSER_PASSWORD not set')
            return

        if User.objects.filter(email=email).exists():
            self.stdout.write(f'Superuser {email} already exists, skipping')
            return

        User.objects.create_superuser(email=email, password=password)
        self.stdout.write(f'Superuser {email} created')