from django.contrib import admin
from cases.models import Case, Suspect


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display  = ['fir_number', 'title', 'status', 'created_by', 'created_at']
    list_filter   = ['status']
    search_fields = ['fir_number', 'title']


@admin.register(Suspect)
class SuspectAdmin(admin.ModelAdmin):
    list_display  = ['name', 'case', 'national_id', 'added_by', 'added_at']
    search_fields = ['name', 'national_id']
