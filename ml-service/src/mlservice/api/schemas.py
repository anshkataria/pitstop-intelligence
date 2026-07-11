from pydantic import BaseModel, Field, field_validator


class DriverEntry(BaseModel):
    driver_ref: str = Field(..., min_length=1, max_length=50, examples=["hamilton"])
    constructor_ref: str = Field(..., min_length=1, max_length=50, examples=["mercedes"])
    circuit_name: str = Field(..., min_length=1, examples=["Bahrain International Circuit"])
    driver_nationality: str = Field(..., min_length=1, examples=["British"])
    constructor_nationality: str = Field(..., min_length=1, examples=["German"])
    grid_position: int = Field(..., ge=1, le=20, examples=[1])
    season_year: int = Field(..., ge=1950, le=2100, examples=[2024])
    round: int = Field(..., ge=1, le=30, examples=[1])


class PredictionRequest(BaseModel):
    entries: list[DriverEntry] = Field(..., min_length=1, max_length=20)

    @field_validator("entries")
    @classmethod
    def validate_unique_drivers(cls, entries: list[DriverEntry]) -> list[DriverEntry]:
        refs = [e.driver_ref for e in entries]
        if len(refs) != len(set(refs)):
            raise ValueError("Duplicate driver_ref values in entries")
        return entries


class PredictionResult(BaseModel):
    driver_ref: str
    constructor_ref: str
    grid_position: int
    predicted_position: float
    predicted_position_rounded: int
    confidence_range_low: int
    confidence_range_high: int


class PredictionResponse(BaseModel):
    predictions: list[PredictionResult]
    model_loaded: bool


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    service: str = "pitstop-ml-service"


class TrainResponse(BaseModel):
    status: str
    message: str