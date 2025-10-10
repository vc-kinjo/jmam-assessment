from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'full_name', 'role_level', 'is_active', 'created_at')
    list_filter = ('role_level', 'is_active', 'created_at')
    search_fields = ('username', 'email', 'full_name')
    ordering = ('-created_at',)

    fieldsets = BaseUserAdmin.fieldsets + (
        ('追加情報', {
            'fields': ('full_name', 'furigana', 'phone_number', 'company', 'department', 'role_level')
        }),
    )