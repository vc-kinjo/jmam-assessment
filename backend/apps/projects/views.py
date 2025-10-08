from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.db import transaction
from .models import Project, ProjectMember
from .serializers import (
    ProjectSerializer, ProjectListSerializer, ProjectCreateSerializer,
    ProjectMemberSerializer
)
import logging

logger = logging.getLogger(__name__)


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return ProjectListSerializer
        elif self.action == 'create':
            return ProjectCreateSerializer
        return ProjectSerializer

    def get_queryset(self):
        user = self.request.user
        # 管理者は全プロジェクト、それ以外はメンバーのプロジェクトのみ
        if user.role_level == 'admin':
            return Project.objects.all().select_related('created_by').prefetch_related('members__user')
        else:
            return Project.objects.filter(
                Q(members__user=user) | Q(created_by=user)
            ).distinct().select_related('created_by').prefetch_related('members__user')

    def create(self, request, *args, **kwargs):
        """プロジェクト作成"""
        try:
            logger.info(f"Creating project for user: {request.user}")
            logger.info(f"Request data: {request.data}")

            # バリデーション用のシリアライザ
            create_serializer = self.get_serializer(data=request.data)
            create_serializer.is_valid(raise_exception=True)

            # トランザクション内で実行
            with transaction.atomic():
                # プロジェクト作成
                project = create_serializer.save(created_by=request.user)
                logger.info(f"Project created with ID: {project.id}")

                # プロジェクト作成者をマネージャーとして追加
                member, created = ProjectMember.objects.get_or_create(
                    project=project,
                    user=request.user,
                    defaults={'role': 'manager'}
                )
                logger.info(f"Project member created: {created}, Member: {member}")

                # レスポンス用のシリアライザで完全なデータを返す
                response_serializer = ProjectSerializer(project)
                logger.info(f"Response data: {response_serializer.data}")

                return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error creating project: {str(e)}")
            return Response(
                {'error': 'プロジェクトの作成に失敗しました', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get', 'post'])
    def members(self, request, pk=None):
        """プロジェクトメンバー管理"""
        project = self.get_object()

        if request.method == 'GET':
            members = project.members.all().select_related('user')
            serializer = ProjectMemberSerializer(members, many=True)
            return Response(serializer.data)

        elif request.method == 'POST':
            # プロジェクトマネージャーのみメンバー追加可能
            project_member = project.members.filter(user=request.user).first()
            if not project_member or project_member.role not in ['manager'] and request.user.role_level != 'admin':
                return Response(
                    {'error': 'メンバーを追加する権限がありません。'},
                    status=status.HTTP_403_FORBIDDEN
                )

            serializer = ProjectMemberSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(project=project)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'])
    def remove_member(self, request, pk=None):
        """メンバー削除"""
        project = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response(
                {'error': 'user_idが必要です。'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # プロジェクトマネージャーのみメンバー削除可能
        project_member = project.members.filter(user=request.user).first()
        if not project_member or project_member.role not in ['manager'] and request.user.role_level != 'admin':
            return Response(
                {'error': 'メンバーを削除する権限がありません。'},
                status=status.HTTP_403_FORBIDDEN
            )

        member_to_remove = project.members.filter(user_id=user_id).first()
        if member_to_remove:
            member_to_remove.delete()
            return Response({'message': 'メンバーを削除しました。'})
        else:
            return Response(
                {'error': 'メンバーが見つかりません。'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def my_projects(self, request):
        """自分がメンバーのプロジェクト一覧"""
        projects = Project.objects.filter(
            Q(members__user=request.user) | Q(created_by=request.user)
        ).distinct()
        serializer = ProjectListSerializer(projects, many=True)
        return Response(serializer.data)