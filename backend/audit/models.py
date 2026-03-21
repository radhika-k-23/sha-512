from django.conf import settings
from django.db import models


class ActivityLog(models.Model):
    """Tamper-evident audit trail — immutable once created.

    Deletion is blocked entirely at the API permission level for every role.
    """
    ACTION_LOGIN    = "LOGIN"
    ACTION_UPLOAD   = "UPLOAD"
    ACTION_CHECK    = "CHECK"
    ACTION_VIEW     = "VIEW"
    ACTION_TRANSFER = "TRANSFER"
    ACTION_FAIL     = "INTEGRITY_FAIL"

    ACTION_CHOICES = [
        (ACTION_LOGIN,    "Login"),
        (ACTION_UPLOAD,   "File Upload"),
        (ACTION_CHECK,    "Hash Check"),
        (ACTION_VIEW,     "View"),
        (ACTION_TRANSFER, "Transfer"),
        (ACTION_FAIL,     "Integrity Failure"),
    ]

    user       = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="activity_logs",
    )
    action     = models.CharField(max_length=20, choices=ACTION_CHOICES)
    target     = models.CharField(max_length=255, help_text="e.g. 'evidence:42' or 'case:7'")
    timestamp  = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    details    = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Activity Log"
        verbose_name_plural = "Activity Logs"

    def __str__(self):
        user_str = self.user.get_full_name() if self.user else "System"
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {user_str} — {self.action} on {self.target}"
