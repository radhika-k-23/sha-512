from rest_framework import serializers
from audit.models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name  = serializers.SerializerMethodField(read_only=True)
    user_badge = serializers.SerializerMethodField(read_only=True)
    user_role  = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'user_name', 'user_badge', 'user_role',
            'action', 'model_name', 'target', 'timestamp',
            'ip_address', 'details', 'sha512_hash', 'prev_hash',
        ]
        read_only_fields = ['id', 'user', 'timestamp']

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else "System"

    def get_user_badge(self, obj):
        return getattr(obj.user, 'badge_number', '') if obj.user else ''

    def get_user_role(self, obj):
        return getattr(obj.user, 'role', 'SYSTEM') if obj.user else 'SYSTEM'
