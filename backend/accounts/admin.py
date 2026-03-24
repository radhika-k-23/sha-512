from django.contrib import admin
from accounts.models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display   = ['username', 'get_full_name', 'role', 'badge_number', 'department', 'is_active']
    list_filter    = ['role', 'is_active']
    search_fields  = ['username', 'first_name', 'last_name', 'badge_number']
    ordering       = ['role', 'last_name']
