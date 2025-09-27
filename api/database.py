from sqlalchemy import create_engine, Column, String, Float, JSON, DateTime, Integer, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
import uuid
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./db.sqlite"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class UserDB(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    credits = Column(Float, default=0)  # New field for prepaid credits


class ProductDB(Base):
    __tablename__ = "products"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)  # Link to UserDB.id
    name = Column(String, nullable=False)
    sku = Column(String, unique=True, index=True, nullable=False)
    price = Column(Float, nullable=True)
    page_url = Column(String, nullable=True)
    category = Column(String, nullable=True)
    images = Column(String, nullable=True)  # JSON array of image URLs or comma-separated (legacy)


class WidgetConfigDB(Base):
    __tablename__ = "widget_configs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)  # Link to UserDB.id
    api_key = Column(String, unique=True, nullable=True)
    config = Column(JSON, nullable=False, default=dict)


class UsageLogDB(Base):
    __tablename__ = "usage_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    credits_used = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    action = Column(String, nullable=True)  # e.g., 'generate_image'


class CreditPurchaseDB(Base):
    __tablename__ = "credit_purchases"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stripe_session_id = Column(String, nullable=True)
    stripe_charge_id = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    credits = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    description = Column(String, nullable=True)
    status = Column(String, nullable=True)
    download_url = Column(String, nullable=True)


class WidgetAnalyticsEventDB(Base):
    __tablename__ = "widget_analytics_events"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, nullable=False)
    event = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    product_id = Column(String, nullable=True)
    event_data = Column(JSON, nullable=True)  # Renamed from 'metadata'
    visitor_id = Column(String, nullable=True)
    session_visitor_id = Column(String, nullable=True)


Base.metadata.create_all(bind=engine)
