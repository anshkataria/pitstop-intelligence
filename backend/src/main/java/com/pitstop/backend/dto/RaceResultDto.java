package com.pitstop.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class RaceResultDto {
    Long id;
    Long raceId;
    Integer seasonYear;
    Integer round;
    Long driverId;
    String driverRef;
    String driverName;
    Long constructorId;
    String constructorRef;
    String constructorName;
    Integer gridPosition;
    Integer finishPosition;
    BigDecimal points;
    String status;
}
