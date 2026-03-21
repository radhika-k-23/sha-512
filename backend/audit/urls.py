from django.urls import path, include
from rest_framework.routers import DefaultRouter
from audit.views import ActivityLogViewSet

router = DefaultRouter()
router.register(r'audit', ActivityLogViewSet, basename='audit')

urlpatterns = [
    path('', include(router.urls)),
]
