from rest_framework import serializers
from cases.models import Case, Suspect


class SuspectSerializer(serializers.ModelSerializer):
    added_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Suspect
        fields = ['id', 'case', 'name', 'national_id', 'details', 'added_by', 'added_by_name', 'added_at']
        read_only_fields = ['id', 'added_by', 'added_at']

    def get_added_by_name(self, obj):
        return obj.added_by.get_full_name() if obj.added_by else None


class CaseSerializer(serializers.ModelSerializer):
    suspects = SuspectSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Case
        fields = ['id', 'title', 'description', 'fir_number', 'status',
                  'created_by', 'created_by_name', 'created_at', 'updated_at', 'suspects']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None
