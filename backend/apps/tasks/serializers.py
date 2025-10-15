from rest_framework import serializers
from django.db import models
from .models import Task, TaskAssignment, TaskDependency, TaskComment, TaskAttachment
from apps.users.serializers import UserListSerializer
from apps.projects.serializers import ProjectListSerializer


class TaskAssignmentSerializer(serializers.ModelSerializer):
    """タスク担当者シリアライザ"""
    user = UserListSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = TaskAssignment
        fields = ['id', 'user', 'user_id', 'assigned_at']
        read_only_fields = ['id', 'assigned_at']


class TaskDependencySerializer(serializers.ModelSerializer):
    """タスク依存関係シリアライザ"""
    predecessor_name = serializers.CharField(source='predecessor.name', read_only=True)
    successor_name = serializers.CharField(source='successor.name', read_only=True)

    class Meta:
        model = TaskDependency
        fields = [
            'id', 'predecessor', 'successor', 'dependency_type', 'lag_days',
            'predecessor_name', 'successor_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class TaskCommentSerializer(serializers.ModelSerializer):
    """タスクコメントシリアライザ"""
    user = UserListSerializer(read_only=True)

    class Meta:
        model = TaskComment
        fields = ['id', 'user', 'content', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class TaskAttachmentSerializer(serializers.ModelSerializer):
    """タスク添付ファイルシリアライザ"""
    user = UserListSerializer(read_only=True)

    class Meta:
        model = TaskAttachment
        fields = [
            'id', 'user', 'file', 'original_filename', 'file_size',
            'content_type', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'file_size', 'content_type', 'created_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        file = validated_data['file']
        validated_data['original_filename'] = file.name
        validated_data['file_size'] = file.size
        validated_data['content_type'] = file.content_type
        return super().create(validated_data)


class TaskSerializer(serializers.ModelSerializer):
    """タスクシリアライザ（詳細版）"""
    project_name = serializers.CharField(source='project.name', read_only=True)
    parent_task_name = serializers.CharField(source='parent_task.name', read_only=True)
    assignments = TaskAssignmentSerializer(many=True, read_only=True)
    dependencies_as_successor = TaskDependencySerializer(many=True, read_only=True)
    dependencies_as_predecessor = TaskDependencySerializer(many=True, read_only=True)
    comments = TaskCommentSerializer(many=True, read_only=True)
    attachments = TaskAttachmentSerializer(many=True, read_only=True)
    subtask_count = serializers.SerializerMethodField()
    duration_days = serializers.ReadOnlyField()

    class Meta:
        model = Task
        fields = [
            'id', 'project', 'project_name', 'parent_task', 'parent_task_name',
            'level', 'name', 'description', 'planned_start_date', 'planned_end_date',
            'actual_start_date', 'actual_end_date', 'estimated_hours', 'actual_hours',
            'progress_rate', 'priority', 'status', 'is_milestone', 'category',
            'sort_order', 'created_at', 'updated_at', 'assignments',
            'dependencies_as_successor', 'dependencies_as_predecessor',
            'comments', 'attachments', 'subtask_count', 'duration_days'
        ]
        read_only_fields = ['created_at', 'updated_at', 'level', 'duration_days']

    def get_subtask_count(self, obj):
        """サブタスク数を取得"""
        return obj.subtasks.count()

    def create(self, validated_data):
        # 親タスクがある場合、レベルを自動設定
        if validated_data.get('parent_task'):
            validated_data['level'] = validated_data['parent_task'].level + 1
        return super().create(validated_data)


class TaskListSerializer(serializers.ModelSerializer):
    """タスク一覧用シリアライザ（軽量版）"""
    project_name = serializers.CharField(source='project.name', read_only=True)
    parent_task_name = serializers.CharField(source='parent_task.name', read_only=True)
    assigned_users = serializers.SerializerMethodField()
    assignments = TaskAssignmentSerializer(many=True, read_only=True)
    dependencies_as_successor = TaskDependencySerializer(many=True, read_only=True)
    subtask_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'project', 'project_name', 'parent_task', 'parent_task_name',
            'level', 'name', 'planned_start_date', 'planned_end_date',
            'estimated_hours', 'progress_rate', 'priority', 'status', 'is_milestone',
            'sort_order', 'assigned_users', 'assignments', 'dependencies_as_successor', 'subtask_count'
        ]

    def get_assigned_users(self, obj):
        """担当者一覧を取得"""
        return [assignment.user.full_name for assignment in obj.assignments.all()]

    def get_subtask_count(self, obj):
        return obj.subtasks.count()


class TaskGanttSerializer(serializers.ModelSerializer):
    """ガントチャート用タスクシリアライザ"""
    text = serializers.CharField(source='name')
    start_date = serializers.DateField(source='planned_start_date')
    end_date = serializers.DateField(source='planned_end_date')
    progress = serializers.SerializerMethodField()
    parent = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'text', 'start_date', 'end_date', 'progress',
            'parent', 'type', 'priority', 'status'
        ]

    def get_progress(self, obj):
        """進捗率を0-1の範囲で返す"""
        return obj.progress_rate / 100.0

    def get_parent(self, obj):
        """親タスクID（DHtmlX Gantt用）"""
        return obj.parent_task_id if obj.parent_task_id else 0

    def get_type(self, obj):
        """タスクタイプ（DHtmlX Gantt用）"""
        if obj.is_milestone:
            return 'milestone'
        elif obj.subtasks.exists():
            return 'project'
        else:
            return 'task'


class TaskCreateSerializer(serializers.ModelSerializer):
    """タスク作成用シリアライザ"""
    assigned_users = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    predecessor_tasks = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Task
        fields = [
            'project', 'parent_task', 'name', 'description',
            'planned_start_date', 'planned_end_date', 'estimated_hours',
            'priority', 'status', 'is_milestone', 'category',
            'assigned_users', 'predecessor_tasks'
        ]

    def validate(self, data):
        """包括的なバリデーション"""
        # 日付検証
        if (data.get('planned_start_date') and data.get('planned_end_date') and
            data['planned_start_date'] >= data['planned_end_date']):
            raise serializers.ValidationError(
                "計画開始日は計画終了日より前である必要があります"
            )

        # 親タスクの階層制限チェック
        if data.get('parent_task'):
            parent_task = data['parent_task']
            if parent_task.level >= 3:
                raise serializers.ValidationError(
                    "サブタスクは3階層までしか作成できません"
                )

            # 親タスクが同じプロジェクトに属するかチェック
            if parent_task.project_id != data['project'].id:
                raise serializers.ValidationError(
                    "親タスクは同じプロジェクトに属している必要があります"
                )

        # 予想工数の検証
        if data.get('estimated_hours') and data['estimated_hours'] < 0:
            raise serializers.ValidationError(
                "予想工数は0以上である必要があります"
            )

        return data

    def create(self, validated_data):
        from django.db import transaction

        # assigned_usersとpredecessor_tasksを取り出し
        assigned_users = validated_data.pop('assigned_users', [])
        predecessor_tasks = validated_data.pop('predecessor_tasks', [])

        with transaction.atomic():
            # 親タスクがある場合、レベルを自動設定
            if validated_data.get('parent_task'):
                validated_data['level'] = validated_data['parent_task'].level + 1

            # ソート順の自動設定
            max_sort_order = Task.objects.filter(
                project=validated_data['project']
            ).aggregate(models.Max('sort_order'))['sort_order__max'] or 0
            validated_data['sort_order'] = max_sort_order + 1

            # デフォルトのステータスを設定
            if not validated_data.get('status'):
                validated_data['status'] = 'not_started'

            task = super().create(validated_data)

            # タスク担当者を作成（プロジェクトメンバーかチェック）
            for user_id in assigned_users:
                # プロジェクトメンバーかチェック
                from apps.projects.models import ProjectMember
                if not ProjectMember.objects.filter(
                    project=task.project, user_id=user_id
                ).exists():
                    raise serializers.ValidationError(
                        f"ユーザーID {user_id} はプロジェクトメンバーではありません"
                    )
                TaskAssignment.objects.create(task=task, user_id=user_id)

            # タスク依存関係を作成（循環依存チェック付き）
            for predecessor_id in predecessor_tasks:
                predecessor = Task.objects.filter(
                    id=predecessor_id, project=task.project
                ).first()
                if not predecessor:
                    raise serializers.ValidationError(
                        f"先行タスクID {predecessor_id} が見つかりません"
                    )

                # 循環依存チェック
                if self._creates_circular_dependency(predecessor_id, task.id):
                    raise serializers.ValidationError(
                        "循環依存が発生するため作成できません"
                    )

                TaskDependency.objects.create(
                    predecessor=predecessor,
                    successor=task,
                    dependency_type='finish_to_start'
                )

        return task

    def _creates_circular_dependency(self, predecessor_id: int, successor_id: int) -> bool:
        """循環依存チェック"""
        visited = set()
        stack = [successor_id]

        while stack:
            current_id = stack.pop()
            if current_id in visited:
                continue
            visited.add(current_id)

            if current_id == predecessor_id:
                return True

            # current_idが依存しているタスクを取得
            dependencies = TaskDependency.objects.filter(
                successor_id=current_id
            ).values_list('predecessor_id', flat=True)

            for dep_id in dependencies:
                if dep_id not in visited:
                    stack.append(dep_id)

        return False


class TaskUpdateSerializer(serializers.ModelSerializer):
    """タスク更新用シリアライザ"""
    assigned_users = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    predecessor_tasks = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Task
        fields = [
            'name', 'description', 'planned_start_date', 'planned_end_date',
            'actual_start_date', 'actual_end_date', 'estimated_hours',
            'actual_hours', 'progress_rate', 'priority', 'status',
            'is_milestone', 'category', 'sort_order', 'assigned_users', 'predecessor_tasks'
        ]

    def validate(self, data):
        """包括的なバリデーション"""
        instance = self.instance

        # 日付検証（計画日）
        planned_start = data.get('planned_start_date', instance.planned_start_date)
        planned_end = data.get('planned_end_date', instance.planned_end_date)
        if (planned_start and planned_end and planned_start >= planned_end):
            raise serializers.ValidationError(
                "計画開始日は計画終了日より前である必要があります"
            )

        # 日付検証（実績日）
        actual_start = data.get('actual_start_date', instance.actual_start_date)
        actual_end = data.get('actual_end_date', instance.actual_end_date)
        if (actual_start and actual_end and actual_start >= actual_end):
            raise serializers.ValidationError(
                "実際開始日は実際終了日より前である必要があります"
            )

        # 進捗率検証
        progress_rate = data.get('progress_rate', instance.progress_rate)
        if progress_rate is not None and (progress_rate < 0 or progress_rate > 100):
            raise serializers.ValidationError(
                "進捗率は0-100の範囲で入力してください"
            )

        # 予想工数の検証
        if data.get('estimated_hours') is not None and data['estimated_hours'] < 0:
            raise serializers.ValidationError(
                "予想工数は0以上である必要があります"
            )

        # 実績工数の検証
        if data.get('actual_hours') is not None and data['actual_hours'] < 0:
            raise serializers.ValidationError(
                "実績工数は0以上である必要があります"
            )

        return data

    def update(self, instance, validated_data):
        from django.db import transaction

        # assigned_usersとpredecessor_tasksを取り出し
        assigned_users = validated_data.pop('assigned_users', None)
        predecessor_tasks = validated_data.pop('predecessor_tasks', None)

        with transaction.atomic():
            # 基本フィールドを更新
            for attr, value in validated_data.items():
                setattr(instance, attr, value)

            # 進捗率が更新された場合、親タスクの進捗率を自動更新
            if 'progress_rate' in validated_data:
                self._update_parent_progress(instance)

            instance.save()

            # タスク担当者を更新
            if assigned_users is not None:
                # プロジェクトメンバーかチェック
                from apps.projects.models import ProjectMember
                for user_id in assigned_users:
                    if not ProjectMember.objects.filter(
                        project=instance.project, user_id=user_id
                    ).exists():
                        raise serializers.ValidationError(
                            f"ユーザーID {user_id} はプロジェクトメンバーではありません"
                        )

                # 既存の担当者を削除
                instance.assignments.all().delete()
                # 新しい担当者を追加
                for user_id in assigned_users:
                    TaskAssignment.objects.create(task=instance, user_id=user_id)

            # タスク依存関係を更新
            if predecessor_tasks is not None:
                # 既存の依存関係を削除（このタスクが後続タスクの場合）
                instance.dependencies_as_successor.all().delete()
                # 新しい依存関係を追加（循環依存チェック付き）
                for predecessor_id in predecessor_tasks:
                    predecessor = Task.objects.filter(
                        id=predecessor_id, project=instance.project
                    ).first()
                    if not predecessor:
                        raise serializers.ValidationError(
                            f"先行タスクID {predecessor_id} が見つかりません"
                        )

                    # 循環依存チェック
                    if self._creates_circular_dependency(predecessor_id, instance.id):
                        raise serializers.ValidationError(
                            "循環依存が発生するため更新できません"
                        )

                    TaskDependency.objects.create(
                        predecessor=predecessor,
                        successor=instance,
                        dependency_type='finish_to_start'
                    )

        # 更新後のインスタンスをリロード（関連データも含めて）
        instance.refresh_from_db()

        # 関連データをプリフェッチして完全なデータを返す
        from django.db import models
        instance = Task.objects.select_related(
            'project', 'parent_task'
        ).prefetch_related(
            'assignments__user',
            'dependencies_as_successor__predecessor',
            'dependencies_as_predecessor__successor'
        ).get(id=instance.id)

        return instance

    def _creates_circular_dependency(self, predecessor_id: int, successor_id: int) -> bool:
        """循環依存チェック"""
        visited = set()
        stack = [successor_id]

        while stack:
            current_id = stack.pop()
            if current_id in visited:
                continue
            visited.add(current_id)

            if current_id == predecessor_id:
                return True

            dependencies = TaskDependency.objects.filter(
                successor_id=current_id
            ).values_list('predecessor_id', flat=True)

            for dep_id in dependencies:
                if dep_id not in visited:
                    stack.append(dep_id)

        return False

    def _update_parent_progress(self, task):
        """親タスクの進捗率を子タスクの平均から自動算出・更新"""
        if not task.parent_task_id:
            return

        parent_task = task.parent_task
        if not parent_task:
            return

        # 親タスクの全子タスクの進捗率を取得
        subtasks = Task.objects.filter(parent_task_id=parent_task.id)

        if not subtasks.exists():
            return

        # 子タスクの進捗率の平均を計算
        total_progress = sum(subtask.progress_rate for subtask in subtasks)
        average_progress = int(total_progress / subtasks.count())

        # 親タスクの進捗率を更新
        parent_task.progress_rate = average_progress
        parent_task.save()

        # さらに上位の親タスクも再帰的に更新
        self._update_parent_progress(parent_task)