"""
Data model for the peer-to-peer workspace marketplace.

Design notes (read before using):

1. Custom User model
   - Never build auth on top of the stock `User` model if you need extra
     required fields (LinkedIn, bio, verified email, rating). Subclass
     AbstractUser now, while it's cheap. Swapping later requires a full
     migration reset.

2. Average rating
   - Stored as a denormalized field (`average_rating`) rather than
     computed on every page load, but recalculated via a signal whenever
     a Review is saved. This keeps browse/listing pages fast (no N+1
     aggregate queries) at the cost of a tiny bit of eventual-consistency
     risk, which is fine for a hackathon/MVP.

3. Address privacy
   - Split into `general_area` (always public) and `exact_address` +
     `latitude`/`longitude` (only exposed in your API/serializer once a
     Booking is accepted). The DB stores both; privacy is enforced at the
     serializer/view layer, not the schema layer — Django models don't do
     field-level access control.

4. Amenities
   - Modeled as boolean fields directly on Listing rather than a related
     table. The amenity list in the brief is small and fixed, so a
     related model would be over-engineering for an MVP. If you expect
     the list to grow or want hosts to add custom amenities, switch to a
     many-to-many `Amenity` model (sketched at the bottom as a comment).

5. seats_available
   - Modeled as a *property*, not a stored column. Storing it as a plain
     field invites drift (two guests booking the last seat in a race
     condition, a decline that never restores the count, etc.). It's
     derived from seats_total minus accepted bookings, computed inside a
     DB transaction when a booking is accepted/declined/cancelled.

6. Reviews
   - Bookings produce up to two reviews (host→guest and guest→host), so
     Review has a FK to Booking (not a OneToOne), with a uniqueness
     constraint on (booking, direction) so each direction can only be
     submitted once.

7. Photos
   - Modeled as a separate ListingPhoto table (one-to-many) rather than a
     JSONField/array of URLs, so you get ordering, per-photo metadata,
     and easy cascade delete for free, and can enforce the 3-5 photo rule
     in a form/serializer `clean()`.
"""

import uuid

from django.conf import settings
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.contrib.auth import get_user_model
from django.utils import timezone


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class UserManager(BaseUserManager):
    """
    Required alongside USERNAME_FIELD = "email" below. Django's default
    UserManager hardcodes `username` as create_user/create_superuser's
    first positional argument regardless of USERNAME_FIELD, so
    `createsuperuser` (which passes USERNAME_FIELD + REQUIRED_FIELDS as
    kwargs) ends up calling it without a username and raises exactly the
    TypeError seen when running createsuperuser. This manager uses email
    as the identifier instead; `username` is left for User.save() to
    auto-populate, same as everywhere else in this file.
    """
 
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
 
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    """
    Custom user model. Auth is keyed on email, not username, since the
    signup flow (email -> verify -> profile) never collects one:
      - USERNAME_FIELD swapped to "email" so login/createsuperuser use it.
      - `objects` swapped to the email-keyed UserManager above — required
        alongside USERNAME_FIELD, since Django's default manager still
        expects `username` positionally otherwise.
      - `username` is kept (AbstractUser still expects the column to
        exist) but made non-required and auto-populated from email in
        save(), so its `unique=True` constraint can't collide across
        users who never set one.
    """
    objects = UserManager()
    username = models.CharField(max_length=150, unique=True, blank=True) # required by AbstractUser, set to USER
 
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []  # email is USERNAME_FIELD; no extra prompt fields

    photo = models.ImageField(upload_to="user_photos/", blank=True, null=True)
    bio = models.TextField(max_length=500, blank=True)
    linkedin_url = models.URLField(blank=True)
    field_tag = models.CharField(
        max_length=30, blank=True,
        help_text="Guest's industry/field, shown on their public profile.",
    )
    area = models.CharField(
        max_length=120, blank=True,
        help_text="User's general area, e.g. 'JBR, Dubai'. Shown on their public profile.",
    )

    # Denormalized rating summary — recalculated whenever a Review is saved
    # (see the post_save signal at the bottom of this file), same trade-off
    # as Listing.seats_available: fast reads, tiny eventual-consistency risk.
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    rating_count = models.PositiveIntegerField(default=0)

    # Format-validated only, NOT identity-verified — SMS/call verification
    # costs money and is skipped for MVP. phone_verified exists (unwired)
    # so the UI can show an honest "unverified" label rather than implying
    # trust that doesn't exist, and so a later verification flow (e.g.
    # Twilio Verify) doesn't need a schema migration to land.
    # Visibility is gated the same way as Listing.exact_address: never on
    # public profiles, only exposed to the other party once a Booking is
    # ACCEPTED, enforced at the serializer/view layer
    phone = models.CharField(
        max_length=20, blank=True,
        validators=[RegexValidator(
            regex=r"^\+?[1-9]\d{7,14}$",
            message="Enter a valid phone number, e.g. +971501234567.",
        )],
        help_text="Optional. Not verified for MVP — shown as unverified to the other party.",
    )
    phone_verified = models.BooleanField(default=False)

    email = models.EmailField(unique=True)
    email_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.username:
            # Never shown to the user; just satisfies the inherited
            # unique=True column without colliding.
            self.username = uuid.uuid4().hex[:30]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.get_full_name() or self.email


