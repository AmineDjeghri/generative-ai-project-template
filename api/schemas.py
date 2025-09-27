from pydantic import BaseModel
from typing import Optional, List


class User(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    username: str
    credits: float


class CreditBalance(BaseModel):
    credits: float


class CreditPurchaseRequest(BaseModel):
    package_id: str
    amount: float
    credits: float


class CreditInvoice(BaseModel):
    id: str
    date: str
    amount: float
    description: str
    downloadUrl: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str


class ProductCreate(BaseModel):
    name: str
    sku: str
    price: Optional[float] = None
    page_url: Optional[str] = None
    category: Optional[str] = None
    images: List[str]


# For multipart form data (when uploading images with product)
class ProductFormData(BaseModel):
    name: str
    sku: str
    price: Optional[float] = None
    page_url: Optional[str] = None
    category: Optional[str] = None


class WidgetConfig(BaseModel):
    # Colors
    primary_color: str
    secondary_color: str
    background_color: str
    text_color: str

    # Typography
    font_family: str
    font_size: str
    font_weight: str

    # Button styles
    button_style: str  # 'rounded', 'square', 'pill'
    button_size: str  # 'small', 'medium', 'large'
    button_text: str

    # Layout
    widget_size: str  # 'small', 'medium', 'large'
    position: str  # 'bottom-right', 'bottom-left', 'top-right', 'top-left', 'center'

    # Content
    title: str
    subtitle: str
    call_to_action: str

    # Features
    show_branding: bool
    enable_ar: bool
    enable_sharing: bool

    # Animation
    animation_type: str  # 'fade', 'slide', 'bounce', 'none'
    animation_speed: str  # 'slow', 'normal', 'fast'
