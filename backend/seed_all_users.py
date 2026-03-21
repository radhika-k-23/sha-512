import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'deps.settings')
django.setup()

from accounts.models import CustomUser as User

def seed():
    # User data to ensure
    users = [
        ('police_officer', 'POLICE', 'Police Officer'),
        ('fsl_demo', 'FSL', 'Forensic Expert'),
        ('judge_demo', 'JUDICIARY', 'Judicial Officer'),
        ('evidence_clerk', 'EVIDENCE_ROOM', 'Storage Clerk'),
    ]

    for username, role, full_name in users:
        User.objects.filter(username=username).delete()
        User.objects.create_user(
            username=username,
            password='password123',
            role=role,
            first_name=full_name.split()[0],
            last_name=full_name.split()[1] if len(full_name.split()) > 1 else ''
        )
        print(f"Ensured user: {username} ({role}) with password: password123")

if __name__ == '__main__':
    seed()
