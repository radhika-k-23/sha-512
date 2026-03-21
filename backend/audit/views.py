from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import NoDeletePermission
from audit.models import ActivityLog
from audit.serializers import ActivityLogSerializer


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for the Audit Log.
    NoDeletePermission is a belt-and-suspenders guard since ReadOnly already
    excludes write methods — but it explicitly blocks DELETE at the permission
    layer so unit tests can assert the 403 response.
    """
    serializer_class   = ActivityLogSerializer
    permission_classes = [IsAuthenticated, NoDeletePermission]
    queryset = ActivityLog.objects.select_related('user').all()

    def get_queryset(self):
        qs = super().get_queryset()
        # Optional filter by target prefix, e.g. ?target=evidence:42
        target = self.request.query_params.get('target')
        if target:
            qs = qs.filter(target__startswith=target)
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)
        return qs
