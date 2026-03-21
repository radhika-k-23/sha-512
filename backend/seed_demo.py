import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'deps.settings')
django.setup()

from accounts.models import CustomUser as User
from cases.models import Case
from evidence.models import EvidenceFile

def seed():
    # 1. Create Evidence Room User
    User.objects.filter(username='evidence_clerk').delete()
    User.objects.create_user(
        username='evidence_clerk', 
        password='password123', 
        role='EVIDENCE_ROOM', 
        first_name='Evidence', 
        last_name='Clerk'
    )
    print("Created evidence_clerk user.")

    # 2. Add some demo cases if none exist
    if Case.objects.count() < 2:
        police_user = User.objects.filter(role='POLICE').first()
        if police_user:
            Case.objects.create(
                fir_number='FIR-2026-X10',
                title='Cyber Fraud Investigation',
                description='Illegal unauthorized access to bank servers.',
                created_by=police_user
            )
            print("Created demo case.")

seed()
