import sqlite3

conn = sqlite3.connect("api/db.sqlite")
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS usage_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    credits_used REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    action TEXT
)
""")

conn.commit()
conn.close()
print("usage_logs table created (if it didn't exist).")
