package com.pitstop.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PredictionContextEntryDto {
    Long driverId;
    String driverRef;
    String driverName;
    String driverNationality;
    Long constructorId;
    String constructorRef;
    String constructorName;
    String constructorNationality;
    Integer gridPosition;
}
