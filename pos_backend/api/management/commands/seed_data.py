"""
Management command: seed_data
Usage:  python manage.py seed_data
        python manage.py seed_data --clear   # wipe and re-seed

Place this file at:
    api/management/commands/seed_data.py

You also need these two empty __init__.py files:
    api/management/__init__.py
    api/management/commands/__init__.py
"""

import random
import decimal
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from api.models import User, Category, Product, Order, OrderItem


# ── Seed data definitions ─────────────────────────────────────────────────────

USERS = [
    {
        "username": "admin",
        "password": "admin123",
        "full_name": "Admin User",
        "role": "admin",
        "is_staff": True,
        "is_superuser": True,
    },
    {
        "username": "jane",
        "password": "cashier123",
        "full_name": "Jane Wanjiku",
        "role": "cashier",
    },
    {
        "username": "brian",
        "password": "cashier123",
        "full_name": "Brian Otieno",
        "role": "cashier",
    },
    {
        "username": "amina",
        "password": "cashier123",
        "full_name": "Amina Hassan",
        "role": "cashier",
    },
]

CATEGORIES = [
    "Food",
    "Beverages",
    "Snacks",
    "Household",
    "Personal Care",
    "Dairy",
]

# (name, sku, price, cost_price, category, stock, low_stock_threshold)
PRODUCTS = [
    # Beverages
    ("Bottled Water 500ml",      "BW-500",  "50.00",   "20.00",  "Beverages",     300, 30),
    ("Soda 300ml (Coke)",        "SD-300",  "80.00",   "45.00",  "Beverages",     150, 20),
    ("Soda 500ml (Fanta)",       "SD-500",  "100.00",  "60.00",  "Beverages",     120, 20),
    ("Juice 500ml (Delmonte)",   "JC-500",  "130.00",  "80.00",  "Beverages",     80,  15),
    ("Energy Drink 250ml",       "ED-250",  "150.00",  "90.00",  "Beverages",     60,  10),
    ("Mineral Water 1.5L",       "MW-1L5",  "90.00",   "40.00",  "Beverages",     200, 25),

    # Food
    ("Bread Loaf (White)",       "BR-WHT",  "70.00",   "45.00",  "Food",          80,  15),
    ("Bread Loaf (Brown)",       "BR-BRN",  "75.00",   "48.00",  "Food",          60,  10),
    ("Sugar 1kg",                "SG-1KG",  "180.00",  "120.00", "Food",          8,   15),
    ("Sugar 2kg",                "SG-2KG",  "350.00",  "230.00", "Food",          40,  10),
    ("Rice 1kg",                 "RC-1KG",  "160.00",  "100.00", "Food",          90,  20),
    ("Rice 2kg",                 "RC-2KG",  "300.00",  "190.00", "Food",          50,  10),
    ("Cooking Oil 500ml",        "OL-500",  "220.00",  "150.00", "Food",          70,  15),
    ("Cooking Oil 1L",           "OL-001",  "380.00",  "260.00", "Food",          5,   10),
    ("Wheat Flour 2kg",          "FL-2KG",  "200.00",  "130.00", "Food",          55,  10),
    ("Salt 500g",                "SL-500",  "50.00",   "30.00",  "Food",          100, 20),
    ("Eggs (tray of 30)",        "EG-030",  "480.00",  "350.00", "Food",          30,  5),

    # Dairy
    ("Milk Fresh 500ml",         "MK-500",  "65.00",   "40.00",  "Dairy",         60,  20),
    ("Milk Fresh 1L",            "MK-001",  "120.00",  "75.00",  "Dairy",         40,  15),
    ("Yoghurt 500ml (Plain)",    "YG-500",  "140.00",  "90.00",  "Dairy",         35,  10),
    ("Butter 250g",              "BT-250",  "250.00",  "170.00", "Dairy",         25,  8),
    ("Cheese Slices 200g",       "CH-200",  "310.00",  "210.00", "Dairy",         20,  5),

    # Snacks
    ("Biscuits 200g (Digestive)","BS-DGT",  "90.00",   "55.00",  "Snacks",        120, 20),
    ("Crisps 100g",              "CR-100",  "60.00",   "35.00",  "Snacks",        200, 30),
    ("Peanuts 200g (Salted)",    "PN-200",  "80.00",   "45.00",  "Snacks",        90,  20),
    ("Chocolate Bar 50g",        "CB-050",  "120.00",  "75.00",  "Snacks",        70,  15),
    ("Candy Sweets 100g",        "CW-100",  "40.00",   "20.00",  "Snacks",        150, 30),

    # Household
    ("Washing Powder 500g",      "WP-500",  "250.00",  "170.00", "Household",     45,  10),
    ("Washing Powder 1kg",       "WP-1KG",  "450.00",  "300.00", "Household",     30,  8),
    ("Dish Soap 500ml",          "DS-500",  "130.00",  "80.00",  "Household",     55,  15),
    ("Toilet Paper (4-pack)",    "TP-004",  "220.00",  "140.00", "Household",     40,  10),
    ("Bin Bags (20-pack)",       "BB-020",  "180.00",  "110.00", "Household",     35,  8),
    ("Matchbox (10-pack)",       "MB-010",  "50.00",   "25.00",  "Household",     80,  20),

    # Personal Care
    ("Soap Bar 100g (Lifebuoy)", "SP-LFB",  "60.00",   "35.00",  "Personal Care", 90,  20),
    ("Shampoo 200ml",            "SH-200",  "280.00",  "180.00", "Personal Care", 35,  10),
    ("Toothpaste 100ml",         "TP-100",  "150.00",  "90.00",  "Personal Care", 50,  15),
    ("Petroleum Jelly 100ml",    "PJ-100",  "120.00",  "70.00",  "Personal Care", 40,  10),
    ("Sanitary Pads (8-pack)",   "SP-008",  "200.00",  "130.00", "Personal Care", 30,  8),
]

