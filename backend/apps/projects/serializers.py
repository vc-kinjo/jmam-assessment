from rest_framework import serializers
from .models import Project, ProjectMember
from apps.users.serializers import UserListSerializer


class ProjectMemberSerializer(serializers.ModelSerializer):
    user = UserListSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = ProjectMember
        fields = ['id', 'user', 'user_id', 'role', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class ProjectSerializer(serializers.ModelSerializer):
    created_by = UserListSerializer(read_only=True)
    members = ProjectMemberSerializer(many=True, read_only=True)
    task_count = serializers.SerializerMethodField()
    total_tasks = serializers.SerializerMethodField()
    completed_tasks = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'start_date', 'end_date',
            'status', 'category', 'created_by', 'created_at', 'updated_at',
            'members', 'task_count', 'total_tasks', 'completed_tasks'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_task_count(self, obj):
        """プロジェクト内のタスク数を取得"""
        return obj.tasks.count()

    def get_total_tasks(self, obj):
        """プロジェクト内の総タスク数を取得"""
        return obj.tasks.count()

    def get_completed_tasks(self, obj):
        """完了済みタスク数を取得"""
        return obj.tasks.filter(status='completed').count()


class ProjectListSerializer(serializers.ModelSerializer):
    created_by = UserListSerializer(read_only=True)
    task_count = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    total_tasks = serializers.SerializerMethodField()
    completed_tasks = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'start_date', 'end_date',
            'status', 'category', 'created_by', 'created_at',
            'task_count', 'member_count', 'total_tasks', 'completed_tasks'
        ]

    def get_task_count(self, obj):
        return obj.tasks.count()

    def get_member_count(self, obj):
        return obj.members.count()

    def get_total_tasks(self, obj):
        return obj.tasks.count()

    def get_completed_tasks(self, obj):
        return obj.tasks.filter(status='completed').count()


class ProjectCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Project
        fields = [
            'name', 'description', 'start_date', 'end_date',
            'status', 'category'
        ]

    def validate(self, data):
        """バリデーション"""
        if data.get('start_date') and data.get('end_date'):
            if data['start_date'] >= data['end_date']:
                raise serializers.ValidationError(
                    "開始日は終了日より前である必要があります"
                )
        return data