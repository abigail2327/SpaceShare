from django import forms
from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import Booking, Listing


class ListingForm(forms.ModelForm):
    class Meta:
        model = Listing
        fields = [
            "title",
            "description",
            "general_area",
            "exact_address",
            "location_url",
            "date",
            "start_time",
            "end_time",
            "seats_total",
            "field_tag",
            "women_only",
            "is_free",
            "price",
            "kid_friendly",
            "pet_friendly",
            "lunch_included",
            "wifi_available",
            "wifi_speed_mbps",
            "parking_available",
            "quiet_room",
            "house_rules",
        ]
        widgets = {
            "date": forms.DateInput(attrs={"type": "date"}),
            "start_time": forms.TimeInput(attrs={"type": "time"}),
            "end_time": forms.TimeInput(attrs={"type": "time"}),
            "description": forms.Textarea(attrs={"rows": 4}),
            "house_rules": forms.Textarea(attrs={"rows": 4}),
        }

    def clean(self):
        cleaned_data = super().clean()
        is_free = cleaned_data.get("is_free")
        price = cleaned_data.get("price")
        date = cleaned_data.get("date")
        start_time = cleaned_data.get("start_time")
        end_time = cleaned_data.get("end_time")

        if is_free and price is not None:
            self.add_error("price", "Free listings cannot have a price.")
        elif not is_free and price is None:
            self.add_error("price", "Enter a price for a paid listing.")
        elif price is not None and price < 0:
            self.add_error("price", "Price cannot be negative.")

        if date and date < timezone.now().date():
            self.add_error("date", "The session date cannot be in the past.")

        if start_time and end_time and end_time <= start_time:
            self.add_error("end_time", "End time must be after start time.")

        return cleaned_data


class BookingForm(forms.ModelForm):
    class Meta:
        model = Booking
        fields = ["message"]
        widgets = {
            "message": forms.Textarea(
                attrs={
                    "rows": 4,
                    "placeholder": "Optional note to the host",
                }
            ),
        }

    def __init__(self, *args, listing=None, guest=None, **kwargs):
        self.listing = listing
        self.guest = guest
        super().__init__(*args, **kwargs)

    def clean(self):
        cleaned_data = super().clean()

        if self.listing is None or self.guest is None:
            raise ValidationError("A listing and guest are required.")

        if self.listing.host_id == self.guest.pk:
            raise ValidationError("You cannot book your own listing.")

        if not self.listing.is_bookable:
            raise ValidationError("This listing is no longer available to book.")

        if self.listing.bookings.filter(
            guest=self.guest,
            status__in=[Booking.Status.PENDING, Booking.Status.ACCEPTED],
        ).exists():
            raise ValidationError("You already have an active booking request for this listing.")

        return cleaned_data
