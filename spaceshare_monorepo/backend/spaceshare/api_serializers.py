from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Booking, Notification, Review, Listing

User = get_user_model()


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class PublicUserSerializer(serializers.ModelSerializer):
    """Embedded summary used inside Listing.host and Booking.guest — never
    includes email/phone. See docs/API_CONTRACT.md's `listing.host` shape."""

    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "name", "average_rating", "rating_count"]

    def get_name(self, obj):
        return obj.get_full_name() or obj.email


class MeSerializer(serializers.ModelSerializer):
    """Full profile for the authenticated user's own /api/auth/me/."""

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "bio", "linkedin_url",
            "area", "field_tag", "phone", "email_verified", "average_rating", "rating_count",
        ]
        read_only_fields = ["id", "email", "email_verified", "average_rating", "rating_count"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "email", "password", "first_name", "last_name",
            "bio", "linkedin_url", "area", "field_tag",
        ]

    def validate_email(self, value):
        return value.lower()

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


# ---------------------------------------------------------------------------
# Listings
# ---------------------------------------------------------------------------

class ListingSerializer(serializers.ModelSerializer):
    """Read shape. `exact_address` / `latitude` / `longitude` are stripped
    in to_representation() unless the requester is the host or has an
    accepted/completed booking — enforced here, not left to the frontend."""

    host = PublicUserSerializer(read_only=True)
    seats_available = serializers.IntegerField(read_only=True)

    class Meta:
        model = Listing
        fields = [
            "id", "host", "title", "general_area", "exact_address",
            "latitude", "longitude", "date", "start_time", "end_time",
            "seats_total", "seats_available", "field_tag", "women_only",
            "is_free", "price", "wifi_available", "kid_friendly", "pet_friendly",
            "lunch_included", "parking_available", "quiet_room", "prayer_room",
            "house_rules", "status", "cover_image",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self._requester_is_authorized(instance):
            data.pop("exact_address", None)
            data.pop("latitude", None)
            data.pop("longitude", None)
        return data

    def _requester_is_authorized(self, listing):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        if listing.host_id == user.id:
            return True
        return listing.bookings.filter(
            guest=user, status__in=[Booking.Status.ACCEPTED, Booking.Status.COMPLETED]
        ).exists()


class ListingWriteSerializer(serializers.ModelSerializer):
    """Create/update input. `host` is never accepted from the client — the
    view sets it from request.user."""

    class Meta:
        model = Listing
        fields = [
            "title", "general_area", "exact_address", "latitude", "longitude",
            "date", "start_time", "end_time", "seats_total", "field_tag",
            "women_only", "is_free", "price", "wifi_available", "kid_friendly",
            "pet_friendly", "lunch_included", "parking_available", "quiet_room",
            "prayer_room", "house_rules", "cover_image", "status",
        ]
        extra_kwargs = {"status": {"required": False}}

    def validate(self, attrs):
        is_free = attrs.get("is_free", getattr(self.instance, "is_free", None))
        price = attrs.get("price", getattr(self.instance, "price", None))
        if is_free and price is not None:
            raise serializers.ValidationError({"price": "Free listings cannot have a price."})
        if is_free is False and price is None:
            raise serializers.ValidationError({"price": "Enter a price for a paid listing."})

        start_time = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end_time = attrs.get("end_time", getattr(self.instance, "end_time", None))
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})
        return attrs


# ---------------------------------------------------------------------------
# Bookings
# ---------------------------------------------------------------------------

class BookingListingSerializer(serializers.ModelSerializer):
    """Minimal listing info nested inside a booking — enough for the guest's
    "My bookings" list and the host's "Requests" list without a second
    round trip per booking."""

    host = PublicUserSerializer(read_only=True)

    class Meta:
        model = Listing
        fields = ["id", "title", "date", "host"]


class BookingSerializer(serializers.ModelSerializer):
    listing = BookingListingSerializer(read_only=True)
    guest = PublicUserSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = ["id", "listing", "guest", "message", "status", "booked_at", "responded_at"]


class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ["message"]


ALLOWED_BOOKING_STATUSES = {
    Booking.Status.ACCEPTED, Booking.Status.DECLINED,
    Booking.Status.CANCELLED, Booking.Status.COMPLETED,
}


class BookingStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[(s.value, s.label) for s in ALLOWED_BOOKING_STATUSES])


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["id", "booking", "reviewer", "reviewee", "rating", "comment", "direction", "created_at"]
        read_only_fields = ["id", "booking", "reviewer", "reviewee", "created_at"]


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["rating", "comment", "direction"]

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

class NotificationSerializer(serializers.ModelSerializer):
    booking_id = serializers.PrimaryKeyRelatedField(source="booking", read_only=True)
    listing_id = serializers.PrimaryKeyRelatedField(source="listing", read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "type", "booking_id", "listing_id", "read", "created_at"]
