from django.contrib.auth import login
from django.shortcuts import redirect, render

from .forms import RegistrationForm


def home(request):
	return render(request, "spaceshare/home.html")


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
