"""
Initial data seeding for the database
"""
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.models.user import User
from app.models.project import Project
from app.models.task import Task
from app.database.connection import SessionLocal
from datetime import date, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_user():
    """Create initial admin user"""
    db = SessionLocal()
    try:
        # Check if admin user already exists
        admin_user = db.query(User).filter(User.username == "admin").first()
        if admin_user:
            print("Admin user already exists")
            return
        
        # Create admin user
        hashed_password = pwd_context.hash("admin123")  # Change in production
        admin = User(
            username="admin",
            email="admin@gunchart.com",
            password_hash=hashed_password,
            full_name="Admin User",
            furigana="アドミンユーザー",
            company="Gunchart Inc.",
            department="System Administration",
            role_level="admin",
            is_active=True
        )
        
        db.add(admin)
        db.commit()
        print("Admin user created successfully")
        print("Username: admin")
        print("Password: admin123")
        
    except Exception as e:
        print(f"Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

def create_sample_projects():
    """Create sample projects"""
    db = SessionLocal()
    try:
        # Check if projects already exist
        existing_projects = db.query(Project).first()
        if existing_projects:
            print("Sample projects already exist")
            return

        # Get admin user
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            print("Admin user not found, cannot create sample projects")
            return

        # Create sample projects
        projects = [
            {
                "name": "Webサイトリニューアル",
                "description": "会社のWebサイトを全面的にリニューアルするプロジェクトです。",
                "start_date": date.today(),
                "end_date": date.today() + timedelta(days=90),
                "category": "Web開発",
                "status": "active",
                "created_by": admin_user.id
            },
            {
                "name": "モバイルアプリ開発",
                "description": "iOS/Androidモバイルアプリケーションの開発プロジェクトです。",
                "start_date": date.today() - timedelta(days=30),
                "end_date": date.today() + timedelta(days=60),
                "category": "アプリ開発",
                "status": "active",
                "created_by": admin_user.id
            },
            {
                "name": "システム移行プロジェクト",
                "description": "既存システムからクラウドベースシステムへの移行。",
                "start_date": date.today() + timedelta(days=7),
                "end_date": date.today() + timedelta(days=120),
                "category": "インフラ",
                "status": "active",
                "created_by": admin_user.id
            }
        ]

        for project_data in projects:
            project = Project(**project_data)
            db.add(project)

        db.commit()
        print("Sample projects created successfully")

    except Exception as e:
        print(f"Error creating sample projects: {e}")
        db.rollback()
    finally:
        db.close()

def seed_data():
    """Run all seeding functions"""
    print("Seeding database...")
    create_admin_user()
    create_sample_projects()
    print("Database seeding completed")

if __name__ == "__main__":
    seed_data()