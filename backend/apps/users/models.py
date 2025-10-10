from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Meta:
        db_table = "users"
    """カスタムユーザーモデル"""

    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('manager', 'Manager'),
        ('member', 'Member'),
    ]

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=100)
    furigana = models.CharField(max_length=100, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    company = models.CharField(max_length=100, blank=True)
    department = models.CharField(max_length=100, blank=True)
    role_level = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'full_name']

    def __str__(self):
        return f"{self.username} ({self.full_name})"