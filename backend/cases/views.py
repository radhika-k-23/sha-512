from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.filters import SearchFilter

from accounts.permissions import IsPoliceOrReadOnly
from audit.models import ActivityLog
from cases.models import Case, Suspect
from cases.serializers import CaseSerializer, SuspectSerializer


def _get_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class CaseViewSet(viewsets.ModelViewSet):
    """
    CRUD for Cases.
    - Police: full read/write
    - All authenticated: read-only
    """
    serializer_class   = CaseSerializer
    permission_classes = [IsAuthenticated, IsPoliceOrReadOnly]
    queryset = Case.objects.select_related('created_by').prefetch_related('suspects').all()
    filter_backends = [SearchFilter]
    search_fields = ['fir_number', 'title', 'description']

    def perform_create(self, serializer):
        case = serializer.save(created_by=self.request.user)
        ActivityLog.objects.create(
            user=self.request.user,
            action=ActivityLog.ACTION_VIEW,
            target=f"case:{case.id}",
            ip_address=_get_ip(self.request),
            details=f"Case '{case.title}' created by {self.request.user.get_full_name()}.",
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        ActivityLog.objects.create(
            user=request.user,
            action=ActivityLog.ACTION_VIEW,
            target=f"case:{instance.id}",
            ip_address=_get_ip(request),
        )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class SuspectViewSet(viewsets.ModelViewSet):
    """Police-only write access; all authenticated users can read."""
    serializer_class   = SuspectSerializer
    permission_classes = [IsAuthenticated, IsPoliceOrReadOnly]
    queryset = Suspect.objects.select_related('case', 'added_by').all()

    def perform_create(self, serializer):
        serializer.save(added_by=self.request.user)
