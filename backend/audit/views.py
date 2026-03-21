from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import NoDeletePermission
from audit.models import ActivityLog
from audit.serializers import ActivityLogSerializer
from evidence.models import EvidenceFile


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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def case_integrity(request, case_id):
    """
    Module 2: Integrity score for a specific case.
    Returns percentage of verified evidence and chain-of-custody timeline.
    """
    from cases.models import Case
    try:
        case = Case.objects.get(id=case_id)
    except Case.DoesNotExist:
        return Response({'error': 'Case not found'}, status=404)

    evidence_qs = EvidenceFile.objects.filter(case=case)
    total = evidence_qs.count()
    verified = evidence_qs.filter(is_verified=True).count()
    integrity_score = round((verified / total) * 100) if total > 0 else 0

    # Build the chain-of-custody timeline from audit logs
    evidence_ids = list(evidence_qs.values_list('id', flat=True))
    targets = [f"evidence:{eid}" for eid in evidence_ids]
    logs_qs = ActivityLog.objects.filter(target__in=targets).select_related('user').order_by('timestamp')

    timeline = []
    for log in logs_qs:
        action_label = dict(ActivityLog.ACTION_CHOICES).get(log.action, log.action)
        hash_verified = log.action in [ActivityLog.ACTION_CHECK, ActivityLog.ACTION_TRANSFER, ActivityLog.ACTION_UPLOAD]
        timeline.append({
            'id': log.id,
            'timestamp': log.timestamp,
            'action': log.action,
            'action_label': action_label,
            'user': log.user.get_full_name() if log.user else 'System',
            'role': getattr(log.user, 'role', 'SYSTEM') if log.user else 'SYSTEM',
            'target': log.target,
            'details': log.details,
            'hash_verified': hash_verified,
            'is_failure': log.action == ActivityLog.ACTION_FAIL,
        })

    return Response({
        'case_id': case.id,
        'fir_number': case.fir_number,
        'title': case.title,
        'total_evidence': total,
        'verified_evidence': verified,
        'integrity_score': integrity_score,
        'timeline': timeline,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def system_health(request):
    """
    Module 3: System integrity cross-check.
    Compares total evidence count against upload audit log entries.
    Also returns the 10 latest audit log entries for the ticker.
    """
    evidence_count = EvidenceFile.objects.count()
    upload_log_count = ActivityLog.objects.filter(action=ActivityLog.ACTION_UPLOAD).count()
    fail_count = ActivityLog.objects.filter(action=ActivityLog.ACTION_FAIL).count()

    is_healthy = (evidence_count == upload_log_count) and (fail_count == 0)
    discrepancy = abs(evidence_count - upload_log_count)

    latest_logs = ActivityLog.objects.select_related('user').order_by('-timestamp')[:10]
    ticker_entries = [
        {
            'time': log.timestamp.strftime('%H:%M'),
            'action': log.action,
            'target': log.target,
            'user': log.user.get_full_name() if log.user else 'System',
            'details': log.details[:80] if log.details else '',
        }
        for log in latest_logs
    ]

    return Response({
        'status': 'HEALTHY' if is_healthy else 'ANOMALY_DETECTED',
        'is_healthy': is_healthy,
        'evidence_count': evidence_count,
        'upload_log_count': upload_log_count,
        'integrity_failures': fail_count,
        'discrepancy': discrepancy,
        'ticker': ticker_entries,
    })
