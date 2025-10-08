from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError
from app.api import auth, users, projects, tasks
from app.database.connection import engine
from app.models import user, project, task
from app.utils.exceptions import (
    GunchartException, 
    gunchart_exception_handler,
    sqlalchemy_exception_handler,
    general_exception_handler
)

app = FastAPI(
    title="Gunchart Backend API",
    description="Backend API - Gunchart Project Management System",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3004", 
        "http://localhost:3005",  # Frontend URL (current port)
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3004",
        "http://127.0.0.1:3005",
        "http://localhost:8001"  # BFF access
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
# user.Base.metadata.create_all(bind=engine)
# project.Base.metadata.create_all(bind=engine)
# task.Base.metadata.create_all(bind=engine)

# Add exception handlers
app.add_exception_handler(GunchartException, gunchart_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])

@app.get("/")
async def root():
    return {"message": "Gunchart Backend API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}