package com.pitstop.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class ConstructorStandingDto {
    Integer position;
    Long constructorId;
    String constructorRef;
    String constructorName;
    String nationality;
    BigDecimal points;
    long wins;
    long podiums;
    long racesEntered;
}
