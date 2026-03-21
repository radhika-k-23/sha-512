from django.contrib import admin
from evidence.models import EvidenceFile


@admin.register(EvidenceFile)
class EvidenceFileAdmin(admin.ModelAdmin):
    list_display  = ['original_filename', 'case', 'category', 'uploaded_by', 'is_verified', 'uploaded_at']
    list_filter   = ['category', 'is_verified']
    search_fields = ['original_filename', 'sha512_hash']
    readonly_fields = ['sha512_hash', 'file_size', 'uploaded_at', 'last_checked_at']
