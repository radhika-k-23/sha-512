from django.urls import path
from accounts.views import register, me, admin_create_officer, officer_list

urlpatterns = [
    path('register/', register, name='register'),
    path('me/', me, name='me'),
    path('admin/create-officer/', admin_create_officer, name='admin-create-officer'),
    path('admin/officers/', officer_list, name='officer-list'),
]
