import sqlite3

DB_PATH = "../api/db.sqlite"  # Adjust path if needed

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Check if 'credits' column exists
cursor.execute("PRAGMA table_info(users);")
columns = [col[1] for col in cursor.fetchall()]

if "credits" not in columns:
    print("Adding 'credits' column to users table...")
    cursor.execute("ALTER TABLE users ADD COLUMN credits REAL DEFAULT 0;")
    conn.commit()
    print("Column added.")
else:
    print("'credits' column already exists. No action taken.")

conn.close()
