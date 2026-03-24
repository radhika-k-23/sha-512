from django.conf import settings
from django.db import models
import hashlib
import json


class ActivityLog(models.Model):
    """Tamper-evident, immutable audit trail.

    Every model change (CREATE / UPDATE / DELETE) is automatically recorded
    via Django signals in audit/signals.py.
    Deletion is blocked at the API permission layer for every role.
    """
    # ── Legacy action codes (kept for backward compat) ─────────────────────
    ACTION_LOGIN    = "LOGIN"
    ACTION_UPLOAD   = "UPLOAD"
    ACTION_CHECK    = "CHECK"
    ACTION_VIEW     = "VIEW"
    ACTION_TRANSFER = "TRANSFER"
    ACTION_FAIL     = "INTEGRITY_FAIL"

    # ── Global signal action codes ─────────────────────────────────────────
    ACTION_CREATE   = "CREATE"
    ACTION_UPDATE   = "UPDATE"
    ACTION_DELETE   = "DELETE"

    ACTION_CHOICES = [
        (ACTION_LOGIN,    "Login"),
        (ACTION_UPLOAD,   "File Upload"),
        (ACTION_CHECK,    "Hash Check"),
        (ACTION_VIEW,     "View / Download"),
        (ACTION_TRANSFER, "Custody Transfer"),
        (ACTION_FAIL,     "Integrity Failure"),
        (ACTION_CREATE,   "Record Created"),
        (ACTION_UPDATE,   "Record Updated"),
        (ACTION_DELETE,   "Record Deleted"),
    ]

    user       = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="activity_logs",
    )
    action     = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(
        max_length=100, blank=True,
        help_text="Django model name that triggered this log entry (e.g. 'EvidenceFile')"
    )
    target     = models.CharField(max_length=255, help_text="e.g. 'evidence:42' or 'case:7'")
    timestamp  = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    details    = models.TextField(blank=True)

    # ── Cryptographic Integrity ───────────────────────────────────────────
    sha512_hash = models.CharField(
        max_length=128, blank=True, null=True,
        help_text="Current entry's SHA-512 cryptographic signature."
    )
    prev_hash   = models.CharField(
        max_length=128, blank=True, null=True,
        help_text="Previous entry's signature (Chain of Trust)."
    )

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Activity Log"
        verbose_name_plural = "Activity Logs"

    def __str__(self):
        user_str = self.user.get_full_name() if self.user else "System"
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {user_str} — {self.action} on {self.target}"

    def calculate_payload_hash(self):
        """Calculates SHA-512 hash of the log entry data and the previous hash."""
        data = {
            "prev_hash": self.prev_hash or "",
            "timestamp": self.timestamp.isoformat() if self.timestamp else "",
            "user": str(self.user.id) if self.user else "SYSTEM",
            "action": self.action,
            "model": self.model_name,
            "target": self.target,
            "details": self.details,
        }
        # Canonical JSON representation for deterministic hashing
        payload = json.dumps(data, sort_keys=True).encode("utf-8")
        return hashlib.sha512(payload).hexdigest()

    def verify_integrity(self):
        """Returns True if the stored hash matches the current data."""
        if not self.sha512_hash:
            return False
        return self.sha512_hash == self.calculate_payload_hash()
