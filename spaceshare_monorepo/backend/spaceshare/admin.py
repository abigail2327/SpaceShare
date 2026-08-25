from django.contrib import admin

# Register your models here.
from .models import User, Listing, Booking, Review, Notification

admin.site.register(User)
admin.site.register(Listing)
admin.site.register(Booking)
admin.site.register(Review)
admin.site.register(Notification)