PAYMENT_METHODS = ["cash", "mpesa", "card"]
PAYMENT_WEIGHTS  = [0.5, 0.35, 0.15]   # cash most common

CUSTOMER_NAMES = [
    "", "", "", "",                      # most sales are walk-in (blank)
    "John Kamau", "Mary Njeri", "Peter Omondi",
    "Grace Achieng", "Samuel Mwangi", "Faith Waweru",
]


# ── Command ───────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = (
        "Seed the database with demo users, categories, products, and "
        "sample orders for the past 7 days."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing data before seeding.",
        )
        parser.add_argument(
            "--orders",
            type=int,
            default=60,
            help="Number of sample orders to generate (default: 60).",
        )
        parser.add_argument(
            "--days",
            type=int,
            default=7,
            help="Spread orders across this many past days (default: 7).",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("\n=== SimplePOS Seed Data ===\n"))

        if options["clear"]:
            self._clear()

        users      = self._seed_users()
        categories = self._seed_categories()
        products   = self._seed_products(categories)
        self._seed_orders(users, products, options["orders"], options["days"])

        self.stdout.write(self.style.SUCCESS("\n✓ Seeding complete.\n"))
        self._print_summary(users, categories, products)

    # ── Clear ─────────────────────────────────────────────────────────────────

    def _clear(self):
        self.stdout.write("  Clearing existing data…", ending=" ")
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        Product.objects.all().delete()
        Category.objects.all().delete()
        User.objects.all().delete()
        self.stdout.write(self.style.SUCCESS("done"))

    # ── Users ─────────────────────────────────────────────────────────────────

    def _seed_users(self):
        self.stdout.write("  Seeding users…", ending=" ")
        created = []
        for u in USERS:
            if User.objects.filter(username=u["username"]).exists():
                user = User.objects.get(username=u["username"])
                created.append(user)
                continue
            user = User(
                username=u["username"],
                full_name=u["full_name"],
                role=u["role"],
                is_staff=u.get("is_staff", False),
                is_superuser=u.get("is_superuser", False),
            )
            user.set_password(u["password"])
            user.save()
            created.append(user)
        self.stdout.write(self.style.SUCCESS(f"{len(created)} users"))
        return created

    # ── Categories ────────────────────────────────────────────────────────────

    def _seed_categories(self):
        self.stdout.write("  Seeding categories…", ending=" ")
        cats = {}
        for name in CATEGORIES:
            obj, _ = Category.objects.get_or_create(name=name)
            cats[name] = obj
        self.stdout.write(self.style.SUCCESS(f"{len(cats)} categories"))
        return cats

    # ── Products ──────────────────────────────────────────────────────────────

    def _seed_products(self, categories):
        self.stdout.write("  Seeding products…", ending=" ")
        prods = []
        for name, sku, price, cost, cat_name, stock, threshold in PRODUCTS:
            obj, created = Product.objects.get_or_create(
                sku=sku,
                defaults=dict(
                    name=name,
                    price=decimal.Decimal(price),
                    cost_price=decimal.Decimal(cost),
                    category=categories.get(cat_name),
                    stock=stock,
                    low_stock_threshold=threshold,
                    is_active=True,
                ),
            )
            prods.append(obj)
        self.stdout.write(self.style.SUCCESS(f"{len(prods)} products"))
        return prods

    # ── Orders ────────────────────────────────────────────────────────────────

    def _seed_orders(self, users, products, total_orders, days):
        self.stdout.write(f"  Generating {total_orders} sample orders over {days} days…")

        cashiers = [u for u in users if u.role in ("cashier", "admin")]
        active_products = [p for p in products if p.stock > 5]

        TAX_RATE = decimal.Decimal("0.16")
        order_count = 0

        for day_offset in range(days - 1, -1, -1):
            day = timezone.now().date() - timedelta(days=day_offset)
            daily_orders = total_orders // days + (1 if day_offset < total_orders % days else 0)

            for _ in range(daily_orders):
                cashier       = random.choice(cashiers)
                payment_method = random.choices(PAYMENT_METHODS, PAYMENT_WEIGHTS)[0]
                customer_name  = random.choice(CUSTOMER_NAMES)
                num_items      = random.randint(1, 5)
                chosen         = random.sample(active_products, min(num_items, len(active_products)))

                # Build line items
                lines = []
                subtotal = decimal.Decimal("0")
                for product in chosen:
                    qty  = random.randint(1, 3)
                    line = product.price * qty
                    subtotal += line
                    lines.append((product, qty, product.price, line))

                tax    = (subtotal * TAX_RATE).quantize(decimal.Decimal("0.01"))
                total  = subtotal + tax

                # Round up tendered to nearest 50 for cash
                if payment_method == "cash":
                    tendered = decimal.Decimal(str(int((total / 50 + 1)) * 50))
                else:
                    tendered = total

                change = (tendered - total).quantize(decimal.Decimal("0.01"))

                # Fake timestamp spread across the day
                hour   = random.randint(8, 20)
                minute = random.randint(0, 59)
                ts     = timezone.make_aware(
                    timezone.datetime(day.year, day.month, day.day, hour, minute)
                )

                with transaction.atomic():
                    order_number = f"ORD-{day.strftime('%Y%m%d')}-{(order_count + 1):04d}"
                    order = Order.objects.create(
                        order_number=order_number,
                        cashier=cashier,
                        subtotal=subtotal,
                        tax=tax,
                        total=total,
                        payment_method=payment_method,
                        amount_tendered=tendered,
                        change=change,
                        customer_name=customer_name,
                        status="completed",
                    )
                    # Override auto_now_add timestamp
                    Order.objects.filter(pk=order.pk).update(created_at=ts)

                    for product, qty, price, line_total in lines:
                        OrderItem.objects.create(
                            order=order,
                            product=product,
                            product_name=product.name,
                            quantity=qty,
                            unit_price=price,
                            subtotal=line_total,
                        )

                order_count += 1

        # Void a couple of orders for realism
        sample_orders = list(Order.objects.order_by("?")[:3])
        admin_user = User.objects.filter(role="admin").first()
        void_reasons = [
            "Customer changed mind",
            "Wrong item scanned",
            "Payment issue",
        ]
        for i, order in enumerate(sample_orders):
            order.status     = "voided"
            order.voided_by  = admin_user
            order.void_reason = void_reasons[i % len(void_reasons)]
            order.voided_at  = order.created_at + timedelta(minutes=5)
            order.save()

        self.stdout.write(
            self.style.SUCCESS(f"  ✓ {order_count} orders created, {len(sample_orders)} voided")
        )

    # ── Summary ───────────────────────────────────────────────────────────────

    def _print_summary(self, users, categories, products):
        self.stdout.write(self.style.MIGRATE_HEADING("\n── Login Credentials ──────────────────"))
        self.stdout.write(f"  {'USERNAME':<12} {'PASSWORD':<14} {'ROLE'}")
        self.stdout.write(f"  {'─'*12} {'─'*14} {'─'*8}")
        for u in USERS:
            self.stdout.write(f"  {u['username']:<12} {u['password']:<14} {u['role']}")

        self.stdout.write(self.style.MIGRATE_HEADING("\n── Database ────────────────────────────"))
        self.stdout.write(f"  Users      : {User.objects.count()}")
        self.stdout.write(f"  Categories : {Category.objects.count()}")
        self.stdout.write(f"  Products   : {Product.objects.count()}")
        self.stdout.write(f"  Orders     : {Order.objects.count()}")
        self.stdout.write(f"  Order Items: {OrderItem.objects.count()}")

        low = Product.objects.filter(stock__lte=10)
        if low.exists():
            self.stdout.write(self.style.WARNING("\n── Low Stock Warning ───────────────────"))
            for p in low:
                self.stdout.write(f"  ! {p.name} — only {p.stock} left")

        self.stdout.write("")