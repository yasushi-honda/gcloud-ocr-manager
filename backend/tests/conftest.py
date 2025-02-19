import pytest
import os

@pytest.fixture(autouse=True)
def setup_emulators():
    """テスト用のエミュレータ設定"""
    # 認証を無効化
    os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"
    os.environ["BIGQUERY_EMULATOR_HOST"] = "localhost:9050"
    os.environ["GOOGLE_CLOUD_PROJECT"] = "local-test-project"
    
    # 認証を無効化
    os.environ["STORAGE_EMULATOR_HOST"] = "localhost:9000"
    os.environ["PUBSUB_EMULATOR_HOST"] = "localhost:8085"
    
    # BigQueryエミュレータの設定
    os.environ["BIGQUERY_DATASET_ID"] = "ocr_data"
    os.environ["BIGQUERY_PROJECT_ID"] = "local-test-project"
    
    # 認証をスキップ
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = ""
