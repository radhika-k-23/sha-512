from rest_framework import serializers
from audit.models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'user_name', 'action', 'target', 'timestamp', 'ip_address', 'details']
        read_only_fields = ['id', 'user', 'timestamp']

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else "System"
