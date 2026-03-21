from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from cases.models import Case
from evidence.models import EvidenceFile
from audit.models import ActivityLog


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Return high-level stats for the dashboard widget."""
    open_cases = Case.objects.filter(status='OPEN').count()
    pending_evidence = EvidenceFile.objects.filter(is_verified=False).count()

    # System integrity: no INTEGRITY_FAIL in the last 24 hours
    since = timezone.now() - timedelta(hours=24)
    recent_failures = ActivityLog.objects.filter(
        action=ActivityLog.ACTION_FAIL,
        timestamp__gte=since,
    ).count()

    return Response({
        'open_cases': open_cases,
        'pending_evidence': pending_evidence,
        'integrity_ok': recent_failures == 0,
        'recent_failures': recent_failures,
    })
