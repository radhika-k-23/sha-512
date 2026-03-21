from django.contrib import admin
from audit.models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display   = ['timestamp', 'user', 'action', 'target', 'ip_address']
    list_filter    = ['action']
    search_fields  = ['target', 'details']
    readonly_fields = ['user', 'action', 'target', 'timestamp', 'ip_address', 'details']

    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of audit log entries via admin."""
        return False

    def has_change_permission(self, request, obj=None):
        """Make audit log read-only in admin too."""
        return False
