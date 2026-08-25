from django.contrib.auth import views as auth_views
from django.urls import path

from .views import (
    approve_booking,
    cancel_booking,
    cancel_listing,
    create_booking,
    create_listing,
    decline_booking,
    host_booking_requests,
    home,
    listing_detail,
    listing_index,
    my_bookings,
    my_listings,
    register,
)

urlpatterns = [
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
    path('bookings/<uuid:booking_id>/decline/', decline_booking, name='booking-decline'),
    path('bookings/<uuid:booking_id>/cancel/', cancel_booking, name='booking-cancel'),
    path('bookings/mine/', my_bookings, name='booking-mine'),
    path('register/', register, name='register'),
]
