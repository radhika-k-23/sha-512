from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class CustomUser(AbstractUser):
    ROLE_ADMIN     = "ADMIN"
    ROLE_POLICE    = "POLICE"
    ROLE_FSL       = "FSL"
    ROLE_EVIDENCE  = "EVIDENCE_ROOM"
    ROLE_JUDICIARY = "JUDICIARY"

    ROLE_CHOICES = [
        (ROLE_ADMIN,     "System Administrator"),
        (ROLE_POLICE,    "Police"),
        (ROLE_FSL,       "Forensic Science Laboratory"),
        (ROLE_EVIDENCE,  "Evidence Room Staff"),
        (ROLE_JUDICIARY, "Judiciary"),
    ]

    ROLE_PREFIX = {
        ROLE_ADMIN:     "ADM",
        ROLE_POLICE:    "POL",
        ROLE_FSL:       "FSL",
        ROLE_EVIDENCE:  "EVR",
        ROLE_JUDICIARY: "JUD",
    }

    role         = models.CharField(max_length=20, choices=ROLE_CHOICES)
    badge_number = models.CharField(
        max_length=30, unique=True, blank=True,
        help_text="Auto-generated: [ROLE]-[YEAR]-NNN"
    )
    department = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.get_full_name()} [{self.badge_number}] ({self.role})"

    def save(self, *args, **kwargs):
        """Auto-generate badge_number on first save if not already set."""
        if not self.badge_number and self.role:
            prefix = self.ROLE_PREFIX.get(self.role, "USR")
            year   = timezone.now().year
            # Count existing users with same role to build sequence
            count = CustomUser.objects.filter(role=self.role).count() + 1
            self.badge_number = f"{prefix}-{year}-{count:03d}"
        super().save(*args, **kwargs)

    # ── Role helpers ──────────────────────────────────────────────────────────
    @property
    def is_admin_officer(self):
        return self.role == self.ROLE_ADMIN

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
