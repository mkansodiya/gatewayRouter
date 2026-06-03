import sys
import os

# Add the backend directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import GatewayConfig

def seed():
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if paycrm already exists
        paycrm = db.query(GatewayConfig).filter(GatewayConfig.id == "paycrm").first()
        
        if not paycrm:
            print("Seeding paycrm gateway...")
            paycrm = GatewayConfig(
                id="paycrm",
                name="Pay-CRM",
                is_active=True,
                sort_order=1,
                config_data={
                    "project_id": "YOUR_PROJECT_ID",
                    "apikey": "YOUR_API_KEY",
                    "host": "https://pay-crm.com"
                },
                credentials_schema=[
                    {
                        "name": "project_id",
                        "label": "Project ID",
                        "type": "text",
                        "placeholder": "e.g. 6515219"
                    },
                    {
                        "name": "apikey",
                        "label": "API Key",
                        "type": "password",
                        "placeholder": "e.g. d4f98943ccdde024d253d14dd3c54261"
                    },
                    {
                        "name": "host",
                        "label": "API Host URL",
                        "type": "url",
                        "placeholder": "https://pay-crm.com"
                    }
                ]
            )
            db.add(paycrm)
            db.commit()
            print("paycrm gateway seeded successfully.")
        else:
            print("paycrm gateway already exists in the database.")
            
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
