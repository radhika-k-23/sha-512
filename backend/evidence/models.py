from django.db import models
from django.conf import settings
from cases.models import Case


class EvidenceFile(models.Model):
    CATEGORY_CHOICES = [
        ("DIGITAL",    "Digital Media"),
        ("DOCUMENT",   "Document"),
        ("BIOLOGICAL", "Biological"),
        ("PHYSICAL",   "Physical Object"),
        ("OTHER",      "Other"),
    ]

    CUSTODY_CHOICES = [
        ("FSL",           "With FSL"),
        ("IN_TRANSIT",    "In Transit"),
        ("EVIDENCE_ROOM", "Evidence Room"),
        ("POLICE",        "Police Custody"),
    ]

    case        = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="evidence_files")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="evidence_uploaded",
    )
    description = models.CharField(max_length=500, blank=True)
    category    = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="OTHER")
    file        = models.FileField(upload_to="evidence/%Y/%m/%d/")
    original_filename = models.CharField(max_length=255)
    sha512_hash = models.CharField(max_length=128, help_text="SHA-512 hex digest computed at upload time")
    file_size   = models.PositiveBigIntegerField(help_text="File size in bytes")
    is_verified     = models.BooleanField(default=False, help_text="True after at least one successful integrity check")
    custody_status  = models.CharField(max_length=20, choices=CUSTODY_CHOICES, default="FSL")
    uploaded_at     = models.DateTimeField(auto_now_add=True)
    last_checked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = "Evidence File"
        verbose_name_plural = "Evidence Files"

    def __str__(self):
        return f"{self.original_filename} (Case: {self.case.fir_number})"
