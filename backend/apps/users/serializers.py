from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """ユーザーシリアライザ"""
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'furigana',
            'phone_number', 'company', 'department', 'role_level',
            'is_active', 'created_at', 'updated_at', 'password'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'full_name', 'furigana',
            'phone_number', 'company', 'department', 'role_level'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """ユーザープロフィールシリアライザ（パスワード除外）"""

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'furigana',
            'phone_number', 'company', 'department', 'role_level',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'username', 'created_at', 'updated_at']


class LoginSerializer(serializers.Serializer):
    """ログインシリアライザ"""
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError('ユーザー名またはパスワードが正しくありません。')
            if not user.is_active:
                raise serializers.ValidationError('このアカウントは無効です。')
            attrs['user'] = user
        else:
            raise serializers.ValidationError('ユーザー名とパスワードの両方を入力してください。')

        return attrs


class UserListSerializer(serializers.ModelSerializer):
    """ユーザー一覧用シリアライザ（最小限の情報）"""

    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'email', 'role_level', 'is_active']