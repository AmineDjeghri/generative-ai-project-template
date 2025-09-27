from fastapi import (
    APIRouter,
    HTTPException,
    Depends,
    status,
    UploadFile,
    File,
    Form,
    Body,
    Query,
    Header,
)
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from schemas import User, Token, CreditBalance, CreditInvoice
from database import (
    UserDB,
    ProductDB,
    WidgetConfigDB,
    UsageLogDB,
    CreditPurchaseDB,
    WidgetAnalyticsEventDB,
    SessionLocal,
)
from auth import (
    get_db,
    get_password_hash,
    authenticate_user,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from datetime import timedelta
from jose import jwt, JWTError
from fastapi import Request
import os
import uuid
from pathlib import Path
import shutil
from typing import List, Optional
import asyncio
import stripe
import json
from datetime import datetime
from dateutil.relativedelta import relativedelta
from sqlalchemy import func
from dateutil.parser import isoparse
import pandas as pd
import io


def parse_images_field(images_field):
    """Safely parse images field that could be JSON array, comma-separated string, or single string."""
    if not images_field:
        return []

    if isinstance(images_field, list):
        return images_field

    if isinstance(images_field, str):
        # Try to parse as JSON first
        try:
            parsed = json.loads(images_field)
            if isinstance(parsed, list):
                return parsed
        except (json.JSONDecodeError, TypeError):
            pass

        # Fall back to comma-separated format
        if "," in images_field:
            return [img.strip() for img in images_field.split(",") if img.strip()]
        elif images_field.strip():
            # Single image URL as string
            return [images_field.strip()]

    return []


def store_images_field(image_urls):
    """Store image URLs as JSON array, ensuring consistent format."""
    if not image_urls:
        return None
    return json.dumps(image_urls)


SECRET_KEY = os.environ.get("FAST_API_SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

router = APIRouter(prefix="/api")

# Create artifacts directory if it doesn't exist
ARTIFACTS_DIR = Path("artifacts")
ARTIFACTS_DIR.mkdir(exist_ok=True)

# In-memory mock invoice storage (replace with DB in production)
credit_invoices = []

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")
FRONT_END_URL = os.environ.get("FRONT_END_URL")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")

stripe.api_key = STRIPE_SECRET_KEY

# In-memory mapping for demo: session_id -> (username, credits, amount)
stripe_sessions = {}


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError as e:
        raise credentials_exception
    user = db.query(UserDB).filter(UserDB.username == username).first()
    if user is None:
        raise credentials_exception
    return user


async def save_uploaded_image(file: UploadFile) -> str:
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Generate unique filename
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = ARTIFACTS_DIR / unique_filename

    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {str(e)}")

    # Return the URL to access the image
    return f"/artifacts/{unique_filename}"


@router.get("/artifacts/{filename}")
async def serve_artifact(filename: str):
    file_path = ARTIFACTS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


@router.post("/register")
def register(user: User, db: Session = Depends(get_db)):
    existing_user = db.query(UserDB).filter(UserDB.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    db_user = UserDB(username=user.username, hashed_password=hashed_password, credits=0)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    # Create widget config with random api_key for new user
    config_row = WidgetConfigDB(user_id=db_user.id, api_key=generate_api_key(db_user.id), config={})
    db.add(config_row)
    db.commit()
    return {"msg": "User registered successfully"}


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/products/add-single")
async def add_product(
    name: str = Form(...),
    sku: str = Form(...),
    price: Optional[float] = Form(None),
    page_url: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    images: List[UploadFile] = File([]),
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    # Check for duplicate SKU for this user
    if (
        db.query(ProductDB)
        .filter(ProductDB.sku == sku, ProductDB.user_id == current_user.id)
        .first()
    ):
        raise HTTPException(status_code=400, detail="SKU already exists")

    # Save uploaded images
    image_urls = []
    for image in images:
        if image:
            image_url = await save_uploaded_image(image)
            image_urls.append(image_url)

    # Create product
    db_product = ProductDB(
        user_id=current_user.id,
        name=name,
        sku=sku,
        price=price,
        page_url=page_url,
        category=category,
        images=store_images_field(image_urls),
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return {"msg": "Product added successfully", "id": db_product.id}


@router.get("/products")
def list_products(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    products = db.query(ProductDB).filter(ProductDB.user_id == current_user.id).all()
    result = []
    for p in products:
        result.append(
            {
                "id": p.id,
                "name": p.name,
                "sku": p.sku,
                "price": p.price,
                "page_url": p.page_url,
                "category": p.category,
                "images": parse_images_field(p.images),
            }
        )
    return result


def generate_api_key(user_id: str) -> str:
    return f"vf_{user_id[:8]}_{uuid.uuid4().hex[:16]}"


@router.get("/widget/config")
def get_widget_config(
    db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)
):
    config_row = db.query(WidgetConfigDB).filter(WidgetConfigDB.user_id == current_user.id).first()
    if not config_row:
        config_row = WidgetConfigDB(
            user_id=current_user.id, api_key=generate_api_key(current_user.id), config={}
        )
        db.add(config_row)
        db.commit()
        db.refresh(config_row)
    if not config_row.api_key:
        config_row.api_key = generate_api_key(current_user.id)
        db.commit()
        db.refresh(config_row)
    return {"config": config_row.config, "api_key": config_row.api_key}


@router.post("/widget/config")
def save_widget_config(
    config: dict,  # Accepts a dict directly
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    config_row = db.query(WidgetConfigDB).filter(WidgetConfigDB.user_id == current_user.id).first()
    if config_row:
        config_row.config = config
        db.commit()
        db.refresh(config_row)
    else:
        config_row = WidgetConfigDB(
            user_id=current_user.id, api_key=generate_api_key(current_user.id), config=config
        )
        db.add(config_row)
        db.commit()
        db.refresh(config_row)
    if not config_row.api_key:
        config_row.api_key = generate_api_key(current_user.id)
        db.commit()
        db.refresh(config_row)
    return {"config": config_row.config, "api_key": config_row.api_key}


@router.get("/widget/embed-code")
def get_embed_code(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    config = db.query(WidgetConfigDB).filter(WidgetConfigDB.user_id == current_user.id).first()

    if not config:
        raise HTTPException(status_code=404, detail="Widget configuration not found")

    # Use existing API key or generate and store a new one
    if not config.api_key:
        config.api_key = generate_api_key(current_user.id)
        db.commit()
        db.refresh(config)

    api_key = config.api_key

    front_url = os.environ.get("FRONT_END_URL")
    script_src = f"{front_url.rstrip('/') if front_url else 'https://cdn.virtualfit.com'}/virtual-tryon-widget.min.js"
    embed_code = f"""<script src=\"{script_src}\"></script>
<script>
  VirtualTryOnWidget.init({{
    apiKey: '{api_key}',
    productId: 'YOUR_PRODUCT_ID'
  }});
</script>"""

    return {"embed_code": embed_code, "api_key": api_key}


@router.post("/widget/regenerate-api-key")
def regenerate_api_key(
    db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)
):
    config = db.query(WidgetConfigDB).filter(WidgetConfigDB.user_id == current_user.id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Widget config not found")
    config.api_key = generate_api_key(current_user.id)
    db.commit()
    db.refresh(config)
    return {"api_key": config.api_key}


@router.get("/widget/config-by-api-key")
def get_widget_config_by_api_key(api_key: str, db: Session = Depends(get_db)):
    config_row = db.query(WidgetConfigDB).filter(WidgetConfigDB.api_key == api_key).first()
    if not config_row:
        raise HTTPException(status_code=404, detail="Widget config not found")
    config = config_row.config or {}
    if not config:
        # Default config
        config = {
            "primaryColor": "#667eea",
            "secondaryColor": "#ff6b6b",
            "backgroundColor": "#ffffff",
            "textColor": "#333333",
            "fontFamily": "Inter",
            "fontSize": "16px",
            "fontWeight": "500",
            "buttonStyle": "rounded",
            "buttonSize": "medium",
            "buttonText": "Take a Photo",
            "widgetSize": "medium",
            "position": "bottom-right",
            "title": "Virtual Try-On",
            "subtitle": "See how it looks on you",
            "callToAction": "Start your virtual fitting",
            "showBranding": True,
            "enableAR": True,
            "enableSharing": False,
            "animationType": "fade",
            "animationSpeed": "normal",
            "uploadButtonText": "Upload a Photo",
        }
    return {"config": config, "api_key": config_row.api_key}


@router.get("/product/by-api-key")
def get_product_by_api_key(api_key: str, product_id: str, db: Session = Depends(get_db)):
    config_row = db.query(WidgetConfigDB).filter(WidgetConfigDB.api_key == api_key).first()
    if not config_row:
        raise HTTPException(status_code=404, detail="Invalid API key")
    user_id = config_row.user_id
    product = (
        db.query(ProductDB).filter(ProductDB.id == product_id, ProductDB.user_id == user_id).first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {
        "id": product.id,
        "name": product.name,
        "sku": product.sku,
        "price": product.price,
        "page_url": product.page_url,
        "category": product.category,
        "images": parse_images_field(product.images),
    }


@router.get("/demo/first-user-products")
def get_first_user_products(db: Session = Depends(get_db)):
    first_user = db.query(UserDB).order_by(UserDB.created_at).first()
    if not first_user:
        return {"api_key": None, "products": []}
    config_row = db.query(WidgetConfigDB).filter(WidgetConfigDB.user_id == first_user.id).first()
    api_key = config_row.api_key if config_row else None
    products = db.query(ProductDB).filter(ProductDB.user_id == first_user.id).all()
    product_list = [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "price": p.price,
            "page_url": p.page_url,
            "category": p.category,
            "images": parse_images_field(p.images),
        }
        for p in products
    ]
    return {"api_key": api_key, "products": product_list}


@router.put("/products/{product_id}")
async def update_product(
    product_id: str,
    name: str = Form(...),
    sku: str = Form(...),
    price: Optional[float] = Form(None),
    page_url: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    images: List[UploadFile] = File([]),
    existing_images: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    product = (
        db.query(ProductDB)
        .filter(ProductDB.id == product_id, ProductDB.user_id == current_user.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    # Check for duplicate SKU (exclude this product)
    if (
        db.query(ProductDB)
        .filter(
            ProductDB.sku == sku, ProductDB.user_id == current_user.id, ProductDB.id != product_id
        )
        .first()
    ):
        raise HTTPException(status_code=400, detail="SKU already exists")

    # Parse existing images if provided
    existing_image_urls = []
    if existing_images:
        try:
            existing_image_urls = json.loads(existing_images)
        except (json.JSONDecodeError, TypeError):
            # Fallback to empty list if JSON parsing fails
            existing_image_urls = []

    # Save uploaded images
    new_image_urls = []
    for image in images:
        if image:
            image_url = await save_uploaded_image(image)
            new_image_urls.append(image_url)

    # Combine existing and new images
    all_image_urls = existing_image_urls + new_image_urls

    # If we have new images or existing images to keep, update the product
    if all_image_urls:
        # Delete old images that are no longer needed
        if product.images:
            old_images = parse_images_field(product.images)
            for old_image in old_images:
                # Only delete if this image is not in the new list
                if old_image not in all_image_urls:
                    # Check if this image is referenced by any other product
                    other = (
                        db.query(ProductDB)
                        .filter(ProductDB.images.like(f"%{old_image}%"), ProductDB.id != product_id)
                        .first()
                    )
                    if not other:
                        # Remove leading slash if present
                        filename = old_image.split("/")[-1]
                        file_path = ARTIFACTS_DIR / filename
                        if file_path.exists():
                            try:
                                os.remove(file_path)
                            except Exception as e:
                                print(f"Failed to delete old image {file_path}: {e}")

        product.images = store_images_field(all_image_urls)
    else:
        # No images left, clear the field
        product.images = None

    # Update fields
    product.name = name
    product.sku = sku
    product.price = price
    product.page_url = page_url
    product.category = category

    db.commit()
    db.refresh(product)
    return {"msg": "Product updated successfully", "id": product.id}


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    product = (
        db.query(ProductDB)
        .filter(ProductDB.id == product_id, ProductDB.user_id == current_user.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Delete associated images from disk if not referenced elsewhere
    if product.images:
        old_images = parse_images_field(product.images)
        for old_image in old_images:
            # Check if this image is referenced by any other product
            other = (
                db.query(ProductDB)
                .filter(ProductDB.images.like(f"%{old_image}%"), ProductDB.id != product_id)
                .first()
            )
            if not other:
                # Remove leading slash if present
                filename = old_image.split("/")[-1]
                file_path = ARTIFACTS_DIR / filename
                if file_path.exists():
                    try:
                        os.remove(file_path)
                    except Exception as e:
                        print(f"Failed to delete old image {file_path}: {e}")

    # Delete the product
    db.delete(product)
    db.commit()

    return {"msg": "Product deleted successfully"}


def get_user_by_api_key(
    x_api_key: str = Header(None, alias="X-API-Key"), db: Session = Depends(get_db)
):
    print(f"[DEBUG] get_user_by_api_key: Received X-API-Key: {x_api_key}")
    if not x_api_key:
        print("[DEBUG] No API key provided in header.")
        return None
    config_row = db.query(WidgetConfigDB).filter(WidgetConfigDB.api_key == x_api_key).first()
    print(f"[DEBUG] WidgetConfigDB lookup result: {config_row}")
    if not config_row:
        print("[DEBUG] Invalid API key: not found in widget_configs table.")
        raise HTTPException(status_code=401, detail="Invalid API key")
    user = db.query(UserDB).filter(UserDB.id == config_row.user_id).first()
    print(f"[DEBUG] UserDB lookup result for user_id {config_row.user_id}: {user}")
    if not user:
        print("[DEBUG] User not found for API key.")
        raise HTTPException(status_code=401, detail="User not found for API key")
    return user


@router.post("/generate-virtual-try-on-image")
async def generate_virtual_try_on_image(
    request: Request, db: Session = Depends(get_db), user: UserDB = Depends(get_user_by_api_key)
):
    data = await request.json()
    photo = data.get("photo")
    product_id = data.get("productId")
    await asyncio.sleep(2)
    # Get credits per image from env variable (default 1)
    credits_per_image = int(os.environ.get("VTO_CREDITS_PER_IMAGE", 1))
    # Check if user has enough credits
    if user.credits < credits_per_image:
        raise HTTPException(status_code=402, detail="Not enough credits")
    # Deduct credits
    user.credits -= credits_per_image
    db.commit()
    # Log usage
    usage_log = UsageLogDB(user_id=user.id, credits_used=credits_per_image, action="generate_image")
    db.add(usage_log)
    db.commit()
    return {"resultImage": photo, "creditsLeft": user.credits}


@router.get("/credits", response_model=CreditBalance)
def get_credits(current_user: UserDB = Depends(get_current_user)):
    return {"credits": current_user.credits}


@router.get("/credits/invoices", response_model=List[CreditInvoice])
def get_credit_invoices(current_user: UserDB = Depends(get_current_user)):
    # Return only this user's invoices
    return [CreditInvoice(**inv) for inv in credit_invoices if inv["user"] == current_user.username]


@router.post("/stripe/create-checkout-session")
def create_stripe_checkout_session(
    amount: float = Body(...),
    credits: int = Body(...),
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    # Always look up or create Stripe customer by email (username)
    stripe_customers = stripe.Customer.list(email=current_user.username, limit=1)
    if stripe_customers.data:
        customer = stripe_customers.data[0]
    else:
        customer = stripe.Customer.create(email=current_user.username, name=current_user.username)
    # Stripe expects amount in cents
    amount_cents = int(amount * 100)
    success_url = f"{FRONT_END_URL}/subscription?status=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{FRONT_END_URL}/subscription?status=cancel"
    session = stripe.checkout.Session.create(
        customer=customer.id,
        payment_method_types=["card"],
        line_items=[
            {
                "price_data": {
                    "currency": "eur",
                    "product_data": {
                        "name": f"{credits} Credits",
                        "description": f"Purchase of {credits} credits",
                    },
                    "unit_amount": amount_cents,
                    "tax_behavior": "inclusive",
                },
                "quantity": 1,
            }
        ],
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        payment_intent_data={"description": f"Purchase of {credits} credits"},
        metadata={"username": current_user.username, "credits": credits, "amount": amount},
        automatic_tax={"enabled": True},
        billing_address_collection="required",
        customer_update={"address": "auto"},
    )
    # Store mapping for webhook
    stripe_sessions[session.id] = {
        "username": current_user.username,
        "credits": credits,
        "amount": amount,
    }
    return {"checkout_url": session.url}


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    event = None
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        print("[STRIPE WEBHOOK] Error:", e)
        raise HTTPException(status_code=400, detail="Invalid webhook")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        session_id = session["id"]
        metadata = session.get("metadata", {})
        username = metadata.get("username")
        credits = int(metadata.get("credits", 0))
        amount = float(metadata.get("amount", 0))
        payment_intent_id = session.get("payment_intent")
        print(
            f"[STRIPE WEBHOOK] Payment completed for user {username}, credits: {credits}, amount: {amount}"
        )
        # Find user and credit them
        user = db.query(UserDB).filter(UserDB.username == username).first()
        if user:
            user.credits += credits
            db.commit()
            # Log purchase in DB
            purchase = CreditPurchaseDB(
                user_id=user.id,
                stripe_session_id=session_id,
                stripe_charge_id=payment_intent_id,
                amount=amount,
                credits=credits,
                timestamp=datetime.utcnow(),
                description=f"Purchase of {credits} credits",
                status="succeeded",
                download_url=None,
            )
            db.add(purchase)
            db.commit()
        else:
            print(f"[STRIPE WEBHOOK] User not found: {username}")
    return {"status": "success"}


@router.get("/stripe/invoices", response_model=List[CreditInvoice])
def get_stripe_invoices(
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    # Ensure we have the Stripe customer ID
    if not hasattr(current_user, "stripe_customer_id") or not current_user.stripe_customer_id:
        return []
    paid_invoices = stripe.Invoice.list(customer=current_user.stripe_customer_id, status="paid")
    invoices = []
    for invoice in paid_invoices.auto_paging_iter():
        date_iso = datetime.utcfromtimestamp(invoice.created).isoformat()
        invoices.append(
            CreditInvoice(
                id=invoice.id,
                date=date_iso,
                amount=(invoice.amount_paid or 0) / 100,
                status=invoice.status,
                description=invoice.description or "Stripe Invoice",
                downloadUrl=getattr(invoice, "invoice_pdf", None),
            )
        )
    return invoices


@router.get("/stripe/transactions", response_model=List[CreditInvoice])
def get_stripe_transactions(
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    # Always look up Stripe customer by email (username)
    stripe_customers = stripe.Customer.list(email=current_user.username, limit=1)
    if not stripe_customers.data:
        return []
    customer = stripe_customers.data[0]
    charges = stripe.Charge.list(customer=customer.id, paid=True)
    transactions = []
    for charge in charges.auto_paging_iter():
        full_charge = stripe.Charge.retrieve(charge.id)
        date_iso = datetime.utcfromtimestamp(full_charge.created).isoformat()
        transactions.append(
            CreditInvoice(
                id=full_charge.id,
                date=date_iso,
                amount=(full_charge.amount or 0) / 100,
                description=full_charge.description or "Stripe Charge",
                downloadUrl=full_charge.receipt_url,
            )
        )
    return transactions


@router.get("/credit-purchases", response_model=List[CreditInvoice])
def get_credit_purchases(
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
    limit: int = Query(10, ge=1, le=50),
):
    """Get recent credit purchases from the database."""
    purchases = (
        db.query(CreditPurchaseDB)
        .filter(CreditPurchaseDB.user_id == current_user.id)
        .order_by(CreditPurchaseDB.timestamp.desc())
        .limit(limit)
        .all()
    )

    transactions = []
    for purchase in purchases:
        transactions.append(
            CreditInvoice(
                id=purchase.id,
                date=purchase.timestamp.isoformat(),
                amount=purchase.amount,
                description=purchase.description or f"Purchase of {purchase.credits} credits",
                downloadUrl=purchase.download_url,
            )
        )
    return transactions


@router.get("/usage/analytics")
def get_usage_analytics(
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
    period: str = Query("monthly", enum=["daily", "weekly", "monthly"]),
    start_date: str = Query(None),
    end_date: str = Query(None),
):
    now = datetime.utcnow()
    if end_date:
        end = datetime.fromisoformat(end_date)
    else:
        end = now
    if start_date:
        start = datetime.fromisoformat(start_date)
    else:
        if period == "daily":
            start = end - timedelta(days=6)
        elif period == "weekly":
            start = end - timedelta(weeks=5)
        else:
            start = (end.replace(day=1) - relativedelta(months=5)).replace(day=1)
    logs = (
        db.query(UsageLogDB)
        .filter(
            UsageLogDB.user_id == current_user.id,
            UsageLogDB.timestamp >= start,
            UsageLogDB.timestamp <= end,
        )
        .all()
    )
    # Get all credit purchases from DB for the selected period
    purchases = (
        db.query(CreditPurchaseDB)
        .filter(
            CreditPurchaseDB.user_id == current_user.id,
            CreditPurchaseDB.timestamp >= start,
            CreditPurchaseDB.timestamp <= end,
        )
        .all()
    )
    # Build period buckets
    usage_history = []
    balance_history = []
    buckets = []
    if period == "daily":
        for i in range((end - start).days + 1):
            day = start + timedelta(days=i)
            buckets.append(day.replace(hour=0, minute=0, second=0, microsecond=0))
    elif period == "weekly":
        week_start = (start - timedelta(days=start.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        week_end = end
        buckets = []
        current = week_start
        while current <= week_end:
            buckets.append(current)
            current += timedelta(weeks=1)
    else:
        for i in range(6):
            month = (end.replace(day=1) - relativedelta(months=5 - i)).replace(day=1)
            buckets.append(month)
    # Calculate running balance
    running_balance = 0
    # Get all purchases and usages sorted by timestamp
    all_events = []
    for p in purchases:
        all_events.append({"timestamp": p.timestamp, "amount": p.credits, "type": "purchase"})
    for log in logs:
        all_events.append(
            {"timestamp": log.timestamp, "amount": -log.credits_used, "type": "usage"}
        )
    all_events.sort(key=lambda x: x["timestamp"])
    # For each bucket, sum all events up to and including that period
    for i, bucket in enumerate(buckets):
        if period == "daily":
            next_bucket = bucket + timedelta(days=1)
        elif period == "weekly":
            next_bucket = bucket + timedelta(weeks=1)
        else:
            next_bucket = (bucket + relativedelta(months=1)).replace(day=1)
        used = sum(log.credits_used for log in logs if bucket <= log.timestamp < next_bucket)
        usage_history.append(
            {
                "date": bucket.strftime("%Y-%m-%d")
                if period != "monthly"
                else bucket.strftime("%Y-%m"),
                "credits": int(used),
            }
        )
        # Calculate balance at the end of this period
        period_events = [e for e in all_events if e["timestamp"] < next_bucket]
        balance = sum(e["amount"] for e in period_events)

        # Ensure the last datapoint matches current available credits
        if i == len(buckets) - 1:  # Last bucket
            balance = current_user.credits

        balance_history.append(
            {
                "date": bucket.strftime("%Y-%m-%d")
                if period != "monthly"
                else bucket.strftime("%Y-%m"),
                "balance": balance,
            }
        )
    total_credits = int(sum(log.credits_used for log in logs))
    used_this_period = usage_history[-1]["credits"] if usage_history else 0
    avg = int(total_credits / len(usage_history)) if usage_history else 0
    # Calculate total money spent and total credits purchased for the period
    total_money = sum(p.amount for p in purchases)
    total_credits_purchased = sum(p.credits for p in purchases)
    cost_per_credit = total_money / total_credits_purchased if total_credits_purchased > 0 else 0
    return {
        "currentCredits": current_user.credits,
        "totalCredits": total_credits,
        "usedThisPeriod": used_this_period,
        "period": period,
        "usageHistory": usage_history,
        "balanceHistory": balance_history,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "average": avg,
        "totalMoney": total_money,
        "totalCreditsPurchased": total_credits_purchased,
        "costPerCredit": cost_per_credit,
    }


@router.post("/widget-analytics")
async def widget_analytics(request: Request):
    data = await request.json()
    # Use apiKey as client_id
    client_id = data.get("apiKey")
    event = data.get("event")
    timestamp = data.get("timestamp")
    product_id = data.get("productId") or data.get("product_id")
    # Store the rest as event_data (excluding above fields)
    event_data = {
        k: v
        for k, v in data.items()
        if k not in ["apiKey", "event", "timestamp", "productId", "product_id"]
    }
    visitor_id = data.get("visitorId")
    session_visitor_id = data.get("sessionVisitorId")
    # Parse timestamp string to datetime object if needed
    if isinstance(timestamp, str):
        try:
            timestamp = isoparse(timestamp)
        except Exception:
            from datetime import datetime

            timestamp = datetime.utcnow()
    # Store in DB
    db = SessionLocal()
    db_event = WidgetAnalyticsEventDB(
        client_id=client_id,
        event=event,
        timestamp=timestamp,
        product_id=product_id,
        event_data=event_data,
        visitor_id=visitor_id,
        session_visitor_id=session_visitor_id,
    )
    db.add(db_event)
    db.commit()
    db.close()
    return {"status": "ok"}


@router.get("/analytics/summary")
def analytics_summary(
    start_date: str = None,
    end_date: str = None,
    period: str = Query("daily", enum=["daily", "weekly", "monthly"]),
):
    db = SessionLocal()
    from datetime import datetime, timedelta
    from dateutil.relativedelta import relativedelta

    # Parse date range
    today = datetime.utcnow().date()
    if end_date:
        end = datetime.fromisoformat(end_date).date()
    else:
        end = today
    if start_date:
        start = datetime.fromisoformat(start_date).date()
    else:
        # Default to last 7 days for daily, last 4 weeks for weekly, last 3 months for monthly
        if period == "daily":
            start = end - timedelta(days=6)
        elif period == "weekly":
            start = end - timedelta(weeks=3)
        else:  # monthly
            start = end - relativedelta(months=2)
    # Make end inclusive by adding 1 day and using < end_exclusive
    from datetime import timedelta as td

    end_exclusive = end + td(days=1)
    # Previous period
    if period == "daily":
        period_days = (end - start).days + 1
        prev_end = start - timedelta(days=1)
        prev_start = prev_end - timedelta(days=period_days - 1)
    elif period == "weekly":
        period_weeks = ((end - start).days + 1) // 7
        prev_end = start - timedelta(days=1)
        prev_start = prev_end - timedelta(weeks=period_weeks - 1)
    else:  # monthly
        period_months = (end.year - start.year) * 12 + end.month - start.month + 1
        prev_end = start - relativedelta(days=1)
        prev_start = prev_end - relativedelta(months=period_months - 1)
    prev_end_exclusive = prev_end + td(days=1)

    # Helper to get counts for a period (inclusive end)
    def get_counts(start, end_exclusive):
        total_events = (
            db.query(func.count(WidgetAnalyticsEventDB.id))
            .filter(
                WidgetAnalyticsEventDB.timestamp >= start,
                WidgetAnalyticsEventDB.timestamp < end_exclusive,
            )
            .scalar()
        )
        total_tryons = (
            db.query(func.count())
            .filter(
                WidgetAnalyticsEventDB.event == "tryon_generation_success",
                WidgetAnalyticsEventDB.timestamp >= start,
                WidgetAnalyticsEventDB.timestamp < end_exclusive,
            )
            .scalar()
        )
        total_errors = (
            db.query(func.count())
            .filter(
                WidgetAnalyticsEventDB.event == "error_event",
                WidgetAnalyticsEventDB.timestamp >= start,
                WidgetAnalyticsEventDB.timestamp < end_exclusive,
            )
            .scalar()
        )
        widget_opens = (
            db.query(func.count())
            .filter(
                WidgetAnalyticsEventDB.event == "widget_opened",
                WidgetAnalyticsEventDB.timestamp >= start,
                WidgetAnalyticsEventDB.timestamp < end_exclusive,
            )
            .scalar()
        )
        unique_visitors = (
            db.query(func.count(func.distinct(WidgetAnalyticsEventDB.visitor_id)))
            .filter(
                WidgetAnalyticsEventDB.visitor_id != None,
                WidgetAnalyticsEventDB.timestamp >= start,
                WidgetAnalyticsEventDB.timestamp < end_exclusive,
            )
            .scalar()
        )
        unique_sessions = (
            db.query(func.count(func.distinct(WidgetAnalyticsEventDB.session_visitor_id)))
            .filter(
                WidgetAnalyticsEventDB.session_visitor_id != None,
                WidgetAnalyticsEventDB.timestamp >= start,
                WidgetAnalyticsEventDB.timestamp < end_exclusive,
            )
            .scalar()
        )
        photo_uploads = (
            db.query(func.count())
            .filter(
                WidgetAnalyticsEventDB.event.in_(["photo_uploaded", "photo_captured"]),
                WidgetAnalyticsEventDB.timestamp >= start,
                WidgetAnalyticsEventDB.timestamp < end_exclusive,
            )
            .scalar()
        )
        return {
            "totalEvents": total_events,
            "totalTryOns": total_tryons,
            "totalErrors": total_errors,
            "widgetOpens": widget_opens,
            "uniqueVisitors": unique_visitors,
            "uniqueSessions": unique_sessions,
            "photoUploads": photo_uploads,
        }

    # Get current and previous period counts
    counts = get_counts(start, end_exclusive)
    prev_counts = get_counts(prev_start, prev_end_exclusive)
    # Trends (per period in range)
    trends = []
    if period == "daily":
        for i in range(period_days):
            day = start + timedelta(days=i)
            day_exclusive = day + td(days=1)
            count = (
                db.query(func.count())
                .filter(
                    WidgetAnalyticsEventDB.event == "tryon_generation_success",
                    WidgetAnalyticsEventDB.timestamp >= day,
                    WidgetAnalyticsEventDB.timestamp < day_exclusive,
                )
                .scalar()
            )
            trends.append({"date": day.isoformat(), "count": count})
    elif period == "weekly":
        # Group by weeks
        current = start
        while current <= end:
            week_end = min(current + timedelta(days=6), end)
            week_end_exclusive = week_end + td(days=1)
            count = (
                db.query(func.count())
                .filter(
                    WidgetAnalyticsEventDB.event == "tryon_generation_success",
                    WidgetAnalyticsEventDB.timestamp >= current,
                    WidgetAnalyticsEventDB.timestamp < week_end_exclusive,
                )
                .scalar()
            )
            trends.append({"date": current.isoformat(), "count": count})
            current = week_end + timedelta(days=1)
    else:  # monthly
        # Group by months
        current = start.replace(day=1)
        while current <= end:
            if current.month == 12:
                next_month = current.replace(year=current.year + 1, month=1)
            else:
                next_month = current.replace(month=current.month + 1)
            month_end = min(next_month - timedelta(days=1), end)
            month_end_exclusive = month_end + td(days=1)
            count = (
                db.query(func.count())
                .filter(
                    WidgetAnalyticsEventDB.event == "tryon_generation_success",
                    WidgetAnalyticsEventDB.timestamp >= current,
                    WidgetAnalyticsEventDB.timestamp < month_end_exclusive,
                )
                .scalar()
            )
            trends.append({"date": current.isoformat(), "count": count})
            current = next_month
    # Top products (with name and image, in range)
    top_products_raw = (
        db.query(WidgetAnalyticsEventDB.product_id, func.count())
        .filter(
            WidgetAnalyticsEventDB.product_id != None,
            WidgetAnalyticsEventDB.timestamp >= start,
            WidgetAnalyticsEventDB.timestamp < end_exclusive,
        )
        .group_by(WidgetAnalyticsEventDB.product_id)
        .order_by(func.count().desc())
        .limit(5)
        .all()
    )
    top_products = []
    for row in top_products_raw:
        product_id, count = row
        product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
        if product:
            images = product.images.split(",") if product.images else []
            top_products.append(
                {
                    "productId": product_id,
                    "name": product.name,
                    "image": images[0] if images else None,
                    "count": count,
                }
            )
        else:
            top_products.append(
                {"productId": product_id, "name": product_id, "image": None, "count": count}
            )
    db.close()
    return {
        "kpis": {
            **counts,
            "prev": prev_counts,
            "start": start.isoformat(),
            "end": end.isoformat(),
            "prevStart": prev_start.isoformat(),
            "prevEnd": prev_end.isoformat(),
        },
        "trends": {
            "tryOns": trends,
        },
        "topProducts": top_products,
        "period": period,
    }


@router.post("/import/analyze-file")
async def analyze_file_data(
    file: UploadFile = File(...),
    field_mapping: str = Form(...),
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    """Analyze CSV or Excel data for import validation."""
    try:
        # Parse field mapping
        field_mapping_dict = json.loads(field_mapping)

        # Check file extension
        file_extension = file.filename.split(".")[-1].lower() if file.filename else ""

        # Read file content
        content = await file.read()

        # Parse data based on file type
        if file_extension in ["csv"]:
            # Handle CSV files
            text = content.decode("utf-8")
            lines = text.split("\n")
            lines = [line.strip() for line in lines if line.strip()]

            if len(lines) < 2:
                return {"error": "CSV file must have at least a header row and one data row"}

            # Parse headers and data
            headers = lines[0].split(",")
            headers = [h.strip() for h in headers]

            file_data = []
            for line in lines[1:]:
                values = line.split(",")
                values = [v.strip() for v in values]
                row = {}
                for i, header in enumerate(headers):
                    row[header] = values[i] if i < len(values) else ""
                file_data.append(row)

        elif file_extension in ["xlsx", "xls"]:
            # Handle Excel files
            try:
                df = pd.read_excel(io.BytesIO(content))
                if df.empty or len(df.columns) == 0:
                    return {"error": "Excel file is empty or has no data"}

                # Convert DataFrame to list of dictionaries
                headers = df.columns.tolist()
                file_data = df.to_dict("records")

                # Convert all values to strings for consistency
                for row in file_data:
                    for key in row:
                        if pd.isna(row[key]):
                            row[key] = ""
                        else:
                            row[key] = str(row[key]).strip()

            except Exception as e:
                return {"error": f"Failed to read Excel file: {str(e)}"}
        else:
            return {
                "error": f"Unsupported file format: {file_extension}. Supported formats: csv, xlsx, xls"
            }

        # Extract mapped field names
        name_field = field_mapping_dict.get("name", "")
        sku_field = field_mapping_dict.get("sku", "")
        price_field = field_mapping_dict.get("price", "")
        category_field = field_mapping_dict.get("category", "")
        image_url_field = field_mapping_dict.get("image_url", "")

        # Analyze the data
        total_rows = len(file_data)
        unique_skus = set()
        products_with_images = 0
        products_with_prices = 0
        products_with_categories = 0
        products_with_urls = 0
        price_range = {"min": None, "max": None}
        categories = set()

        # Track SKU duplicates and missing required fields
        sku_duplicates = {}
        missing_names = 0
        missing_skus = 0

        for row in file_data:
            # Count unique SKUs
            sku = row.get(sku_field, "").strip()
            if sku:
                unique_skus.add(sku)
                if sku in sku_duplicates:
                    sku_duplicates[sku] += 1
                else:
                    sku_duplicates[sku] = 1

            # Check required fields
            name = row.get(name_field, "").strip()
            if not name:
                missing_names += 1
            if not sku:
                missing_skus += 1

            # Count products with optional fields
            if row.get(image_url_field, "").strip():
                products_with_images += 1
            if row.get(price_field, "").strip():
                products_with_prices += 1
                try:
                    price = float(row.get(price_field, "0"))
                    if price_range["min"] is None or price < price_range["min"]:
                        price_range["min"] = price
                    if price_range["max"] is None or price > price_range["max"]:
                        price_range["max"] = price
                except (ValueError, TypeError):
                    pass
            if row.get(category_field, "").strip():
                products_with_categories += 1
                categories.add(row.get(category_field, "").strip())
            if row.get(field_mapping_dict.get("page_url", ""), "").strip():
                products_with_urls += 1

        # Find SKUs with multiple images
        skus_with_multiple_images = {
            sku: count for sku, count in sku_duplicates.items() if count > 1
        }

        # Calculate statistics
        stats = {
            "totalRows": total_rows,
            "uniqueSkus": len(unique_skus),
            "totalProducts": len(unique_skus),
            "productsWithImages": products_with_images,
            "productsWithPrices": products_with_prices,
            "productsWithCategories": products_with_categories,
            "productsWithUrls": products_with_urls,
            "missingNames": missing_names,
            "missingSkus": missing_skus,
            "priceRange": price_range,
            "categories": list(categories),
            "categoryCount": len(categories),
            "skusWithMultipleImages": len(skus_with_multiple_images),
            "imageDistribution": {
                "productsWith1Image": 0,
                "productsWith2Images": 0,
                "productsWith3PlusImages": 0,
            },
        }

        # Calculate image distribution
        for sku, count in sku_duplicates.items():
            if count == 1:
                stats["imageDistribution"]["productsWith1Image"] += 1
            elif count == 2:
                stats["imageDistribution"]["productsWith2Images"] += 1
            else:
                stats["imageDistribution"]["productsWith3PlusImages"] += 1

        # Validation warnings
        warnings = []
        if missing_names > 0:
            warnings.append(f"{missing_names} rows are missing product names")
        if missing_skus > 0:
            warnings.append(f"{missing_skus} rows are missing SKUs")
        if len(skus_with_multiple_images) > 0:
            warnings.append(
                f"{len(skus_with_multiple_images)} products have multiple images (this is expected)"
            )
        if not categories:
            warnings.append("No categories found in the data")

        return {
            "stats": stats,
            "warnings": warnings,
            "fieldMapping": field_mapping_dict,
            "fileType": file_extension,
        }

    except Exception as e:
        return {"error": f"Failed to analyze file data: {str(e)}"}


@router.post("/import/execute")
async def execute_import(
    file: UploadFile = File(...),
    field_mapping: str = Form(...),
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    """Execute the import by adding products to the database."""
    try:
        # Parse field mapping
        field_mapping_dict = json.loads(field_mapping)

        # Check file extension
        file_extension = file.filename.split(".")[-1].lower() if file.filename else ""

        # Read file content
        content = await file.read()

        # Parse data based on file type
        if file_extension in ["csv"]:
            # Handle CSV files
            text = content.decode("utf-8")
            lines = text.split("\n")
            lines = [line.strip() for line in lines if line.strip()]

            if len(lines) < 2:
                return {"error": "CSV file must have at least a header row and one data row"}

            # Parse headers and data
            headers = lines[0].split(",")
            headers = [h.strip() for h in headers]

            file_data = []
            for line in lines[1:]:
                values = line.split(",")
                values = [v.strip() for v in values]
                row = {}
                for i, header in enumerate(headers):
                    row[header] = values[i] if i < len(values) else ""
                file_data.append(row)

        elif file_extension in ["xlsx", "xls"]:
            # Handle Excel files
            try:
                df = pd.read_excel(io.BytesIO(content))
                if df.empty or len(df.columns) == 0:
                    return {"error": "Excel file is empty or has no data"}

                # Convert DataFrame to list of dictionaries
                headers = df.columns.tolist()
                file_data = df.to_dict("records")

                # Convert all values to strings for consistency
                for row in file_data:
                    for key in row:
                        if pd.isna(row[key]):
                            row[key] = ""
                        else:
                            row[key] = str(row[key]).strip()

            except Exception as e:
                return {"error": f"Failed to read Excel file: {str(e)}"}
        else:
            return {
                "error": f"Unsupported file format: {file_extension}. Supported formats: csv, xlsx, xls"
            }

        # Extract mapped field names
        name_field = field_mapping_dict.get("name", "")
        sku_field = field_mapping_dict.get("sku", "")
        price_field = field_mapping_dict.get("price", "")
        category_field = field_mapping_dict.get("category", "")
        image_url_field = field_mapping_dict.get("image_url", "")
        page_url_field = field_mapping_dict.get("page_url", "")

        # Group data by SKU to handle multiple images per product
        products_by_sku = {}

        for row in file_data:
            sku = row.get(sku_field, "").strip()
            if not sku:
                continue  # Skip rows without SKU

            if sku not in products_by_sku:
                products_by_sku[sku] = {
                    "name": row.get(name_field, "").strip(),
                    "sku": sku,
                    "price": None,
                    "page_url": row.get(page_url_field, "").strip(),
                    "category": row.get(category_field, "").strip(),
                    "images": [],
                }

                # Parse price if available
                price_str = row.get(price_field, "").strip()
                if price_str:
                    try:
                        products_by_sku[sku]["price"] = float(price_str)
                    except (ValueError, TypeError):
                        pass

            # Add image URL if available (filter out blob URLs and invalid URLs)
            image_url = row.get(image_url_field, "").strip()
            if image_url and image_url not in products_by_sku[sku]["images"]:
                # Filter out blob URLs and invalid URLs
                if not image_url.startswith("blob:") and not image_url.startswith("data:"):
                    # Basic validation - should be a valid URL or relative path
                    if (
                        image_url.startswith("http://")
                        or image_url.startswith("https://")
                        or image_url.startswith("/")
                    ):
                        products_by_sku[sku]["images"].append(image_url)
                    else:
                        # Skip invalid URLs
                        print(f"Skipping invalid image URL for SKU {sku}: {image_url}")

        # Import products to database
        imported_count = 0
        skipped_count = 0
        errors = []

        for sku, product_data in products_by_sku.items():
            try:
                # Check for duplicate SKU
                existing_product = (
                    db.query(ProductDB)
                    .filter(ProductDB.sku == sku, ProductDB.user_id == current_user.id)
                    .first()
                )

                if existing_product:
                    skipped_count += 1
                    continue

                # Create product
                db_product = ProductDB(
                    user_id=current_user.id,
                    name=product_data["name"],
                    sku=product_data["sku"],
                    price=product_data["price"],
                    page_url=product_data["page_url"] if product_data["page_url"] else None,
                    category=product_data["category"] if product_data["category"] else None,
                    images=store_images_field(product_data["images"]),
                )
                db.add(db_product)
                imported_count += 1

            except Exception as e:
                errors.append(f"Error importing {sku}: {str(e)}")

        # Commit all changes
        db.commit()

        return {
            "success": True,
            "imported": imported_count,
            "skipped": skipped_count,
            "errors": errors,
            "total_processed": len(products_by_sku),
        }

    except Exception as e:
        return {"error": f"Failed to execute import: {str(e)}"}
