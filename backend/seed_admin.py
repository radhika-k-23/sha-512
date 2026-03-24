import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'deps.settings')
django.setup()
from accounts.models import CustomUser

user, created = CustomUser.objects.get_or_create(username='admin')
user.set_password('admin123')
user.role = CustomUser.ROLE_ADMIN
user.is_superuser = True
user.is_staff = True
user.save()
print("Admin created/updated: admin / admin123")
