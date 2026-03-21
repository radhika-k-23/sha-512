import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'deps.settings')
django.setup()

from evidence.models import EvidenceFile
from accounts.models import User

def fix_custody():
    # Get a default custodian (e.g., the first FSL user)
    fsl_user = User.objects.filter(role='FSL').first()
    if not fsl_user:
        print("No FSL user found to set as custodian.")
        return

    # Update all evidence
    count = EvidenceFile.objects.all().count()
    EvidenceFile.objects.all().update(
        custody_status='IN_FSL',
        current_custodian=fsl_user
    )
    print(f"Updated {count} evidence records to 'IN_FSL' with custodian {fsl_user.username}")

if __name__ == "__main__":
    fix_custody()