# ---------------------------------------------------------------------------
# Listings
# ---------------------------------------------------------------------------

class FieldTag(models.TextChoices):
    """
    Aligned to the frontend's fixed set (see docs/API_CONTRACT.md on the
    React side) rather than Django's original tech/design/mechanical/general
    — one contract, no translation layer needed between the two.
    """
    TECH = "tech", "Tech"
    DESIGN = "design", "Design"
    MARKETING = "marketing", "Marketing"
    FINANCE = "finance", "Finance"
    WRITING = "writing", "Writing"
    MIXED = "mixed", "Mixed / general"

class ListingStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    CANCELLED = "cancelled", "Cancelled"

class Listing(models.Model):
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="listings",
    )

    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)

    # --- Location / privacy -------------------------------------------------
    general_area = models.CharField(
        max_length=120,
        help_text="Public-facing approximate area, e.g. 'JBR, Dubai'.",
    )
    exact_address = models.CharField(
        max_length=255,
        help_text="Only surfaced to guests with an ACCEPTED booking.",
    )
    location_url = models.URLField(
        blank=True,
        help_text="Optional link to Google Maps or similar.",
    )
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        help_text="Same privacy gating as exact_address.",
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        help_text="Same privacy gating as exact_address.",
    )
    cover_image = models.URLField(
        blank=True,
        help_text="Stock or uploaded cover photo URL shown on browse/detail. "
                   "Separate from ListingPhoto, which is for multi-photo galleries.",
    )

    # --- Schedule -------------------------------------------------------------
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    # --- Capacity ---------------------------------------------------------
    seats_total = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1)]
    )

    # --- Classification -----------------------------------------------------
    field_tag = models.CharField(max_length=20, choices=FieldTag.choices)
    women_only = models.BooleanField(
        default=False,
        help_text="If True, listing is restricted to female guests only." # The restriction will not be implemented in code, but only in the UI. Guests will be informed that they are not eligible to book this listing if they are male.
    )

    # --- Pricing --------------------------------------------------------------
    is_free = models.BooleanField(default=False)
    price = models.DecimalField(
        max_digits=8, decimal_places=2, blank=True, null=True,
        help_text="Null/blank when is_free=True.",
    )

    # --- Amenities (fixed small set -> plain booleans; see docstring) -------
    kid_friendly = models.BooleanField(default=False)
    pet_friendly = models.BooleanField(default=False)
    lunch_included = models.BooleanField(default=False)
    wifi_available = models.BooleanField(default=False)
    wifi_speed_mbps = models.PositiveIntegerField(blank=True, null=True)
    parking_available = models.BooleanField(default=False)
    quiet_room = models.BooleanField(default=False)
    prayer_room = models.BooleanField(default=False)

    house_rules = models.TextField(blank=True)

    status = models.CharField(
        max_length=20, choices=ListingStatus.choices,
        default=ListingStatus.ACTIVE,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-start_time"]
        indexes = [
            models.Index(fields=["date", "status"]),
            models.Index(fields=["field_tag"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(is_free=True, price__isnull=True)
                | models.Q(is_free=False, price__isnull=False),
                name="price_matches_is_free",
            ),
            models.CheckConstraint(
                condition=models.Q(end_time__gt=models.F("start_time")),
                name="end_time_after_start_time",
            ),
        ]

    def __str__(self):
        return f"{self.title} ({self.date})"

    @property
    def seats_available(self) -> int:
        """Derived, not stored — see module docstring point 5."""
        accepted = self.bookings.filter(status=Booking.Status.ACCEPTED).count()
        return max(self.seats_total - accepted, 0)

    @property
    def is_full(self) -> bool:
        return self.seats_available <= 0

    @property
    def is_past(self) -> bool:
        return self.date < timezone.now().date()
 
    @property
    def is_bookable(self) -> bool:
        """What FULL/COMPLETED status used to represent, derived instead."""
        return (
            self.status == ListingStatus.ACTIVE
            and not self.is_past
            and not self.is_full
        )


class ListingPhoto(models.Model):
    listing = models.ForeignKey(
        Listing, on_delete=models.CASCADE, related_name="photos"
    )
    image = models.ImageField(upload_to="listing_photos/")
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order"]


# ---------------------------------------------------------------------------
# Bookings
# ---------------------------------------------------------------------------

class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    listing = models.ForeignKey(
        Listing, on_delete=models.CASCADE, related_name="bookings"
    )
    guest = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="bookings_made",
    )

    message = models.TextField(
        blank=True, help_text="Optional note guest sends with the request."
    )

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )

    booked_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-booked_at"]
        constraints = [
            # A guest can't spam multiple concurrent requests on the same listing.
            models.UniqueConstraint(
                fields=["listing", "guest"],
                condition=models.Q(status__in=["pending", "accepted"]),
                name="unique_active_booking_per_guest_per_listing",
            ),
            models.CheckConstraint(
                condition=models.Q(responded_at__isnull=True)
                | models.Q(responded_at__gte=models.F("booked_at")),
                name="responded_after_booked",
            ),
        ]

    def __str__(self):
        return f"{self.guest} -> {self.listing} ({self.status})"

    def accept(self):
        """Wrap capacity check + status change in a transaction at the
        service/view layer — not shown here since it needs select_for_update
        to avoid a race between two simultaneous accepts."""
        self.status = self.Status.ACCEPTED
        self.responded_at = timezone.now()
        self.save(update_fields=["status", "responded_at"])


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------

