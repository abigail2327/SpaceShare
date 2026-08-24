from datetime import date, timedelta

from django.test import TestCase
from django.urls import reverse

from .forms import ListingForm
from .models import Booking, FieldTag, Listing, ListingStatus, User


class SpaceShareTestCase(TestCase):
	def create_user(self, prefix, password="strongpass123"):
		return User.objects.create_user(
			email=f"{prefix}@example.com",
			password=password,
		)

	def create_listing(self, host, **overrides):
		values = {
			"host": host,
			"title": "Quiet desk",
			"description": "A calm place to work",
			"general_area": "JBR",
			"exact_address": "42 Private Street",
			"date": date.today() + timedelta(days=2),
			"start_time": "09:00",
			"end_time": "17:00",
			"seats_total": 2,
			"field_tag": FieldTag.TECH,
			"is_free": True,
		}
		values.update(overrides)
		return Listing.objects.create(**values)


class AuthenticationTests(SpaceShareTestCase):
	def test_registration_logs_user_in(self):
		response = self.client.post(
			reverse("register"),
			{
				"email": "new@example.com",
				"first_name": "New",
				"last_name": "User",
				"password": "strongpass123",
				"password_confirmation": "strongpass123",
			},
		)

		self.assertRedirects(response, reverse("home"))
		user = User.objects.get(email="new@example.com")
		self.assertEqual(self.client.session["_auth_user_id"], str(user.pk))
		self.assertTrue(user.check_password("strongpass123"))

	def test_login_and_logout_use_email(self):
		user = self.create_user("login")

		self.assertTrue(self.client.login(username=user.email, password="strongpass123"))
		self.assertEqual(self.client.get(reverse("home")).status_code, 200)

		response = self.client.post(reverse("logout"))
		self.assertRedirects(response, reverse("home"))
		self.assertNotIn("_auth_user_id", self.client.session)

	def test_registration_rejects_mismatched_passwords(self):
		response = self.client.post(
			reverse("register"),
			{
				"email": "mismatch@example.com",
				"password": "strongpass123",
				"password_confirmation": "differentpass",
			},
		)

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, "Passwords do not match.")
		self.assertFalse(User.objects.filter(email="mismatch@example.com").exists())


class ListingTests(SpaceShareTestCase):
	def test_anonymous_user_cannot_create_listing(self):
		response = self.client.get(reverse("listing-create"))

		self.assertRedirects(
			response,
			f"{reverse('login')}?next={reverse('listing-create')}",
			fetch_redirect_response=False,
		)

	def test_host_sees_only_owned_listings(self):
		host = self.create_user("host")
		other = self.create_user("other")
		self.create_listing(host, title="My desk")
		self.create_listing(other, title="Other desk")
		self.client.force_login(host)

		response = self.client.get(reverse("listing-mine"))

		self.assertContains(response, "My desk")
		self.assertNotContains(response, "Other desk")

	def test_cancelling_listing_cancels_active_bookings(self):
		host = self.create_user("cancel-host")
		pending_guest = self.create_user("pending-guest")
		accepted_guest = self.create_user("accepted-guest")
		completed_guest = self.create_user("completed-guest")
		listing = self.create_listing(host)
		pending = Booking.objects.create(listing=listing, guest=pending_guest)
		accepted = Booking.objects.create(
			listing=listing,
			guest=accepted_guest,
			status=Booking.Status.ACCEPTED,
		)
		completed = Booking.objects.create(
			listing=listing,
			guest=completed_guest,
			status=Booking.Status.COMPLETED,
		)
		self.client.force_login(host)

		response = self.client.post(
			reverse("listing-cancel", args=[listing.pk]),
		)

		self.assertRedirects(response, reverse("listing-mine"))
		listing.refresh_from_db()
		pending.refresh_from_db()
		accepted.refresh_from_db()
		completed.refresh_from_db()
		self.assertEqual(listing.status, ListingStatus.CANCELLED)
		self.assertEqual(pending.status, Booking.Status.CANCELLED)
		self.assertEqual(accepted.status, Booking.Status.CANCELLED)
		self.assertEqual(completed.status, Booking.Status.COMPLETED)

	def test_other_user_cannot_cancel_listing(self):
		host = self.create_user("cancel-owner")
		other = self.create_user("cancel-outsider")
		listing = self.create_listing(host)
		self.client.force_login(other)

		response = self.client.post(
			reverse("listing-cancel", args=[listing.pk]),
		)

		self.assertEqual(response.status_code, 404)
		listing.refresh_from_db()
		self.assertEqual(listing.status, ListingStatus.ACTIVE)

	def test_listing_form_rejects_invalid_schedule_and_price(self):
		data = {
			"title": "Invalid listing",
			"general_area": "JBR",
			"exact_address": "Private",
			"date": date.today() - timedelta(days=1),
			"start_time": "17:00",
			"end_time": "09:00",
			"seats_total": 1,
			"field_tag": FieldTag.TECH,
			"is_free": True,
			"price": "10.00",
		}

		form = ListingForm(data=data)

		self.assertFalse(form.is_valid())
		self.assertIn("date", form.errors)
		self.assertIn("end_time", form.errors)
		self.assertIn("price", form.errors)


