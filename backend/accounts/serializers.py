import secrets
import string

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from accounts.models import CustomUser


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Inject role, username, badge_number, and full_name into the JWT payload."""
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role']         = user.role
        token['username']     = user.username
        token['full_name']    = user.get_full_name()
        token['badge_number'] = user.badge_number
        return token


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'badge_number', 'department', 'is_active', 'date_joined'
        ]
        read_only_fields = ['id', 'badge_number', 'date_joined']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model  = CustomUser
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role', 'badge_number', 'department']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        return user


def generate_temp_password(length: int = 12) -> str:
    """Generate a cryptographically secure random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


class AdminCreateOfficerSerializer(serializers.ModelSerializer):
    """Used by admins to create new officers — password is auto-generated."""
    class Meta:
        model  = CustomUser
        fields = ['username', 'first_name', 'last_name', 'email', 'role', 'department']
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name':  {'required': True},
            'email':      {'required': True},
        }
