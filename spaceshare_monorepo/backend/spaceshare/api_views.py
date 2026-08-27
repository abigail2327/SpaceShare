from django.contrib.auth import get_user_model
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Count, F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .api_serializers import (
    BookingCreateSerializer,
    BookingSerializer,
    BookingStatusSerializer,
    ListingSerializer,
    ListingWriteSerializer,
    MeSerializer,
    NotificationSerializer,
    RegisterSerializer,
    ReviewCreateSerializer,
    ReviewSerializer,
)
from .models import Booking, Listing, ListingStatus, Notification, Review

User = get_user_model()


def _tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {**_tokens_for(user), "user": MeSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Identical to SimpleJWT's default except the response also carries the
    user object, so the frontend doesn't need a second round trip right
    after logging in."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = MeSerializer(self.user).data
        return data


class LoginView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        credential = request.data.get("id_token")
        if not credential:
            return Response(
                {"detail": "A Google ID token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            claims = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                audience=settings.GOOGLE_CLIENT_ID,
            )
        except (ValueError, GoogleAuthError):
            return Response(
                {"detail": "The Google credential is invalid or expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = claims.get("email", "").lower()
        if not email or claims.get("email_verified") is not True:
            return Response(
                {"detail": "Google must provide a verified email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": claims.get("given_name", ""),
                "last_name": claims.get("family_name", ""),
                "email_verified": True,
            },
        )
        if not created:
            changed_fields = []
            if not user.email_verified:
                user.email_verified = True
                changed_fields.append("email_verified")
            for field, claim in (("first_name", "given_name"), ("last_name", "family_name")):
                if not getattr(user, field) and claims.get(claim):
                    setattr(user, field, claims[claim])
                    changed_fields.append(field)
            if changed_fields:
                user.save(update_fields=changed_fields)

        return Response({**_tokens_for(user), "user": MeSerializer(user).data})


class MeView(APIView):
    def get(self, request):
        return Response(MeSerializer(request.user).data)

    def patch(self, request):
        serializer = MeSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# Listings
# ---------------------------------------------------------------------------

class ListingListCreateView(generics.ListCreateAPIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        return ListingWriteSerializer if self.request.method == "POST" else ListingSerializer

    def get_serializer_context(self):
        return {"request": self.request}

    def get_queryset(self):
        params = self.request.query_params
        qs = Listing.objects.select_related("host").annotate(
            accepted_count=Count("bookings", filter=Q(bookings__status=Booking.Status.ACCEPTED))
        )

        host_id = params.get("host")
        if host_id:
            # "My listings" — show everything for that host, not just what's
            # currently publicly bookable.
            return qs.filter(host_id=host_id)

        qs = qs.filter(status=ListingStatus.ACTIVE, date__gte=timezone.now().date()).filter(
            accepted_count__lt=F("seats_total")
        )

        area = params.get("area", "").strip()
        field_tag = params.get("field_tag", "").strip()
        date = params.get("date", "").strip()
        price = params.get("price", "").strip()
        women_only = params.get("women_only", "").strip().lower()

        if area:
            qs = qs.filter(general_area__icontains=area)
        if field_tag:
            qs = qs.filter(field_tag=field_tag)
        if date:
            qs = qs.filter(date=date)
        if price == "free":
            qs = qs.filter(is_free=True)
        elif price == "paid":
            qs = qs.filter(is_free=False)
        if women_only == "true":
            qs = qs.filter(women_only=True)

        return qs

    def create(self, request, *args, **kwargs):
        write_serializer = ListingWriteSerializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        listing = write_serializer.save(host=request.user)
        return Response(
            ListingSerializer(listing, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ListingDetailView(generics.RetrieveUpdateAPIView):
    queryset = Listing.objects.select_related("host")

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_serializer_context(self):
        return {"request": self.request}

    def get_serializer_class(self):
        return ListingWriteSerializer if self.request.method in ("PATCH", "PUT") else ListingSerializer

    def patch(self, request, *args, **kwargs):
        listing = self.get_object()
        if listing.host_id != request.user.id:
            raise PermissionDenied("Only the host can edit this listing.")
        write_serializer = ListingWriteSerializer(listing, data=request.data, partial=True)
        write_serializer.is_valid(raise_exception=True)
        write_serializer.save()
        return Response(ListingSerializer(listing, context={"request": request}).data)


# ---------------------------------------------------------------------------
# Bookings
# ---------------------------------------------------------------------------

class BookingCreateView(APIView):
    def post(self, request, pk):
        listing = get_object_or_404(Listing.objects.select_related("host"), pk=pk)

        if listing.host_id == request.user.id:
            raise ValidationError({"detail": "You cannot book your own listing."})
        if not listing.is_bookable:
            raise ValidationError({"detail": "This listing is no longer available."})

        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                booking = serializer.save(listing=listing, guest=request.user)
                Notification.objects.create(
                    user=listing.host,
                    type=Notification.NotificationType.REQUEST_RECEIVED,
                    booking=booking,
                    listing=listing,
                )
        except IntegrityError:
            raise ValidationError({"detail": "You already have a request for this listing."})

        return Response(
            BookingSerializer(booking, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class MyBookingsView(generics.ListAPIView):
    serializer_class = BookingSerializer

    def get_queryset(self):
        return Booking.objects.filter(guest=self.request.user).select_related(
            "listing", "listing__host", "guest"
        )


class HostBookingRequestsView(generics.ListAPIView):
    serializer_class = BookingSerializer

    def get_queryset(self):
        return Booking.objects.filter(listing__host=self.request.user).select_related(
            "listing", "listing__host", "guest"
        )


class BookingUpdateView(APIView):
    def patch(self, request, pk):
        status_serializer = BookingStatusSerializer(data=request.data)
        status_serializer.is_valid(raise_exception=True)
        new_status = status_serializer.validated_data["status"]

        with transaction.atomic():
            booking = get_object_or_404(
                Booking.objects.select_for_update().select_related("listing", "listing__host", "guest"),
                pk=pk,
            )
            is_host = booking.listing.host_id == request.user.id
            is_guest = booking.guest_id == request.user.id
            if not (is_host or is_guest):
                raise PermissionDenied("Not a participant in this booking.")

            if new_status in (Booking.Status.ACCEPTED, Booking.Status.DECLINED):
                if not is_host:
                    raise PermissionDenied("Only the host can accept or decline a request.")
                if booking.status != Booking.Status.PENDING:
                    raise ValidationError({"detail": "This request has already been handled."})
                if new_status == Booking.Status.ACCEPTED:
                    listing = Listing.objects.select_for_update().get(pk=booking.listing_id)
                    if not listing.is_bookable:
                        raise ValidationError({"detail": "This listing is no longer available."})
                    if listing.seats_available <= 0:
                        raise ValidationError({"detail": "No seats are available for this listing."})

            elif new_status == Booking.Status.CANCELLED:
                if not is_guest:
                    raise PermissionDenied("Only the guest can cancel their own request.")
                if booking.status not in (Booking.Status.PENDING, Booking.Status.ACCEPTED):
                    raise ValidationError({"detail": "This booking can no longer be cancelled."})

            elif new_status == Booking.Status.COMPLETED:
                if booking.status != Booking.Status.ACCEPTED:
                    raise ValidationError({"detail": "Only an accepted booking can be marked completed."})

            booking.status = new_status
            booking.responded_at = timezone.now()
            booking.save(update_fields=["status", "responded_at"])

            if new_status in (Booking.Status.ACCEPTED, Booking.Status.DECLINED):
                Notification.objects.create(
                    user=booking.guest,
                    type=(
                        Notification.NotificationType.REQUEST_ACCEPTED
                        if new_status == Booking.Status.ACCEPTED
                        else Notification.NotificationType.REQUEST_DECLINED
                    ),
                    booking=booking,
                    listing=booking.listing,
                )

        return Response(BookingSerializer(booking, context={"request": request}).data)


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------

class BookingReviewsView(APIView):
    def _get_booking_for_participant(self, request, pk):
        booking = get_object_or_404(Booking.objects.select_related("listing", "guest"), pk=pk)
        if request.user.id not in (booking.guest_id, booking.listing.host_id):
            raise PermissionDenied("Not a participant in this booking.")
        return booking

    def get(self, request, pk):
        booking = self._get_booking_for_participant(request, pk)
        reviews = Review.objects.filter(booking=booking)
        return Response(ReviewSerializer(reviews, many=True).data)

    def post(self, request, pk):
        booking = self._get_booking_for_participant(request, pk)

        if booking.status != Booking.Status.COMPLETED:
            raise ValidationError({"detail": "You can only review a completed session."})

        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        direction = serializer.validated_data["direction"]

        if direction == Review.Direction.HOST_TO_GUEST:
            if request.user.id != booking.listing.host_id:
                raise PermissionDenied("Only the host can leave this review.")
            reviewee = booking.guest
        else:
            if request.user.id != booking.guest_id:
                raise PermissionDenied("Only the guest can leave this review.")
            reviewee = booking.listing.host

        try:
            review = serializer.save(booking=booking, reviewer=request.user, reviewee=reviewee)
        except IntegrityError:
            raise ValidationError({"detail": "You've already reviewed this booking."})

        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class NotificationUnreadCountView(APIView):
    def get(self, request):
        count = Notification.objects.filter(user=request.user, read=False).count()
        return Response({"count": count})


class NotificationMarkReadView(APIView):
    def post(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk, user=request.user)
        notification.read = True
        notification.save(update_fields=["read"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationMarkAllReadView(APIView):
    def post(self, request):
        Notification.objects.filter(user=request.user, read=False).update(read=True)
        return Response(status=status.HTTP_204_NO_CONTENT)
