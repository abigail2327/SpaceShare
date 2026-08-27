from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Count, Q, F
from django.contrib import messages
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from .forms import BookingForm, ListingForm, RegistrationForm
from .models import Booking, Listing, ListingStatus

from dj_rest_auth.registration.views import SocialLoginView
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client

class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client
    callback_url = "http://localhost:5173"  # your Vercel URL in prod

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
def create_booking(request, listing_id):
	listing = get_object_or_404(
		Listing.objects.select_related("host"),
		pk=listing_id,
		status=ListingStatus.ACTIVE,
	)

	if request.method == "POST":
		form = BookingForm(request.POST, listing=listing, guest=request.user)
		if form.is_valid():
			booking = form.save(commit=False)
			booking.listing = listing
			booking.guest = request.user
			booking.save()
			return redirect("listing-detail", listing_id=listing.pk)
	else:
		form = BookingForm(listing=listing, guest=request.user)

	return render(
		request,
		"spaceshare/booking_form.html",
		{"form": form, "listing": listing},
	)


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
def host_booking_requests(request):
	bookings = Booking.objects.filter(
		listing__host=request.user,
		status=Booking.Status.PENDING,
	).select_related("listing", "guest")
	return render(request, "spaceshare/booking_requests.html", {"bookings": bookings})


@login_required
def approve_booking(request, booking_id):
	if request.method != "POST":
		return redirect("booking-requests")

	with transaction.atomic():
		booking = get_object_or_404(
			Booking.objects.select_for_update().select_related("listing"),
			pk=booking_id,
			listing__host=request.user,
		)
		listing = Listing.objects.select_for_update().get(pk=booking.listing_id)

		if booking.status != Booking.Status.PENDING:
			messages.error(request, "This booking request has already been handled.")
		elif not listing.is_bookable:
			messages.error(request, "This listing is no longer available.")
		elif listing.seats_available <= 0:
			messages.error(request, "There are no seats available for this listing.")
		else:
			booking.status = Booking.Status.ACCEPTED
			booking.responded_at = timezone.now()
			booking.save(update_fields=["status", "responded_at"])

	return redirect("booking-requests")


@login_required
def decline_booking(request, booking_id):
	if request.method != "POST":
		return redirect("booking-requests")

	with transaction.atomic():
		booking = get_object_or_404(
			Booking.objects.select_for_update(),
			pk=booking_id,
			listing__host=request.user,
			status=Booking.Status.PENDING,
		)
		booking.status = Booking.Status.DECLINED
		booking.responded_at = timezone.now()
		booking.save(update_fields=["status", "responded_at"])

	return redirect("booking-requests")


@login_required
def my_bookings(request):
	bookings = Booking.objects.filter(
		guest=request.user,
	).select_related("listing", "listing__host")
	return render(request, "spaceshare/my_bookings.html", {"bookings": bookings})


@login_required
def cancel_booking(request, booking_id):
	if request.method != "POST":
		return redirect("booking-mine")

	with transaction.atomic():
		booking = get_object_or_404(
			Booking.objects.select_for_update().select_related("listing"),
			pk=booking_id,
			guest=request.user,
			status__in=[Booking.Status.PENDING, Booking.Status.ACCEPTED],
		)
		if booking.listing.date < timezone.now().date():
			messages.error(request, "Past bookings cannot be cancelled.")
		else:
			booking.status = Booking.Status.CANCELLED
			booking.responded_at = timezone.now()
			booking.save(update_fields=["status", "responded_at"])

	return redirect("booking-mine")


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
