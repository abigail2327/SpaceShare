"""
URL configuration for spaceshare_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import path

from spaceshare.views import approve_booking, cancel_listing, create_booking, create_listing, host_booking_requests, home, listing_detail, listing_index, my_bookings, my_listings, register

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', home, name='home'),
    path('login/', auth_views.LoginView.as_view(template_name='spaceshare/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='home'), name='logout'),
    path('listings/', listing_index, name='listing-list'),
    path('listings/new/', create_listing, name='listing-create'),
    path('listings/mine/', my_listings, name='listing-mine'),
    path('listings/<int:listing_id>/cancel/', cancel_listing, name='listing-cancel'),
    path('listings/<int:listing_id>/book/', create_booking, name='booking-create'),
    path('listings/<int:listing_id>/', listing_detail, name='listing-detail'),
    path('bookings/requests/', host_booking_requests, name='booking-requests'),
    path('bookings/<uuid:booking_id>/approve/', approve_booking, name='booking-approve'),
    path('bookings/mine/', my_bookings, name='booking-mine'),
    path('register/', register, name='register'),
]
