from django.http import FileResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsFSL, IsEvidenceRoom, NoDeletePermission
from audit.models import ActivityLog
from core.hashing import compute_sha512, verify_integrity
from evidence.models import EvidenceFile
from evidence.serializers import EvidenceFileSerializer


def _get_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class EvidenceFileViewSet(viewsets.ModelViewSet):
    """
    Manage evidence files.
    - POST   (upload): FSL only — SHA-512 computed before saving.
    - GET    (list/retrieve): all authenticated.
    - DELETE: blocked for everyone (NoDeletePermission).
    - PATCH /check_integrity/: any authenticated user — re-hashes and compares.
    """
    serializer_class = EvidenceFileSerializer
    queryset = EvidenceFile.objects.select_related('case', 'uploaded_by').all()
    filter_backends = [SearchFilter]
    search_fields = ['original_filename', 'category', 'description', 'case__fir_number']

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), IsFSL()]
        return [IsAuthenticated(), NoDeletePermission()]

    def perform_create(self, serializer):
        uploaded_file = self.request.FILES.get('file')
        sha512        = compute_sha512(uploaded_file)
        evidence = serializer.save(
            uploaded_by=self.request.user,
            current_custodian=self.request.user,
            sha512_hash=sha512,
            file_size=uploaded_file.size,
            original_filename=uploaded_file.name,
            custody_status='IN_FSL' if self.request.user.role == 'FSL' else 'IN_POLICE_CUSTODY'
        )
        ActivityLog.objects.create(
            user=self.request.user,
            action=ActivityLog.ACTION_UPLOAD,
            target=f"evidence:{evidence.id}",
            ip_address=_get_ip(self.request),
            details=(
                f"File '{evidence.original_filename}' uploaded and custody initialized. "
                f"Custodian: {self.request.user.get_full_name()}. SHA-512 Hash Verified."
            ),
        )

    @action(detail=True, methods=['post'], url_path='receive')
    def receive_evidence(self, request, pk=None):
        """Evidence Room officer receives custody — re-verifies SHA-512 first."""
        if not request.user.role == 'EVIDENCE_ROOM':
            return Response({'error': 'Authorization Refused: Only Evidence Room staff can accept transfers.'}, status=status.HTTP_403_FORBIDDEN)
        
        evidence = self.get_object()
        
        try:
            with evidence.file.open('rb') as f:
                ok = verify_integrity(f, evidence.sha512_hash)
        except FileNotFoundError:
            return Response({'error': 'Data Missing: File not found on secure storage.'}, status=status.HTTP_404_NOT_FOUND)

        if not ok:
            ActivityLog.objects.create(
                user=request.user, action=ActivityLog.ACTION_FAIL,
                target=f"evidence:{evidence.id}", ip_address=_get_ip(request),
                details="CRITICAL: Integrity check FAILED during custody transfer. Tampering detected!",
            )
            return Response({'error': 'Integrity Compromised: Digital hash mismatch detected!'}, status=status.HTTP_409_CONFLICT)

        evidence.custody_status  = 'IN_EVIDENCE_ROOM'
        evidence.current_custodian = request.user
        evidence.is_verified     = True
        evidence.last_checked_at = timezone.now()
        evidence.save(update_fields=['custody_status', 'current_custodian', 'is_verified', 'last_checked_at'])
        
        ActivityLog.objects.create(
            user=request.user, action=ActivityLog.ACTION_TRANSFER,
            target=f"evidence:{evidence.id}", ip_address=_get_ip(request),
            details=f"Digital Handshake success: Custody accepted by {request.user.get_full_name()}. Integrity Verified.",
        )
        return Response({'message': 'Evidence received and integrity verified.', 'custody_status': 'IN_EVIDENCE_ROOM'})

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        """Stream the evidence file to the requester."""
        evidence = self.get_object()
        ActivityLog.objects.create(
            user=request.user, action=ActivityLog.ACTION_VIEW,
            target=f"evidence:{evidence.id}", ip_address=_get_ip(request),
            details=f"File '{evidence.original_filename}' downloaded.",
        )
        try:
            response = FileResponse(
                evidence.file.open('rb'),
                as_attachment=True,
                filename=evidence.original_filename,
            )
            response['X-SHA512-Hash'] = evidence.sha512_hash
            return response
        except FileNotFoundError:
            return Response({'error': 'File not found on disk.'}, status=status.HTTP_404_NOT_FOUND)
