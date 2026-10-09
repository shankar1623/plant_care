import os
import sys
from pathlib import Path

# Set up python path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.database import SessionLocal, engine
from app.models import TreatmentCheckin, TreatmentPlan, Diagnosis, OutbreakReport, User

def clear_database():
    print("Clearing all data in PostgreSQL database...")
    db = SessionLocal()
    try:
        # Delete in order of foreign key relationships
        checkins_count = db.query(TreatmentCheckin).delete()
        plans_count = db.query(TreatmentPlan).delete()
        diags_count = db.query(Diagnosis).delete()
        outbreaks_count = db.query(OutbreakReport).delete()
        users_count = db.query(User).delete()
        db.commit()

        print(f"Deleted {checkins_count} treatment check-ins.")
        print(f"Deleted {plans_count} treatment plans.")
        print(f"Deleted {diags_count} diagnoses.")
        print(f"Deleted {outbreaks_count} outbreak reports.")
        print(f"Deleted {users_count} users.")
        print("Database successfully cleared!")
    except Exception as e:
        db.rollback()
        print(f"Error clearing PostgreSQL database: {e}")
    finally:
        db.close()

    # Also clean local sqlite plantcare.db if exists
    sqlite_file = BASE_DIR / "plantcare.db"
    if sqlite_file.exists():
        import sqlite3
        try:
            conn = sqlite3.connect(sqlite_file)
            c = conn.cursor()
            for table in ["treatment_checkins", "treatment_plans", "diagnoses", "outbreak_reports", "users"]:
                try:
                    c.execute(f"DELETE FROM {table}")
                except Exception:
                    pass
            conn.commit()
            conn.close()
            print("Local SQLite plantcare.db cleared as well.")
        except Exception as e:
            print("SQLite note:", e)

if __name__ == "__main__":
    clear_database()
