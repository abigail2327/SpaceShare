from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from .forms import ListingForm, RegistrationForm


def home(request):
	return render(request, "spaceshare/home.html")


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
