from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from accounts.models import CustomUser
from accounts.permissions import IsAdmin
from accounts.serializers import (
    CustomUserSerializer, RegisterSerializer,
    AdminCreateOfficerSerializer, generate_temp_password
)
from audit.models import ActivityLog
from core.hashing import hash_data


def _get_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({'message': 'User registered successfully.'}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Return the currently authenticated user's profile."""
    serializer = CustomUserSerializer(request.user)
    ActivityLog.objects.create(
        user=request.user,
        action=ActivityLog.ACTION_VIEW,
        target=f"profile:{request.user.id}",
        ip_address=_get_ip(request),
    )
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_create_officer(request):
    """
    Admin-only: Register a new officer.
    - Auto-generates a 12-character secure password.
    - Hashes it with SHA-512 and stores it in the audit log.
    - Returns badge_number and temp_password to the admin ONCE.
    """
    serializer = AdminCreateOfficerSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Generate a one-time secure password
    temp_password = generate_temp_password(12)
    password_sha512 = hash_data(temp_password.encode())

    # Create user — badge_number auto-generated via model save()
    user = serializer.save()
    user.set_password(temp_password)
    user.save()

    # Immutable audit entry
    ActivityLog.objects.create(
        user=request.user,
        action=ActivityLog.ACTION_UPLOAD,  # Reuse UPLOAD as ACCOUNT_CREATE
        target=f"officer:{user.id}",
        ip_address=_get_ip(request),
        details=(
            f"Officer account created by {request.user.get_full_name()}. "
            f"Badge: {user.badge_number}. Role: {user.role}. "
            f"Password SHA-512: {password_sha512[:24]}…"
        ),
    )

    return Response({
        'message': 'Officer registered successfully.',
        'badge_number': user.badge_number,
        'username': user.username,
        'role': user.role,
        'temp_password': temp_password,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def officer_list(request):
    """Admin-only: List all officers in the system."""
    users = CustomUser.objects.exclude(is_superuser=True).order_by('role', 'date_joined')
    serializer = CustomUserSerializer(users, many=True)
    return Response(serializer.data)