class DiscoveryAndBookingTests(SpaceShareTestCase):
	def test_index_shows_available_future_listings_only(self):
		host = self.create_user("index-host")
		guest = self.create_user("index-guest")
		available = self.create_listing(host, title="Available desk")
		full = self.create_listing(host, title="Full desk", seats_total=1)
		Booking.objects.create(
			listing=full,
			guest=guest,
			status=Booking.Status.ACCEPTED,
		)
		self.create_listing(
			host,
			title="Past desk",
			date=date.today() - timedelta(days=1),
		)
		self.create_listing(
			host,
			title="Cancelled desk",
			status=ListingStatus.CANCELLED,
		)

		response = self.client.get(reverse("listing-list"))

		self.assertContains(response, "Available desk")
		self.assertNotContains(response, "Full desk")
		self.assertNotContains(response, "Past desk")
		self.assertNotContains(response, "Cancelled desk")
		self.assertContains(response, reverse("listing-detail", args=[available.pk]))

	def test_detail_hides_exact_address(self):
		host = self.create_user("detail-host")
		listing = self.create_listing(host)

		response = self.client.get(reverse("listing-detail", args=[listing.pk]))

		self.assertContains(response, listing.general_area)
		self.assertNotContains(response, listing.exact_address)

	def test_guest_can_create_pending_booking(self):
		host = self.create_user("book-host")
		guest = self.create_user("book-guest")
		listing = self.create_listing(host)
		self.client.force_login(guest)

		response = self.client.post(
			reverse("booking-create", args=[listing.pk]),
			{"message": "Looking forward to working together"},
		)

		self.assertRedirects(
			response,
			reverse("listing-detail", args=[listing.pk]),
		)
		booking = Booking.objects.get(listing=listing, guest=guest)
		self.assertEqual(booking.status, Booking.Status.PENDING)
		self.assertEqual(booking.message, "Looking forward to working together")

	def test_guest_cannot_book_own_listing_or_duplicate_request(self):
		host = self.create_user("booking-host")
		guest = self.create_user("booking-guest")
		listing = self.create_listing(host)
		self.client.force_login(host)

		own_response = self.client.post(
			reverse("booking-create", args=[listing.pk]),
			{"message": "Self request"},
		)
		self.assertContains(own_response, "cannot book your own listing")

		self.client.force_login(guest)
		self.client.post(
			reverse("booking-create", args=[listing.pk]),
			{"message": "First request"},
		)
		duplicate_response = self.client.post(
			reverse("booking-create", args=[listing.pk]),
			{"message": "Second request"},
		)

		self.assertContains(
			duplicate_response,
			"already have an active booking request",
		)

	def test_listing_index_filters_by_area_and_field(self):
		host = self.create_user("filter-host")
		self.create_listing(host, title="JBR tech", general_area="JBR", field_tag=FieldTag.TECH)
		self.create_listing(host, title="DIFC design", general_area="DIFC", field_tag=FieldTag.DESIGN)

		response = self.client.get(
			reverse("listing-list"),
			{"general_area": "JBR", "field_tag": FieldTag.TECH},
		)

		self.assertContains(response, "JBR tech")
		self.assertNotContains(response, "DIFC design")

	def test_cancelled_listing_uses_unavailable_page(self):
		host = self.create_user("unavailable-host")
		listing = self.create_listing(host, status=ListingStatus.CANCELLED)

		response = self.client.get(reverse("listing-detail", args=[listing.pk]))

		self.assertEqual(response.status_code, 404)
		self.assertIn("Listing unavailable", response.content.decode())

	def test_host_sees_only_pending_requests_for_owned_listings(self):
		host = self.create_user("request-host")
		other = self.create_user("request-other")
		guest = self.create_user("request-guest")
		own_listing = self.create_listing(host, title="Own listing")
		other_listing = self.create_listing(other, title="Other listing")
		Booking.objects.create(listing=own_listing, guest=guest, message="Own request")
		Booking.objects.create(listing=other_listing, guest=guest, message="Other request")
		self.client.force_login(host)

		response = self.client.get(reverse("booking-requests"))

		self.assertContains(response, "Own listing")
		self.assertContains(response, "Own request")
		self.assertNotContains(response, "Other listing")
		self.assertNotContains(response, "Other request")

	def test_approval_requires_post_and_listing_ownership(self):
		host = self.create_user("approval-host")
		other = self.create_user("approval-other")
		guest = self.create_user("approval-guest")
		listing = self.create_listing(host)
		booking = Booking.objects.create(listing=listing, guest=guest)

		self.client.force_login(host)
		self.assertRedirects(
			self.client.get(reverse("booking-approve", args=[booking.pk])),
			reverse("booking-requests"),
		)
		self.client.force_login(other)
		self.assertEqual(
			self.client.post(reverse("booking-approve", args=[booking.pk])).status_code,
			404,
		)

	def test_host_can_approve_pending_booking(self):
		host = self.create_user("approve-host")
		guest = self.create_user("approve-guest")
		listing = self.create_listing(host)
		booking = Booking.objects.create(listing=listing, guest=guest)
		self.client.force_login(host)

		response = self.client.post(
			reverse("booking-approve", args=[booking.pk]),
		)

		self.assertRedirects(response, reverse("booking-requests"))
		booking.refresh_from_db()
		self.assertEqual(booking.status, Booking.Status.ACCEPTED)
		self.assertIsNotNone(booking.responded_at)

	def test_approval_does_not_exceed_capacity(self):
		host = self.create_user("capacity-host")
		first_guest = self.create_user("capacity-first")
		second_guest = self.create_user("capacity-second")
		listing = self.create_listing(host, seats_total=1)
		first = Booking.objects.create(listing=listing, guest=first_guest, status=Booking.Status.ACCEPTED)
		second = Booking.objects.create(listing=listing, guest=second_guest)
		self.client.force_login(host)

		self.client.post(reverse("booking-approve", args=[second.pk]))
		first.refresh_from_db()
		second.refresh_from_db()
		self.assertEqual(first.status, Booking.Status.ACCEPTED)
		self.assertEqual(second.status, Booking.Status.PENDING)

	def test_host_can_decline_pending_booking(self):
		host = self.create_user("decline-host")
		guest = self.create_user("decline-guest")
		listing = self.create_listing(host)
		booking = Booking.objects.create(listing=listing, guest=guest)
		self.client.force_login(host)

		response = self.client.post(
			reverse("booking-decline", args=[booking.pk]),
		)

		self.assertRedirects(response, reverse("booking-requests"))
		booking.refresh_from_db()
		self.assertEqual(booking.status, Booking.Status.DECLINED)
		self.assertIsNotNone(booking.responded_at)

	def test_guest_booking_history_includes_all_statuses_and_hides_unaccepted_address(self):
		host = self.create_user("history-host")
		guest = self.create_user("history-guest")
		accepted_listing = self.create_listing(
			host,
			title="Accepted history",
			exact_address="Accepted private address",
		)
		other_listing = self.create_listing(
			host,
			title="Other history",
			exact_address="Other private address",
		)
		Booking.objects.create(listing=accepted_listing, guest=guest, status=Booking.Status.ACCEPTED)
		for status in (Booking.Status.PENDING, Booking.Status.DECLINED, Booking.Status.CANCELLED, Booking.Status.COMPLETED):
			Booking.objects.create(listing=other_listing, guest=guest, status=status)
		self.client.force_login(guest)

		response = self.client.get(reverse("booking-mine"))

		body = response.content.decode()
		self.assertEqual(response.status_code, 200)
		for label in ("Accepted", "Pending", "Declined", "Cancelled", "Completed"):
			self.assertIn(label, body)
		self.assertIn("Accepted private address", body)
		self.assertNotIn("Other private address", body)

	def test_guest_can_cancel_own_booking_only_before_session(self):
		host = self.create_user("guest-cancel-host")
		guest = self.create_user("guest-cancel-user")
		listing = self.create_listing(host)
		booking = Booking.objects.create(listing=listing, guest=guest, status=Booking.Status.ACCEPTED)
		self.client.force_login(guest)

		response = self.client.post(reverse("booking-cancel", args=[booking.pk]))

		self.assertRedirects(response, reverse("booking-mine"))
		booking.refresh_from_db()
		self.assertEqual(booking.status, Booking.Status.CANCELLED)

		past_listing = self.create_listing(
			host,
			title="Past booking",
			date=date.today() - timedelta(days=1),
		)
		past_booking = Booking.objects.create(
			listing=past_listing,
			guest=guest,
			status=Booking.Status.ACCEPTED,
		)
		self.client.post(reverse("booking-cancel", args=[past_booking.pk]))
		past_booking.refresh_from_db()
		self.assertEqual(past_booking.status, Booking.Status.ACCEPTED)
