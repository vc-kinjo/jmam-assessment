from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class Task(models.Model):
    class Meta:
        db_table = "tasks"
        ordering = ['sort_order', 'created_at']

    PRIORITY_CHOICES = [
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]

    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('on_hold', 'On Hold'),
    ]

    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='tasks'
    )
    parent_task = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='subtasks'
    )
    level = models.IntegerField(default=0)
    name = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    planned_start_date = models.DateField(null=True, blank=True)
    planned_end_date = models.DateField(null=True, blank=True)
    actual_start_date = models.DateField(null=True, blank=True)
    actual_end_date = models.DateField(null=True, blank=True)
    estimated_hours = models.IntegerField(default=0)
    actual_hours = models.IntegerField(default=0)
    progress_rate = models.IntegerField(default=0, validators=[
        MinValueValidator(0),
        MaxValueValidator(100)
    ])
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    is_milestone = models.BooleanField(default=False)
    category = models.CharField(max_length=50, blank=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @property
    def task_group_root_id(self):
        """タスクグループのルートIDを取得"""
        current = self
        while current.parent_task_id is not None:
            current = current.parent_task
        return current.id

    @property
    def duration_days(self):
        """計画期間の日数を計算"""
        if self.planned_start_date and self.planned_end_date:
            return (self.planned_end_date - self.planned_start_date).days + 1
        return 0

    def get_all_descendants(self):
        """すべての子孫タスクを取得"""
        descendants = list(self.subtasks.all())
        for subtask in self.subtasks.all():
            descendants.extend(subtask.get_all_descendants())
        return descendants


class TaskAssignment(models.Model):
    class Meta:
        db_table = "tasks_assignments"
        constraints = [
            models.UniqueConstraint(fields=['task', 'user'], name='unique_task_user')
        ]

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='assignments')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='task_assignments'
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.task.name}"


class TaskDependency(models.Model):
    class Meta:
        db_table = "tasks_dependency"
        constraints = [
            models.UniqueConstraint(fields=['predecessor', 'successor'], name='unique_predecessor_successor')
        ]

    DEPENDENCY_CHOICES = [
        ('finish_to_start', 'Finish to Start'),
        ('start_to_start', 'Start to Start'),
        ('finish_to_finish', 'Finish to Finish'),
        ('start_to_finish', 'Start to Finish'),
    ]

    predecessor = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='dependencies_as_predecessor'
    )
    successor = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='dependencies_as_successor'
    )
    dependency_type = models.CharField(
        max_length=20,
        choices=DEPENDENCY_CHOICES,
        default='finish_to_start'
    )
    lag_days = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.predecessor.name} -> {self.successor.name}"


class TaskComment(models.Model):
    class Meta:
        db_table = "tasks_comments"
        ordering = ['-created_at']

    """タスクコメント"""
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='task_comments'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.task.name} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"


class TaskAttachment(models.Model):
    class Meta:
        db_table = "tasks_attachments"
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='attachments')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='task_attachments'
    )
    file = models.FileField(upload_to='task_attachments/%Y/%m/')
    original_filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField()
    content_type = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.task.name} - {self.original_filename}"