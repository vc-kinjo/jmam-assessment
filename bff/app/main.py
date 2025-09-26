from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
from app.api import auth, auth_simple, users, projects, tasks, test_debug
from app.utils.exceptions import (
    BFFException,
    bff_exception_handler,
    httpx_exception_handler,
    general_exception_handler
)

app = FastAPI(
    title="Gunchart BFF API",
    description="Backend for Frontend - Gunchart Project Management System",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001",  # Frontend URL (new dev port)
        "http://localhost:3004",  # Frontend URL (alternative port)
        "http://localhost:3005",  # Frontend URL (current port)
        "http://localhost:3006",  # Frontend URL (new port)
        "http://localhost:3007",  # Frontend URL (latest port)
        "http://localhost:3008",  # Frontend URL (final port)
        "http://localhost:8888",  # Frontend URL (clean port)
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3004",
        "http://127.0.0.1:3005",
        "http://127.0.0.1:3006",
        "http://127.0.0.1:3007",
        "http://127.0.0.1:3008",
        "http://127.0.0.1:8888"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add exception handlers
app.add_exception_handler(BFFException, bff_exception_handler)
app.add_exception_handler(httpx.HTTPError, httpx_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(auth_simple.router, prefix="/api/v1/auth", tags=["authentication-simple"])
app.include_router(test_debug.router, prefix="/api/v1/debug", tags=["debug"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["tasks"])

@app.get("/")
async def root():
    return {"message": "Gunchart BFF API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}