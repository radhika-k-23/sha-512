from django.db import models
from django.conf import settings


class Case(models.Model):
    STATUS_OPEN       = "OPEN"
    STATUS_UNDER_INVESTIGATION = "UNDER_INVESTIGATION"
    STATUS_CLOSED     = "CLOSED"

    STATUS_CHOICES = [
        (STATUS_OPEN,                "Open"),
        (STATUS_UNDER_INVESTIGATION, "Under Investigation"),
        (STATUS_CLOSED,              "Closed"),
    ]

    title       = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    fir_number  = models.CharField(max_length=100, unique=True, help_text="First Information Report number")
    status      = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_OPEN)
    created_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="cases_created",
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.fir_number}] {self.title}"


class Suspect(models.Model):
    case        = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="suspects")
    name        = models.CharField(max_length=255)
    national_id = models.CharField(max_length=50, blank=True)
    details     = models.TextField(blank=True)
    added_by    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="suspects_added",
    )
    added_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (Case: {self.case.fir_number})"
