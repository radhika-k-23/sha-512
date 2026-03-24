from django.test import TestCase
from django.contrib.auth import get_user_model
from cases.models import Case
from audit.models import ActivityLog

User = get_user_model()

class CaseRegistrationTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='police_test',
            password='password123',
            role='POLICE',
            badge_number='P-123'
        )

    def test_create_case_triggers_audit_log(self):
        """Verify that creating a Case via the model (as in the View) triggers the audit signal."""
        case = Case.objects.create(
            fir_number='CASE-2026-TEST',
            title='Test Case',
            description='Testing audit signals',
            created_by=self.user
        )
        
        # Check if ActivityLog was created
        log = ActivityLog.objects.filter(target=f"case:{case.id}").first()
        self.assertIsNotNone(log, "Audit log should be created automatically by signal")
        self.assertEqual(log.action, ActivityLog.ACTION_CREATE)
        self.assertIn('CASE-2026-TEST', log.details)
        self.assertEqual(log.user, self.user)

    def test_case_status_update_signals(self):
        """Verify that updating a Case status triggers an update log with rich diff."""
        case = Case.objects.create(
            fir_number='CASE-2026-UPDATE',
            title='Update Test',
            created_by=self.user
        )
        
        # Clear logs from creation to focus on update
        ActivityLog.objects.all().delete()
        
        case.status = 'CLOSED'
        case.save()
        
        log = ActivityLog.objects.filter(target=f"case:{case.id}").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.action, ActivityLog.ACTION_UPDATE)
        self.assertIn('Closed', log.details)
        self.assertIn('Open', log.details)
