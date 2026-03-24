from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
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
    Read-only paginated audit log.
    - Defaults to last 3 days (?days=3).
    - Supports ?days=N, ?search=, ?action=, ?model= filters.
    - Pagination: DRF PageNumberPagination via ?page= and ?page_size=.
    """
    serializer_class   = ActivityLogSerializer
    permission_classes = [IsAuthenticated, NoDeletePermission]
    queryset = ActivityLog.objects.select_related('user').all()

    def get_queryset(self):
        qs = super().get_queryset()

        # ── Date range filter (default: last 3 days) ─────────────────────
        try:
            days = int(self.request.query_params.get('days', 3))
        except (ValueError, TypeError):
            days = 3
        if days > 0:
            since = timezone.now() - timedelta(days=days)
            qs = qs.filter(timestamp__gte=since)

        # ── Optional model filter e.g. ?model=EvidenceFile ───────────────
        model_name = self.request.query_params.get('model')
        if model_name:
            qs = qs.filter(model_name=model_name)

        # ── Optional action filter e.g. ?action=CREATE ───────────────────
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)

        # ── Optional target filter e.g. ?target=evidence:42 ─────────────
        target = self.request.query_params.get('target')
        if target:
            qs = qs.filter(target__startswith=target)

        # ── Full-text search across details / target / action / model ────
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(details__icontains=search) |
                Q(target__icontains=search) |
                Q(action__icontains=search) |
                Q(model_name__icontains=search)
            )

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
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_verify(request):
    """
    Forensic Ledger Verification.
    Iterates through all ActivityLog entries to verify SHA-512 chain integrity.
    Detects:
    1. Hash mismatches (Data tampering)
    2. Prev-hash mismatches (Order tampering / deletion)
    3. Genesis gaps
    """
    logs = ActivityLog.objects.all().order_by('id')
    total = logs.count()
    if total == 0:
        return Response({'status': 'EMPTY', 'verified_count': 0})

    results = []
    failed_ids = []
    last_hash = "GENESIS_BLOCK"
    
    for log in logs:
        # 1. Check if it points to the correct previous block
        if log.prev_hash != last_hash:
            failed_ids.append({'id': log.id, 'reason': 'CHAIN_BROKEN', 'expected': last_hash, 'found': log.prev_hash})
            # We don't break, so we can see where the next success starts
        
        # 2. Re-calculate hash and compare
        calculated = log.calculate_payload_hash()
        if log.sha512_hash != calculated:
            failed_ids.append({'id': log.id, 'reason': 'HASH_MISMATCH', 'expected': log.sha512_hash, 'calculated': calculated})
        
        last_hash = log.sha512_hash

    is_secure = len(failed_ids) == 0
    return Response({
        'status': 'SECURE' if is_secure else 'TAMPER_DETECTED',
        'is_secure': is_secure,
        'total_entries': total,
        'verified_entries': total - len(failed_ids),
        'failures': failed_ids[:50], # Cap reporting
        'timestamp': timezone.now()
    })
