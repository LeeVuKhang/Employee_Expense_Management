from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.controller import api_router
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
    )

    # Enable CORS for frontend API calls
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Trong thực tế nên đổi thành domain cụ thể của frontend
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)
    return app


app = create_app()

