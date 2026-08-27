from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import api_views

urlpatterns = [
    # Auth
    path('auth/register/', api_views.RegisterView.as_view(), name='api-register'),
    path('auth/login/', api_views.LoginView.as_view(), name='api-login'),
    path('auth/google/', api_views.GoogleLoginView.as_view(), name='api-google-login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='api-refresh'),
    path('auth/me/', api_views.MeView.as_view(), name='api-me'),

    # Listings
    path('listings/', api_views.ListingListCreateView.as_view(), name='api-listing-list'),
    path('listings/<int:pk>/', api_views.ListingDetailView.as_view(), name='api-listing-detail'),
    path('listings/<int:pk>/bookings/', api_views.BookingCreateView.as_view(), name='api-booking-create'),

    # Bookings
    path('bookings/mine/', api_views.MyBookingsView.as_view(), name='api-bookings-mine'),
    path('bookings/requests/', api_views.HostBookingRequestsView.as_view(), name='api-bookings-requests'),
    path('bookings/<uuid:pk>/', api_views.BookingUpdateView.as_view(), name='api-booking-update'),
    path('bookings/<uuid:pk>/reviews/', api_views.BookingReviewsView.as_view(), name='api-booking-reviews'),

    # Notifications
    path('notifications/', api_views.NotificationListView.as_view(), name='api-notifications'),
    path('notifications/unread-count/', api_views.NotificationUnreadCountView.as_view(), name='api-notifications-unread-count'),
    path('notifications/<int:pk>/read/', api_views.NotificationMarkReadView.as_view(), name='api-notification-read'),
    path('notifications/mark-all-read/', api_views.NotificationMarkAllReadView.as_view(), name='api-notifications-mark-all-read'),
]
