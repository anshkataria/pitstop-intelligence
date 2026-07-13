import logging
from time import perf_counter
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from mlservice.config import get_settings
from mlservice.ml.predictor import RacePredictor
from mlservice.api.routes import router
from mlservice.observability import (
    HTTP_DURATION,
    HTTP_REQUESTS,
    MODEL_LOADED,
    MODEL_INFO,
    REQUEST_ID_HEADER,
    configure_logging,
    normalize_request_id,
    request_id_context,
)

configure_logging()

logger = logging.getLogger(__name__)

settings = get_settings()
predictor = RacePredictor(model_path=settings.model_path)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ML service starting up")
    try:
        predictor.load()
        MODEL_LOADED.set(1)
        MODEL_INFO.info({"version": predictor.model_version or "unknown"})
        logger.info("Model loaded successfully on startup")
    except FileNotFoundError:
        MODEL_LOADED.set(0)
        MODEL_INFO.info({"version": "none"})
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
    allow_origins=settings.cors_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def observe_request(request: Request, call_next):
    request_id = normalize_request_id(request.headers.get(REQUEST_ID_HEADER))
    context_token = request_id_context.set(request_id)
    started = perf_counter()
    route = "unmatched"
    status = 500
    try:
        response = await call_next(request)
        status = response.status_code
        route_object = request.scope.get("route")
        route = getattr(route_object, "path", route)
        response.headers[REQUEST_ID_HEADER] = request_id
        return response
    except Exception:
        logger.exception("request failed")
        raise
    finally:
        duration = perf_counter() - started
        if request.url.path != "/metrics":
            HTTP_REQUESTS.labels(request.method, route, str(status)).inc()
            HTTP_DURATION.labels(request.method, route).observe(duration)
            logger.info(
                "request completed",
                extra={
                    "http_method": request.method,
                    "http_route": route,
                    "http_status": status,
                    "duration_ms": round(duration * 1000, 2),
                },
            )
        request_id_context.reset(context_token)

app.include_router(router, prefix="/v1")
app.mount("/metrics", make_asgi_app())
