from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "pitstop"
    db_user: str = "pitstop"
    db_password: str = "pitstop_dev_password"

    mlflow_tracking_uri: str = "file:./mlruns"
    model_path: str = "./models/race_predictor.json"
    experiment_name: str = "f1_race_position"

    min_seasons_for_training: int = 2

    class Config:
        env_file = ".env"
        protected_namespaces = ()

    def db_dsn(self) -> str:
        return (
            f"host={self.db_host} "
            f"port={self.db_port} "
            f"dbname={self.db_name} "
            f"user={self.db_user} "
            f"password={self.db_password}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()