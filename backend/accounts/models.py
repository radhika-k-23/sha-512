from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    ROLE_POLICE    = "POLICE"
    ROLE_FSL       = "FSL"
    ROLE_EVIDENCE  = "EVIDENCE_ROOM"
    ROLE_JUDICIARY = "JUDICIARY"

    ROLE_CHOICES = [
        (ROLE_POLICE,    "Police"),
        (ROLE_FSL,       "Forensic Science Laboratory"),
        (ROLE_EVIDENCE,  "Evidence Room Staff"),
        (ROLE_JUDICIARY, "Judiciary"),
    ]

    role       = models.CharField(max_length=20, choices=ROLE_CHOICES)
    badge_id   = models.CharField(max_length=50, blank=True, help_text="Badge / Employee ID")
    department = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"

    # ── Role helpers ──────────────────────────────────────────────────────────
    @property
    def is_police(self):
        return self.role == self.ROLE_POLICE

    @property
    def is_fsl(self):
        return self.role == self.ROLE_FSL

    @property
    def is_evidence_room(self):
        return self.role == self.ROLE_EVIDENCE

    @property
    def is_judiciary(self):
        return self.role == self.ROLE_JUDICIARY
