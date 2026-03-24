import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'deps.settings')
django.setup()

from accounts.models import CustomUser

roles = CustomUser.objects.values_list('role', flat=True).distinct()
for role in roles:
    if not role:
        continue
    users = CustomUser.objects.filter(role=role)
    for i, user in enumerate(users):
        prefix = CustomUser.ROLE_PREFIX.get(role, 'USR')
        user.badge_number = f"{prefix}-2026-{i+1:03d}"
        CustomUser.objects.filter(pk=user.pk).update(badge_number=user.badge_number)
print("Badges populated.")
