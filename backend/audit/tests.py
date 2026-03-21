from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import CustomUser
from audit.models import ActivityLog


class AuditLogPermissionTests(TestCase):
    """Security tests verifying that no role can delete audit log entries."""

    def setUp(self):
        self.client = APIClient()

        # Create a Police user
        self.police_user = CustomUser.objects.create_user(
            username='officer_jones',
            password='SecurePass123!',
            role=CustomUser.ROLE_POLICE,
            first_name='Officer',
            last_name='Jones',
        )

        # Create an FSL user
        self.fsl_user = CustomUser.objects.create_user(
            username='fsl_analyst',
            password='SecurePass123!',
            role=CustomUser.ROLE_FSL,
        )

        # Create a Judiciary user
        self.judiciary_user = CustomUser.objects.create_user(
            username='judge_smith',
            password='SecurePass123!',
            role=CustomUser.ROLE_JUDICIARY,
        )

        # Seed one audit log entry to attempt deletion on
        self.log_entry = ActivityLog.objects.create(
            user=self.police_user,
            action=ActivityLog.ACTION_LOGIN,
            target="session:1",
            ip_address="127.0.0.1",
            details="Test login entry",
        )

    def _get_token(self, username, password):
        resp = self.client.post('/api/token/', {'username': username, 'password': password}, format='json')
        return resp.data['access']

    def test_police_cannot_delete_audit_log(self):
        """A Police user must receive HTTP 403 when attempting to DELETE an audit log entry."""
        token = self._get_token('officer_jones', 'SecurePass123!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = f'/api/audit/{self.log_entry.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        # Verify the entry still exists in DB
        self.assertTrue(ActivityLog.objects.filter(pk=self.log_entry.pk).exists())

    def test_fsl_cannot_delete_audit_log(self):
        """An FSL user must also receive HTTP 403 on DELETE."""
        token = self._get_token('fsl_analyst', 'SecurePass123!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = f'/api/audit/{self.log_entry.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_judiciary_cannot_delete_audit_log(self):
        """Judiciary user must receive HTTP 403 on DELETE."""
        token = self._get_token('judge_smith', 'SecurePass123!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        url = f'/api/audit/{self.log_entry.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_audit_log_list_accessible_to_all_authenticated(self):
        """Any authenticated user can GET the audit log list."""
        token = self._get_token('officer_jones', 'SecurePass123!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/audit/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_audit_log_unauthenticated_denied(self):
        """Unauthenticated requests to audit log must return 401."""
        self.client.credentials()  # clear credentials
        response = self.client.get('/api/audit/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
