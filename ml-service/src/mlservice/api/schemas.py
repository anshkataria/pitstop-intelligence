from pydantic import BaseModel, ConfigDict, Field, field_validator

# F1 grid size as of the 2026 season (Cadillac's entry brought the field to 22 cars).
MAX_GRID_SIZE = 22


class ApiModel(BaseModel):
    model_config = ConfigDict(protected_namespaces=())


class DriverEntry(ApiModel):
    driver_ref: str = Field(..., min_length=1, max_length=50, examples=["hamilton"])
    constructor_ref: str = Field(..., min_length=1, max_length=50, examples=["mercedes"])
    circuit_name: str = Field(..., min_length=1, examples=["Bahrain International Circuit"])
    driver_nationality: str = Field(..., min_length=1, examples=["British"])
    constructor_nationality: str = Field(..., min_length=1, examples=["German"])
    grid_position: int = Field(..., ge=1, le=MAX_GRID_SIZE, examples=[1])
    season_year: int = Field(..., ge=1950, le=2100, examples=[2024])
    round: int = Field(..., ge=1, le=30, examples=[1])


class PredictionRequest(ApiModel):
    entries: list[DriverEntry] = Field(..., min_length=1, max_length=MAX_GRID_SIZE)

    @field_validator("entries")
    @classmethod
    def validate_unique_drivers(cls, entries: list[DriverEntry]) -> list[DriverEntry]:
        refs = [e.driver_ref for e in entries]
        if len(refs) != len(set(refs)):
            raise ValueError("Duplicate driver_ref values in entries")
        return entries


class PredictionResult(ApiModel):
    driver_ref: str
    constructor_ref: str
    grid_position: int
    predicted_position: float
    predicted_position_rounded: int
    confidence_range_low: int
    confidence_range_high: int


class PredictionResponse(ApiModel):
    prediction_run_id: int
    predictions: list[PredictionResult]
    model_loaded: bool
    model_version: str


class HealthResponse(ApiModel):
    status: str
    model_loaded: bool
    service: str = "pitstop-ml-service"


class TrainResponse(ApiModel):
    status: str
    message: str
    model_version: str
    confidence_margin: int
