from fastapi import APIRouter

from app.controller.expenses import router as expenses_router
from app.controller.health import router as health_router
from app.controller.manager import router as manager_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(expenses_router, prefix="/api/expenses", tags=["expenses"])
api_router.include_router(manager_router, prefix="/api/manager", tags=["manager"])

__all__ = ["api_router"]
