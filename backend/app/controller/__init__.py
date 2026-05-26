from fastapi import APIRouter

from app.controller.auth import router as auth_router
from app.controller.categories import router as categories_router
from app.controller.expenses import router as expenses_router
from app.controller.finance import router as finance_router
from app.controller.health import router as health_router
from app.controller.manager import router as manager_router
from app.controller.notifications import router as notifications_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router, prefix="/api/auth", tags=["auth"])
api_router.include_router(categories_router, prefix="/api", tags=["categories"])
api_router.include_router(expenses_router, prefix="/api/expenses", tags=["expenses"])
api_router.include_router(finance_router, prefix="/api/finance", tags=["finance"])
api_router.include_router(manager_router, prefix="/api/manager", tags=["manager"])
api_router.include_router(notifications_router, prefix="/api/notifications", tags=["notifications"])

__all__ = ["api_router"]
