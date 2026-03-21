from rest_framework import serializers
from evidence.models import EvidenceFile


class EvidenceFileSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField(read_only=True)
    current_custodian_name = serializers.SerializerMethodField(read_only=True)
    case_fir = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = EvidenceFile
        fields = [
            'id', 'case', 'case_fir', 'uploaded_by', 'uploaded_by_name',
            'current_custodian', 'current_custodian_name',
            'description', 'category', 'file', 'original_filename',
            'sha512_hash', 'file_size', 'is_verified', 'custody_status',
            'uploaded_at', 'last_checked_at',
        ]
        read_only_fields = [
            'id', 'uploaded_by', 'sha512_hash', 'file_size',
            'original_filename', 'is_verified', 'custody_status',
            'uploaded_at', 'last_checked_at',
        ]

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name() if obj.uploaded_by else None

    def get_current_custodian_name(self, obj):
        return obj.current_custodian.get_full_name() if obj.current_custodian else "In Transit"

    def get_case_fir(self, obj):
        return obj.case.fir_number if obj.case else None
