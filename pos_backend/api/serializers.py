from rest_framework import serializers
from .models import User, Category, Product, Order, OrderItem


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'role', 'is_active', 'password', 'date_joined']
        read_only_fields = ['id', 'date_joined']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, allow_null=True, required=False
    )

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'price', 'cost_price',
            'category', 'category_id', 'stock', 'low_stock_threshold',
            'is_active', 'created_at', 'updated_at'
        ]


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['product_id', 'product_name', 'quantity', 'unit_price', 'subtotal']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    cashier = UserSerializer(read_only=True)
    voided_by = UserSerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'cashier', 'items',
            'subtotal', 'tax', 'total',
            'payment_method', 'amount_tendered', 'change',
            'customer_name', 'note', 'status',
            'voided_by', 'void_reason', 'voided_at',
            'created_at'
        ]


class CreateOrderItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class CreateOrderSerializer(serializers.Serializer):
    items = CreateOrderItemSerializer(many=True)
    payment_method = serializers.ChoiceField(choices=['cash', 'mpesa', 'card'])
    amount_tendered = serializers.DecimalField(max_digits=12, decimal_places=2)
    customer_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    note = serializers.CharField(required=False, allow_blank=True)
