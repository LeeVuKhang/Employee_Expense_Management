from fastapi import APIRouter

from app.controller.categories import router as categories_router
from app.controller.expenses import router as expenses_router
from app.controller.finance import router as finance_router
from app.controller.health import router as health_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(categories_router, prefix="/api", tags=["categories"])
api_router.include_router(expenses_router, prefix="/api/expenses", tags=["expenses"])
api_router.include_router(finance_router, prefix="/api/finance", tags=["finance"])

__all__ = ["api_router"]
