import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class DatabaseConfig:
    host: str
    port: int
    name: str
    user: str
    password: str

    def dsn(self) -> str:
        return (
            f"host={self.host} "
            f"port={self.port} "
            f"dbname={self.name} "
            f"user={self.user} "
            f"password={self.password}"
        )


@dataclass(frozen=True)
class ErgastConfig:
    base_url: str
    seasons: list[int]


@dataclass(frozen=True)
class AppConfig:
    db: DatabaseConfig
    ergast: ErgastConfig


def load_config() -> AppConfig:
    seasons_raw = os.getenv("SEASONS_TO_FETCH", "2023,2024")
    try:
        seasons = sorted({int(y.strip()) for y in seasons_raw.split(",") if y.strip()})
    except ValueError as exc:
        raise ValueError("SEASONS_TO_FETCH must be a comma-separated list of years") from exc
    if not seasons or any(year < 1950 or year > 2100 for year in seasons):
        raise ValueError("SEASONS_TO_FETCH contains no valid Formula 1 season years")

    return AppConfig(
        db=DatabaseConfig(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", "5432")),
            name=os.getenv("DB_NAME", "pitstop"),
            user=os.getenv("DB_USER", "pitstop"),
            password=os.getenv("DB_PASSWORD", "pitstop_dev_password"),
        ),
        ergast=ErgastConfig(
            base_url=os.getenv("ERGAST_BASE_URL", "https://api.jolpi.ca/ergast/f1"),
            seasons=seasons,
        ),
    )
