from django.urls import path, include
from rest_framework.routers import DefaultRouter
from cases.views import CaseViewSet, SuspectViewSet

router = DefaultRouter()
router.register(r'cases', CaseViewSet, basename='case')
router.register(r'suspects', SuspectViewSet, basename='suspect')

urlpatterns = [
    path('', include(router.urls)),
]
