import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_backend.settings')
django.setup()

from api.models import User, Category, Product

# Admin user
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', '', 'admin123', role='admin', full_name='Admin User')
    print("Created admin / admin123")

# Cashier user
if not User.objects.filter(username='cashier').exists():
    u = User.objects.create_user('cashier', '', 'cashier123', role='cashier', full_name='Jane Cashier')
    print("Created cashier / cashier123")

# Categories
cats = {}
for name in ['Food', 'Beverages', 'Snacks', 'Household']:
    c, _ = Category.objects.get_or_create(name=name)
    cats[name] = c

# Products
products = [
    ('Bottled Water 500ml', 'BW-500', '50.00', '25.00', 'Beverages', 200),
    ('Soda 300ml', 'SD-300', '80.00', '40.00', 'Beverages', 150),
    ('Bread Loaf', 'BR-001', '70.00', '45.00', 'Food', 80),
    ('Eggs (tray)', 'EG-001', '480.00', '350.00', 'Food', 30),
    ('Sugar 1kg', 'SG-001', '180.00', '120.00', 'Food', 8),
    ('Milk 500ml', 'MK-500', '65.00', '40.00', 'Beverages', 60),
    ('Biscuits 200g', 'BS-001', '90.00', '55.00', 'Snacks', 120),
    ('Chips 100g', 'CH-001', '60.00', '35.00', 'Snacks', 200),
    ('Washing Powder 500g', 'WP-001', '250.00', '170.00', 'Household', 45),
    ('Cooking Oil 1L', 'CO-001', '380.00', '260.00', 'Food', 5),
]

for name, sku, price, cost, cat, stock in products:
    p, created = Product.objects.get_or_create(
        sku=sku,
        defaults=dict(name=name, price=price, cost_price=cost, category=cats[cat], stock=stock)
    )
    if created:
        print(f"  + {name}")

print("Seed done.")
