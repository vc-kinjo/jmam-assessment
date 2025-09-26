"""Add task level for subtask hierarchy support

Revision ID: 003
Revises: 002
Create Date: 2025-08-27 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    # Add level column to tasks table
    op.add_column('tasks', sa.Column('level', sa.Integer(), nullable=False, server_default='0'))
    
    # Update existing tasks to have level 0 (root level) if they don't have parent
    # and calculate level based on parent hierarchy
    op.execute("""
        UPDATE tasks SET level = 0 WHERE parent_task_id IS NULL;
        
        -- Update level 1 tasks (direct subtasks)
        UPDATE tasks SET level = 1 WHERE parent_task_id IN (
            SELECT id FROM tasks WHERE parent_task_id IS NULL
        );
        
        -- Update level 2 tasks (sub-subtasks)
        UPDATE tasks SET level = 2 WHERE parent_task_id IN (
            SELECT id FROM tasks WHERE level = 1
        );
        
        -- Update level 3 tasks (sub-sub-subtasks)
        UPDATE tasks SET level = 3 WHERE parent_task_id IN (
            SELECT id FROM tasks WHERE level = 2
        );
    """)


def downgrade():
    # Remove level column
    op.drop_column('tasks', 'level')