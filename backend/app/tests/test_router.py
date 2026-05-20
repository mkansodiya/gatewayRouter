import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import GatewayConfig, Transaction
from app.registry import registry
from app.router import router_service

class TestRouter(unittest.TestCase):
    def setUp(self):
        # Create an in-memory SQLite database for test runs
        self.engine = create_engine("sqlite:///:memory:")
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = TestingSessionLocal()
        
        # Initialize standard gateway configurations in the test DB
        # We sort them by sort_order and ID:
        # Order: imb (0), lgpay (1), okpay (2)
        self.imb_config = GatewayConfig(
            id="imb",
            name="IMB",
            is_active=True,
            sort_order=0,
            config_data={
                "user_token": "test_token",
                "host_url": "https://test.imb.org.in"
            }
        )
        self.lgpay_config = GatewayConfig(
            id="lgpay",
            name="LGPay",
            is_active=True,
            sort_order=1,
            config_data={
                "app_id": "YD5094",
                "key": "test_key",
                "trade_type": "INRUPI"
            }
        )
        self.okpay_config = GatewayConfig(
            id="okpay",
            name="OkPay",
            is_active=True,
            sort_order=2,
            config_data={
                "mch_id": "1000",
                "key": "test_key",
                "host": "https://test.okpay.one"
            }
        )
        
        self.db.add_all([self.imb_config, self.lgpay_config, self.okpay_config])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_registry_contains_gateways(self):
        # Verify the dynamic registry has discovered the mock gateways
        self.assertIn("imb", registry.get_all())
        self.assertIn("okpay", registry.get_all())
        self.assertIn("lgpay", registry.get_all())
        self.assertIn("jazpays", registry.get_all())

    def test_round_robin_sequence(self):
        # Sequence check: 1st -> imb, 2nd -> lgpay, 3rd -> okpay
        
        # 1st Transaction -> imb
        tx1 = router_service.route_and_process(self.db, "ref_1", 100.0, "Test Payment", "https://redirect.com")
        self.assertEqual(tx1.gateway_id, "imb")
        
        # 2nd Transaction -> lgpay
        tx2 = router_service.route_and_process(self.db, "ref_2", 100.0, "Test Payment", "https://redirect.com")
        self.assertEqual(tx2.gateway_id, "lgpay")
        
        # 3rd Transaction -> okpay
        tx3 = router_service.route_and_process(self.db, "ref_3", 100.0, "Test Payment", "https://redirect.com")
        self.assertEqual(tx3.gateway_id, "okpay")
        
        # 4th Transaction -> imb (Round-Robin loops back)
        tx4 = router_service.route_and_process(self.db, "ref_4", 100.0, "Test Payment", "https://redirect.com")
        self.assertEqual(tx4.gateway_id, "imb")

    def test_skip_inactive_gateway(self):
        # Disable LGPay
        lgpay_db = self.db.query(GatewayConfig).filter(GatewayConfig.id == "lgpay").first()
        lgpay_db.is_active = False
        self.db.commit()
        
        # 1st Transaction -> imb
        tx1 = router_service.route_and_process(self.db, "ref_1", 100.0, "Test Payment", "https://redirect.com")
        self.assertEqual(tx1.gateway_id, "imb")
        
        # 2nd Transaction -> okpay (lgpay is inactive and should be skipped)
        tx2 = router_service.route_and_process(self.db, "ref_2", 100.0, "Test Payment", "https://redirect.com")
        self.assertEqual(tx2.gateway_id, "okpay")
        
        # 3rd Transaction -> imb (Loops back)
        tx3 = router_service.route_and_process(self.db, "ref_3", 100.0, "Test Payment", "https://redirect.com")
        self.assertEqual(tx3.gateway_id, "imb")
