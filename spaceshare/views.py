from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Count, Q, F
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from .forms import ListingForm, RegistrationForm
from .models import Booking, Listing, ListingStatus


def home(request):
	return render(request, "spaceshare/home.html")


def listing_index(request):
	listings = Listing.objects.filter(
		status=ListingStatus.ACTIVE,
		date__gte=timezone.now().date(),
	).annotate(
		accepted_booking_count=Count(
			"bookings",
			filter=Q(bookings__status=Booking.Status.ACCEPTED),
		),
	).filter(
		accepted_booking_count__lt=F("seats_total"),
	).select_related("host")

	area = request.GET.get("general_area", "").strip()
	field_tag = request.GET.get("field_tag", "").strip()
	if area:
		listings = listings.filter(general_area__icontains=area)
	if field_tag:
		listings = listings.filter(field_tag=field_tag)

	return render(
		request,
		"spaceshare/listing_list.html",
		{
			"listings": listings,
			"area": area,
			"field_tag": field_tag,
			"field_choices": Listing._meta.get_field("field_tag").choices,
		},
	)


def listing_detail(request, listing_id):
	listing = get_object_or_404(
		Listing.objects.select_related("host"),
		pk=listing_id,
	)
	if listing.status != ListingStatus.ACTIVE or listing.is_past:
		return render(request, "spaceshare/listing_unavailable.html", status=404)

	return render(request, "spaceshare/listing_detail.html", {"listing": listing})


@login_required
def create_listing(request):
	if request.method == "POST":
		form = ListingForm(request.POST)
		if form.is_valid():
			listing = form.save(commit=False)
			listing.host = request.user
			listing.save()
			return redirect("home")
	else:
		form = ListingForm()

	return render(request, "spaceshare/listing_form.html", {"form": form})


@login_required
def my_listings(request):
	listings = request.user.listings.all()
	return render(request, "spaceshare/my_listings.html", {"listings": listings})


@login_required
def cancel_listing(request, listing_id):
	if request.method != "POST":
		return redirect("listing-mine")

	with transaction.atomic():
		listing = get_object_or_404(
			request.user.listings.select_for_update(),
			pk=listing_id,
		)
		listing.status = ListingStatus.CANCELLED
		listing.save(update_fields=["status", "updated_at"])
		listing.bookings.filter(
			status__in=[Booking.Status.PENDING, Booking.Status.ACCEPTED]
		).update(status=Booking.Status.CANCELLED, responded_at=timezone.now())

	return redirect("listing-mine")


def register(request):
	if request.method == "POST":
		form = RegistrationForm(request.POST)
		if form.is_valid():
			user = form.save()
			login(request, user)
			return redirect("home")  # Redirect to the home page after successful registration
	else:
		form = RegistrationForm()

	return render(request, "spaceshare/register.html", {"form": form})
