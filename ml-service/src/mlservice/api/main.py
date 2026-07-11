import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from mlservice.config import get_settings
from mlservice.ml.predictor import RacePredictor
from mlservice.api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)

settings = get_settings()
predictor = RacePredictor(model_path=settings.model_path)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ML service starting up")
    try:
        predictor.load()
        logger.info("Model loaded successfully on startup")
    except FileNotFoundError:
        logger.warning(
            "No model found at startup — POST /train to train one"
        )

    yield

    logger.info("ML service shutting down")


app = FastAPI(
    title="PitStop Intelligence — ML Service",
    description="F1 race position prediction API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/v1")