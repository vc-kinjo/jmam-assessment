from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Prefetch
from .models import Task, TaskAssignment, TaskDependency, TaskComment, TaskAttachment
from .serializers import (
    TaskSerializer, TaskListSerializer, TaskGanttSerializer,
    TaskCreateSerializer, TaskUpdateSerializer, TaskAssignmentSerializer,
    TaskDependencySerializer, TaskCommentSerializer, TaskAttachmentSerializer
)


class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return TaskListSerializer
        elif self.action == 'create':
            return TaskCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TaskUpdateSerializer
        elif self.action == 'gantt_data':
            return TaskGanttSerializer
        return TaskSerializer

    def get_queryset(self):
        user = self.request.user
        # プロジェクトメンバーのタスクのみ表示
        queryset = Task.objects.filter(
            Q(project__members__user=user) | Q(project__created_by=user)
        ).distinct().select_related(
            'project', 'parent_task'
        ).prefetch_related(
            'assignments__user',
            'subtasks',
            'comments__user',
            'dependencies_as_successor__predecessor',
            'dependencies_as_predecessor__successor'
        )

        # project_idパラメータによるフィルタリング
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        return queryset

    def create(self, request, *args, **kwargs):
        """タスク作成"""
        # 作成権限チェック
        project_id = request.data.get('project')
        if project_id and not self._can_modify_project(project_id, request.user):
            return Response(
                {'error': 'タスクを作成する権限がありません'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # タスクを作成
        created_task = serializer.save()

        # レスポンス用にTaskSerializerを使用して完全なデータを返す
        response_serializer = TaskSerializer(created_task)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def gantt_data(self, request):
        """ガントチャート用データ取得"""
        project_id = request.query_params.get('project_id')
        if not project_id:
            return Response(
                {'error': 'project_idが必要です。'},
                status=status.HTTP_400_BAD_REQUEST
            )

        tasks = self.get_queryset().filter(project_id=project_id)
        serializer = self.get_serializer(tasks, many=True)

        # DHtmlX Gantt用のリンクデータを作成
        links = []
        dependencies = TaskDependency.objects.filter(
            predecessor__project_id=project_id,
            successor__project_id=project_id
        )

        for dep in dependencies:
            links.append({
                'id': dep.id,
                'source': dep.predecessor_id,
                'target': dep.successor_id,
                'type': dep.dependency_type,
                'lag': dep.lag_days
            })

        return Response({
            'data': serializer.data,
            'links': links
        })

    def update(self, request, *args, **kwargs):
        """タスク更新"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        # 更新権限チェック
        if not self._can_modify_project(instance.project.id, request.user):
            return Response(
                {'error': 'タスクを更新する権限がありません'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        # 更新を実行
        updated_instance = serializer.save()

        # レスポンス用にTaskSerializerを使用して完全なデータを返す
        response_serializer = TaskSerializer(updated_instance)
        return Response(response_serializer.data)

    def destroy(self, request, *args, **kwargs):
        """タスク削除"""
        instance = self.get_object()

        # 削除権限チェック
        if not self._can_modify_project(instance.project.id, request.user):
            return Response(
                {'error': 'タスクを削除する権限がありません'},
                status=status.HTTP_403_FORBIDDEN
            )

        # 子タスクがある場合は削除不可
        subtasks_count = Task.objects.filter(parent_task_id=instance.id).count()
        if subtasks_count > 0:
            return Response(
                {'error': '子タスクがあるため削除できません'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 依存関係がある場合の処理
        predecessor_dependencies = instance.dependencies_as_predecessor.count()
        successor_dependencies = instance.dependencies_as_successor.count()

        if predecessor_dependencies > 0 or successor_dependencies > 0:
            return Response(
                {
                    'error': 'このタスクには依存関係が設定されているため削除できません。先に依存関係を削除してください。',
                    'details': {
                        'successor_dependencies': successor_dependencies,
                        'predecessor_dependencies': predecessor_dependencies
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {
                    'error': 'タスクの削除中にエラーが発生しました',
                    'detail': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def update_schedule(self, request, pk=None):
        """スケジュール更新（ガントチャートから）"""
        task = self.get_object()
        serializer = TaskUpdateSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            updated_task = serializer.save()
            # レスポンス用にTaskSerializerを使用
            response_serializer = TaskSerializer(updated_task)
            return Response(response_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get', 'post'])
    def assignments(self, request, pk=None):
        """タスク担当者管理"""
        task = self.get_object()

        if request.method == 'GET':
            assignments = task.assignments.all().select_related('user')
            serializer = TaskAssignmentSerializer(assignments, many=True)
            return Response(serializer.data)

        elif request.method == 'POST':
            serializer = TaskAssignmentSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(task=task)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'])
    def remove_assignment(self, request, pk=None):
        """担当者削除"""
        task = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response(
                {'error': 'user_idが必要です。'},
                status=status.HTTP_400_BAD_REQUEST
            )

        assignment = task.assignments.filter(user_id=user_id).first()
        if assignment:
            assignment.delete()
            return Response({'message': '担当者を削除しました。'})
        else:
            return Response(
                {'error': '担当者が見つかりません。'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get', 'post'])
    def dependencies(self, request, pk=None):
        """タスク依存関係管理"""
        task = self.get_object()

        if request.method == 'GET':
            predecessors = task.dependencies_as_successor.all()
            successors = task.dependencies_as_predecessor.all()
            return Response({
                'predecessors': TaskDependencySerializer(predecessors, many=True).data,
                'successors': TaskDependencySerializer(successors, many=True).data
            })

        elif request.method == 'POST':
            serializer = TaskDependencySerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'])
    def remove_dependency(self, request, pk=None):
        """先行タスク削除"""
        task = self.get_object()
        predecessor_id = request.data.get('predecessor_id')

        if not predecessor_id:
            return Response(
                {'error': 'predecessor_idが必要です。'},
                status=status.HTTP_400_BAD_REQUEST
            )

        dependency = task.dependencies_as_successor.filter(predecessor_id=predecessor_id).first()
        if dependency:
            dependency.delete()
            return Response({'message': '先行タスクを削除しました。'})
        else:
            return Response(
                {'error': '指定された先行タスクが見つかりません。'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get', 'post'])
    def comments(self, request, pk=None):
        """タスクコメント管理"""
        task = self.get_object()

        if request.method == 'GET':
            comments = task.comments.all().select_related('user')
            serializer = TaskCommentSerializer(comments, many=True)
            return Response(serializer.data)

        elif request.method == 'POST':
            serializer = TaskCommentSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                serializer.save(task=task)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get', 'post'])
    def attachments(self, request, pk=None):
        """タスク添付ファイル管理"""
        task = self.get_object()

        if request.method == 'GET':
            attachments = task.attachments.all().select_related('user')
            serializer = TaskAttachmentSerializer(attachments, many=True)
            return Response(serializer.data)

        elif request.method == 'POST':
            serializer = TaskAttachmentSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                serializer.save(task=task)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def my_tasks(self, request):
        """自分が担当のタスク一覧"""
        tasks = self.get_queryset().filter(assignments__user=request.user)
        serializer = TaskListSerializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def hierarchy(self, request):
        """階層構造でタスク取得"""
        project_id = request.query_params.get('project_id')
        if not project_id:
            return Response(
                {'error': 'project_idが必要です。'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ルートタスク（parent_task_id=None）から階層的に取得
        root_tasks = self.get_queryset().filter(
            project_id=project_id,
            parent_task_id=None
        ).order_by('sort_order')

        def build_hierarchy(tasks):
            result = []
            for task in tasks:
                task_data = TaskListSerializer(task).data
                subtasks = task.subtasks.all().order_by('sort_order')
                if subtasks:
                    task_data['children'] = build_hierarchy(subtasks)
                result.append(task_data)
            return result

        hierarchy_data = build_hierarchy(root_tasks)
        return Response(hierarchy_data)

    def _can_modify_project(self, project_id: int, user) -> bool:
        """プロジェクト変更権限チェック"""
        if user.is_superuser:
            return True

        from apps.projects.models import Project, ProjectMember

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return False

        # プロジェクト作成者かチェック
        if project.created_by == user:
            return True

        # プロジェクトメンバーでマネージャー権限があるかチェック
        try:
            member = ProjectMember.objects.get(project_id=project_id, user=user)
            return member.role == 'manager'
        except ProjectMember.DoesNotExist:
            return False

    @action(detail=False, methods=['get'])
    def valid_predecessors(self, request):
        """有効な先行タスク一覧を取得"""
        task_id = request.query_params.get('task_id')
        if not task_id:
            return Response(
                {'error': 'task_idが必要です。'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            task = self.get_queryset().get(id=task_id)
        except Task.DoesNotExist:
            return Response(
                {'error': 'タスクが見つかりません。'},
                status=status.HTTP_404_NOT_FOUND
            )

        valid_predecessors = []

        if task.level == 0:
            # ルートタスクの場合、同じプロジェクト内の他のルートタスクが対象
            root_tasks = self.get_queryset().filter(
                project=task.project,
                level=0
            ).exclude(id=task.id)
            valid_predecessors = list(root_tasks)
        else:
            # サブタスクの場合、同じ親を持つタスクと上位階層のタスクが対象
            if task.parent_task:
                # 同じ親を持つ兄弟タスク
                siblings = self.get_queryset().filter(
                    parent_task=task.parent_task
                ).exclude(id=task.id)
                valid_predecessors.extend(list(siblings))

                # 親タスクとその祖先
                current_parent = task.parent_task
                while current_parent:
                    valid_predecessors.append(current_parent)
                    current_parent = current_parent.parent_task

        # シリアライズして返す
        serializer = TaskListSerializer(valid_predecessors, many=True)
        return Response(serializer.data)