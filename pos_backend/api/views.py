from django.db import transaction
from django.db.models import Q, Sum, Count
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.conf import settings
import decimal
import datetime

from .models import User, Category, Product, Order, OrderItem
from .serializers import (
    UserSerializer, CategorySerializer, ProductSerializer,
    OrderSerializer, CreateOrderSerializer
)


def success(data, status_code=200, meta=None):
    body = {'success': True, 'data': data}
    if meta:
        body['meta'] = meta
    return Response(body, status=status_code)


def error(code, message, status_code=400, details=None):
    body = {'success': False, 'error': {'code': code, 'message': message}}
    if details:
        body['error']['details'] = details
    return Response(body, status=status_code)


# ── Auth ──────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if not user or not user.is_active:
        return error('UNAUTHORIZED', 'Invalid credentials.', 401)
    refresh = RefreshToken.for_user(user)
    return success({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id, 'username': user.username,
            'full_name': user.full_name, 'role': user.role
        }
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_view(request):
    try:
        refresh = RefreshToken(request.data.get('refresh'))
        return success({'access': str(refresh.access_token)})
    except Exception:
        return error('UNAUTHORIZED', 'Invalid refresh token.', 401)


@api_view(['POST'])
def logout_view(request):
    try:
        RefreshToken(request.data.get('refresh')).blacklist()
    except Exception:
        pass
    return Response(status=204)


# ── Categories ────────────────────────────────────────────────────────────────

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def list(self, request):
        return success(CategorySerializer(self.queryset, many=True).data)

    def create(self, request):
        s = CategorySerializer(data=request.data)
        if not s.is_valid():
            return error('VALIDATION_ERROR', 'Invalid data.', 422, s.errors)
        s.save()
        return success(s.data, 201)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        s = CategorySerializer(instance, data=request.data, partial=True)
        if not s.is_valid():
            return error('VALIDATION_ERROR', 'Invalid data.', 422, s.errors)
        s.save()
        return success(s.data)

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return Response(status=204)


# ── Products ──────────────────────────────────────────────────────────────────

class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Product.objects.select_related('category').filter(is_active=True)
        q = self.request.query_params
        if q.get('search'):
            qs = qs.filter(Q(name__icontains=q['search']) | Q(sku__icontains=q['search']))
        if q.get('category_id'):
            qs = qs.filter(category_id=q['category_id'])
        if q.get('in_stock') == 'true':
            qs = qs.filter(stock__gt=0)
        return qs.order_by('name')

    def list(self, request):
        page = int(request.query_params.get('page', 1))
        size = min(int(request.query_params.get('page_size', 20)), 100)
        qs = self.get_queryset()
        total = qs.count()
        items = qs[(page - 1) * size: page * size]
        return success(
            ProductSerializer(items, many=True).data,
            meta={'page': page, 'page_size': size, 'total': total, 'total_pages': -(-total // size)}
        )

    def retrieve(self, request, pk=None):
        try:
            p = Product.objects.select_related('category').get(pk=pk)
        except Product.DoesNotExist:
            return error('NOT_FOUND', 'Product not found.', 404)
        return success(ProductSerializer(p).data)

    def create(self, request):
        s = ProductSerializer(data=request.data)
        if not s.is_valid():
            return error('VALIDATION_ERROR', 'Invalid data.', 422, s.errors)
        s.save()
        return success(s.data, 201)

    def partial_update(self, request, pk=None):
        try:
            p = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return error('NOT_FOUND', 'Product not found.', 404)
        s = ProductSerializer(p, data=request.data, partial=True)
        if not s.is_valid():
            return error('VALIDATION_ERROR', 'Invalid data.', 422, s.errors)
        s.save()
        return success(s.data)

    def destroy(self, request, pk=None):
        try:
            p = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return error('NOT_FOUND', 'Product not found.', 404)
        p.is_active = False
        p.save()
        return Response(status=204)


# ── Orders ────────────────────────────────────────────────────────────────────

def generate_order_number():
    today = timezone.now().strftime('%Y%m%d')
    count = Order.objects.filter(created_at__date=timezone.now().date()).count() + 1
    return f"ORD-{today}-{count:04d}"


class OrderViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        qs = Order.objects.select_related('cashier').order_by('-created_at')
        q = request.query_params
        if q.get('date'):
            qs = qs.filter(created_at__date=q['date'])
        if q.get('date_from'):
            qs = qs.filter(created_at__date__gte=q['date_from'])
        if q.get('date_to'):
            qs = qs.filter(created_at__date__lte=q['date_to'])
        if q.get('status'):
            qs = qs.filter(status=q['status'])
        if q.get('cashier_id'):
            qs = qs.filter(cashier_id=q['cashier_id'])
        page = int(q.get('page', 1))
        size = min(int(q.get('page_size', 20)), 100)
        total = qs.count()
        items = qs[(page - 1) * size: page * size]
        return success(
            OrderSerializer(items, many=True).data,
            meta={'page': page, 'page_size': size, 'total': total, 'total_pages': -(-total // size)}
        )

    def retrieve(self, request, pk=None):
        try:
            o = Order.objects.select_related('cashier', 'voided_by').prefetch_related('items').get(pk=pk)
        except Order.DoesNotExist:
            return error('NOT_FOUND', 'Order not found.', 404)
        return success(OrderSerializer(o).data)

    def create(self, request):
        s = CreateOrderSerializer(data=request.data)
        if not s.is_valid():
            return error('VALIDATION_ERROR', 'Invalid data.', 422, s.errors)
        data = s.validated_data

        with transaction.atomic():
            order_items = []
            subtotal = decimal.Decimal('0')

            for item_data in data['items']:
                try:
                    product = Product.objects.select_for_update().get(pk=item_data['product_id'], is_active=True)
                except Product.DoesNotExist:
                    return error('NOT_FOUND', f"Product {item_data['product_id']} not found.", 404)
                if product.stock < item_data['quantity']:
                    return error('CONFLICT', f"Insufficient stock for '{product.name}'. Available: {product.stock}.", 409)
                line = product.price * item_data['quantity']
                subtotal += line
                order_items.append((product, item_data['quantity'], product.price, line))

            tax_rate = decimal.Decimal(str(settings.POS_TAX_RATE))
            tax = (subtotal * tax_rate).quantize(decimal.Decimal('0.01'))
            total = subtotal + tax
            change = (data['amount_tendered'] - total).quantize(decimal.Decimal('0.01'))

            order = Order.objects.create(
                order_number=generate_order_number(),
                cashier=request.user,
                subtotal=subtotal,
                tax=tax,
                total=total,
                payment_method=data['payment_method'],
                amount_tendered=data['amount_tendered'],
                change=change,
                customer_name=data.get('customer_name', ''),
                note=data.get('note', ''),
                status='completed',
            )

            for product, qty, price, line in order_items:
                OrderItem.objects.create(
                    order=order, product=product,
                    product_name=product.name,
                    quantity=qty, unit_price=price, subtotal=line
                )
                product.stock -= qty
                product.save()

        order.refresh_from_db()
        return success(OrderSerializer(Order.objects.select_related('cashier').prefetch_related('items').get(pk=order.pk)).data, 201)

    @action(detail=True, methods=['post'])
    def void(self, request, pk=None):
        if request.user.role != 'admin':
            return error('FORBIDDEN', 'Only admins can void orders.', 403)
        try:
            order = Order.objects.prefetch_related('items__product').get(pk=pk)
        except Order.DoesNotExist:
            return error('NOT_FOUND', 'Order not found.', 404)
        if order.status == 'voided':
            return error('CONFLICT', 'Order already voided.', 409)

        with transaction.atomic():
            for item in order.items.all():
                if item.product:
                    item.product.stock += item.quantity
                    item.product.save()
            order.status = 'voided'
            order.voided_by = request.user
            order.void_reason = request.data.get('reason', '')
            order.voided_at = timezone.now()
            order.save()

        return success(OrderSerializer(order).data)


# ── Reports ───────────────────────────────────────────────────────────────────

@api_view(['GET'])
def report_summary(request):
    qs = Order.objects.filter(status='completed')
    q = request.query_params
    date_from = q.get('date_from') or q.get('date')
    date_to = q.get('date_to') or q.get('date')
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    agg = qs.aggregate(
        total_orders=Count('id'),
        total_revenue=Sum('total'),
        total_tax=Sum('tax'),
    )

    voided = Order.objects.filter(status='voided')
    if date_from:
        voided = voided.filter(created_at__date__gte=date_from)
    if date_to:
        voided = voided.filter(created_at__date__lte=date_to)
    v_agg = voided.aggregate(count=Count('id'), revenue=Sum('total'))

    pay_breakdown = {}
    for pm in ['cash', 'mpesa', 'card']:
        val = qs.filter(payment_method=pm).aggregate(t=Sum('total'))['t'] or 0
        pay_breakdown[pm] = str(val)

    top_products = (
        OrderItem.objects.filter(order__in=qs)
        .values('product_id', 'product_name')
        .annotate(quantity_sold=Sum('quantity'), revenue=Sum('subtotal'))
        .order_by('-revenue')[:5]
    )

    return success({
        'period': {'from': date_from, 'to': date_to},
        'total_orders': agg['total_orders'] or 0,
        'total_revenue': str(agg['total_revenue'] or 0),
        'total_tax': str(agg['total_tax'] or 0),
        'voided_orders': v_agg['count'] or 0,
        'voided_revenue': str(v_agg['revenue'] or 0),
        'payment_breakdown': pay_breakdown,
        'top_products': list(top_products),
    })


@api_view(['GET'])
def report_low_stock(request):
    from django.db.models import F
    items = Product.objects.filter(is_active=True, stock__lte=F('low_stock_threshold'))
    return success(ProductSerializer(items, many=True).data)


# ── Users ─────────────────────────────────────────────────────────────────────

class UserViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        if request.user.role != 'admin':
            return error('FORBIDDEN', 'Admins only.', 403)
        users = User.objects.all().order_by('username')
        return success(UserSerializer(users, many=True).data)

    def create(self, request):
        if request.user.role != 'admin':
            return error('FORBIDDEN', 'Admins only.', 403)
        s = UserSerializer(data=request.data)
        if not s.is_valid():
            return error('VALIDATION_ERROR', 'Invalid data.', 422, s.errors)
        s.save()
        return success(s.data, 201)

    def partial_update(self, request, pk=None):
        if request.user.role != 'admin':
            return error('FORBIDDEN', 'Admins only.', 403)
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return error('NOT_FOUND', 'User not found.', 404)
        s = UserSerializer(user, data=request.data, partial=True)
        if not s.is_valid():
            return error('VALIDATION_ERROR', 'Invalid data.', 422, s.errors)
        s.save()
        return success(s.data)

    def destroy(self, request, pk=None):
        if request.user.role != 'admin':
            return error('FORBIDDEN', 'Admins only.', 403)
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return error('NOT_FOUND', 'User not found.', 404)
        user.is_active = False
        user.save()
        return Response(status=204)

    @action(detail=True, methods=['post'], url_path='change-password')
    def change_password(self, request, pk=None):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return error('NOT_FOUND', 'User not found.', 404)
        if request.user.role != 'admin' and request.user.pk != user.pk:
            return error('FORBIDDEN', 'Cannot change another user\'s password.', 403)
        new_password = request.data.get('new_password')
        if not new_password:
            return error('VALIDATION_ERROR', 'new_password is required.', 422)
        user.set_password(new_password)
        user.save()
        return success({'message': 'Password updated.'})
