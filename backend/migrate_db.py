import sqlite3
from pathlib import Path

db_path = Path(__file__).parent / "plantcare.db"
if db_path.exists():
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    print("Diagnoses user_ids:")
    for row in c.execute("SELECT DISTINCT user_id FROM diagnoses").fetchall():
        print("  -", row)
    print("Treatment Plans user_ids:")
    for row in c.execute("SELECT DISTINCT user_id FROM treatment_plans").fetchall():
        print("  -", row)
    
    # Assign all existing scans and treatment plans to 'usr_ram'
    c.execute("UPDATE diagnoses SET user_id = 'usr_ram'")
    c.execute("UPDATE treatment_plans SET user_id = 'usr_ram'")
    c.execute("UPDATE outbreak_reports SET user_id = 'usr_ram'")
    conn.commit()
    print("Updated all legacy records to 'usr_ram'. Total changes:", conn.total_changes)
    conn.close()
