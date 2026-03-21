from django.urls import path, include
from rest_framework.routers import DefaultRouter
from audit.views import ActivityLogViewSet, case_integrity, system_health

router = DefaultRouter()
router.register(r'audit', ActivityLogViewSet, basename='audit')

urlpatterns = [
    path('', include(router.urls)),
    path('case-integrity/<int:case_id>/', case_integrity, name='case-integrity'),
    path('system-health/', system_health, name='system-health'),
]
