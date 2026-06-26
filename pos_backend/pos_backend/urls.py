from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api import views

router = DefaultRouter()
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'orders', views.OrderViewSet, basename='order')
router.register(r'users', views.UserViewSet, basename='user')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/login/', views.login_view),
    path('api/v1/auth/refresh/', views.refresh_view),
    path('api/v1/auth/logout/', views.logout_view),
    path('api/v1/reports/summary/', views.report_summary),
    path('api/v1/reports/low-stock/', views.report_low_stock),
    path('api/v1/', include(router.urls)),
]
