from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render

from .forms import ListingForm, RegistrationForm
from .models import Listing, ListingStatus


def home(request):
	return render(request, "spaceshare/home.html")


def listing_detail(request, listing_id):
	listing = get_object_or_404(
		Listing.objects.select_related("host"),
		pk=listing_id,
		status=ListingStatus.ACTIVE,
	)
	if listing.is_past:
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
