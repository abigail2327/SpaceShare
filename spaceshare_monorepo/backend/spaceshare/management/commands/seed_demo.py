"""
Seeds demo users + listings so a fresh deploy (or a fresh `manage.py migrate`)
has something to look at immediately, and so front-end review has real
credentials to sign in with rather than the old "click an avatar" shortcut.

Usage: python manage.py seed_demo
Safe to re-run — skips users/listings that already exist.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from spaceshare.models import FieldTag, Listing

User = get_user_model()

DEMO_PASSWORD = "spaceshare-demo-2026"

DEMO_USERS = [
    dict(email="amina@example.com", first_name="Amina", last_name="K.",
         bio="Backend engineer, WFH since 2021.", area="JBR, Dubai", field_tag="tech"),
    dict(email="sara@example.com", first_name="Sara", last_name="M.",
         bio="Product designer + plant parent.", area="Al Barsha, Dubai", field_tag="design"),
    dict(email="yusuf@example.com", first_name="Yusuf", last_name="R.",
         bio="Finance consultant, dog dad.", area="Downtown, Dubai", field_tag="finance"),
    dict(email="lina@example.com", first_name="Lina", last_name="P.",
         bio="Freelance copywriter, new to Dubai.", area="Jumeirah, Dubai", field_tag="writing"),
]

COVER_IMAGES = {
    "tech": "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
    "design": "https://images.unsplash.com/photo-1558478551-1a378f63328e?auto=format&fit=crop&w=1200&q=80",
    "finance": "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1200&q=80",
    "mixed": "https://images.unsplash.com/photo-1531973576160-7125cd663d86?auto=format&fit=crop&w=1200&q=80",
}

DEMO_LISTINGS = [
    dict(host_email="amina@example.com", title="Quiet tech-friendly workspace in JBR",
         general_area="JBR, Dubai", exact_address="Rimal 4, Apt 1203, JBR",
         latitude=25.0805, longitude=55.1339, days_out=2, seats_total=3,
         field_tag=FieldTag.TECH, is_free=True, price=None,
         wifi_available=True, pet_friendly=True, quiet_room=True,
         house_rules="Coffee break at 11 and 3. No calls after 6pm."),
    dict(host_email="sara@example.com", title="Design studio co-work, women-only",
         general_area="Al Barsha, Dubai", exact_address="Villa 22, Al Barsha South 2",
         latitude=25.1046, longitude=55.2005, days_out=1, seats_total=2,
         field_tag=FieldTag.DESIGN, women_only=True, is_free=False, price=50,
         wifi_available=True, lunch_included=True, quiet_room=True,
         house_rules="Bring your own charger, only have one spare."),
    dict(host_email="yusuf@example.com", title="Finance-friendly desk, downtown views",
         general_area="Downtown, Dubai", exact_address="Burj Views Tower B, Unit 3401",
         latitude=25.1972, longitude=55.2744, days_out=4, seats_total=1,
         field_tag=FieldTag.FINANCE, is_free=False, price=75,
         wifi_available=True, parking_available=True, quiet_room=True,
         house_rules="Building has visitor parking, code sent once confirmed."),
    dict(host_email="sara@example.com", title="Mixed-field co-work + garden break spot",
         general_area="Al Barsha, Dubai", exact_address="Villa 22, Al Barsha South 2",
         latitude=25.1046, longitude=55.2005, days_out=6, seats_total=4,
         field_tag=FieldTag.MIXED, is_free=True, price=None,
         wifi_available=True, pet_friendly=True, kid_friendly=True, prayer_room=True,
         house_rules="Open house, all fields welcome."),
]


class Command(BaseCommand):
    help = "Seed demo users and listings for local dev / a fresh deploy."

    def handle(self, *args, **options):
        users_by_email = {}
        for data in DEMO_USERS:
            user, created = User.objects.get_or_create(
                email=data["email"],
                defaults={**{k: v for k, v in data.items() if k != "email"}, "email_verified": True},
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Created user {user.email}"))
            else:
                self.stdout.write(f"User {user.email} already exists, skipping")
            users_by_email[user.email] = user

        for data in DEMO_LISTINGS:
            host = users_by_email[data.pop("host_email")]
            days_out = data.pop("days_out")
            title = data["title"]
            if Listing.objects.filter(host=host, title=title).exists():
                self.stdout.write(f"Listing '{title}' already exists, skipping")
                continue
            Listing.objects.create(
                host=host,
                date=timezone.now().date() + timedelta(days=days_out),
                start_time="09:00",
                end_time="17:00",
                cover_image=COVER_IMAGES.get(data.get("field_tag"), COVER_IMAGES["mixed"]),
                **data,
            )
            self.stdout.write(self.style.SUCCESS(f"Created listing '{title}'"))

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. All demo accounts share the password: {DEMO_PASSWORD}"
        ))