class Review(models.Model):
    class Direction(models.TextChoices):
        HOST_TO_GUEST = "host_to_guest", "Host to guest"
        GUEST_TO_HOST = "guest_to_host", "Guest to host"

    booking = models.ForeignKey(
        Booking, on_delete=models.CASCADE, related_name="reviews"
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews_given"
    )
    reviewee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews_received"
    )
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    comment = models.TextField(blank=True)
    direction = models.CharField(max_length=20, choices=Direction.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            # One review per direction per booking — a booking produces at
            # most a host->guest review and a guest->host review, never two
            # of the same direction.
            models.UniqueConstraint(
                fields=["booking", "direction"], name="one_review_per_direction_per_booking"
            ),
            models.CheckConstraint(
                condition=models.Q(rating__gte=1) & models.Q(rating__lte=5),
                name="rating_between_1_and_5",
            ),
        ]

    def __str__(self):
        return f"{self.reviewer} -> {self.reviewee} ({self.rating}/5)"


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

class Notification(models.Model):
    class NotificationType(models.TextChoices):
        REQUEST_RECEIVED = "request_received", "Request received"
        REQUEST_ACCEPTED = "request_accepted", "Request accepted"
        REQUEST_DECLINED = "request_declined", "Request declined"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications",
        help_text="Recipient.",
    )
    type = models.CharField(max_length=30, choices=NotificationType.choices)
    booking = models.ForeignKey(
        Booking, on_delete=models.CASCADE, related_name="notifications",
        null=True, blank=True,
    )
    listing = models.ForeignKey(
        Listing, on_delete=models.CASCADE, related_name="notifications",
        null=True, blank=True,
    )
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "read"])]

    def __str__(self):
        return f"{self.type} -> {self.user}"


# ---------------------------------------------------------------------------
# Rating recalculation
#
# Kept as a signal (rather than inline in the review-creation view) because
# it's a pure function of "a Review was saved" with no other side effects
# (no notification, no email) — a good fit for a signal, unlike the booking
# status transitions above, which have request-specific side effects and are
# handled explicitly in the view instead.
# ---------------------------------------------------------------------------

from django.db.models import Avg, Count
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=Review)
def recalculate_reviewee_rating(sender, instance, **kwargs):
    stats = Review.objects.filter(reviewee=instance.reviewee).aggregate(
        avg=Avg("rating"), count=Count("id")
    )
    # .update() on a queryset, not instance.save() — avoids recursing back
    # into this signal and avoids clobbering other concurrent field changes.
    User = get_user_model()
    User.objects.filter(pk=instance.reviewee_id).update(
        average_rating=stats["avg"], rating_count=stats["count"]
    )


# ---------------------------------------------------------------------------
# Optional future extension: replace the boolean-flag amenities with a
# proper many-to-many if the amenity list needs to grow past a fixed set.
# ---------------------------------------------------------------------------
#
# class Amenity(models.Model):
#     name = models.CharField(max_length=50, unique=True)
#     icon = models.CharField(max_length=50, blank=True)
#
# class Listing(models.Model):
#     ...
#     amenities = models.ManyToManyField(Amenity, blank=True, related_name="listings")