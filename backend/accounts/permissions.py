from rest_framework.permissions import BasePermission
from accounts.models import CustomUser


class IsPolice(BasePermission):
    """Allow write access only to Police role users."""
    message = "Only Police officers can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == CustomUser.ROLE_POLICE
        )


class IsFSL(BasePermission):
    """Allow write access only to Forensic Science Laboratory users."""
    message = "Only FSL personnel can upload forensic evidence."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == CustomUser.ROLE_FSL
        )


class IsJudiciary(BasePermission):
    """Allow read-only access to Judiciary users."""
    message = "Judiciary users have read-only access."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == CustomUser.ROLE_JUDICIARY
        )


class IsEvidenceRoom(BasePermission):
    """Allow Evidence Room Staff to manage transfers."""
    message = "Only Evidence Room Staff can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == CustomUser.ROLE_EVIDENCE
        )


class IsPoliceOrReadOnly(BasePermission):
    """Police can write; any authenticated user can read."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user.role == CustomUser.ROLE_POLICE


class NoDeletePermission(BasePermission):
    """Block DELETE for every role — used on ActivityLog."""
    message = "Audit log entries cannot be deleted."

    def has_permission(self, request, view):
        if request.method == 'DELETE':
            return False
        return True
