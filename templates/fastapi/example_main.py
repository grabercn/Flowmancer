# Example: templates/fastapi/example_main.py
from fastapi import FastAPI
from . import models # Assuming models.py will be generated
from .database import engine # Assuming database.py will be generated
# Import routers for each entity
# from .routers import user_router, post_router # Example

# Create database tables (if they don't exist)
# models.Base.metadata.create_all(bind=engine) # If using SQLAlchemy

app = FastAPI(title="Generated FastAPI App", version="0.1.0")

@app.get("/")
async def read_root():
    return {"message": "Welcome to the auto-generated FastAPI application!"}

# Include routers from generated router files
# app.include_router(user_router.router, prefix="/users", tags=["Users"])
# app.include_router(post_router.router, prefix="/posts", tags=["Posts"])

# Add other common middleware or configurations if desired
# from fastapi.middleware.cors import CORSMiddleware
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )