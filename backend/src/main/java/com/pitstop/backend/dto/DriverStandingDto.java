package com.pitstop.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class DriverStandingDto {
    Integer position;
    Long driverId;
    String driverRef;
    String driverName;
    Long constructorId;
    String constructorName;
    BigDecimal points;
    long wins;
    long podiums;
    long racesEntered;
}
