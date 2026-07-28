package com.pitstop.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class DriverDto {

    Long id;
    String driverRef;
    String firstName;
    String lastName;
    String fullName;
    String nationality;

    @JsonFormat(pattern = "yyyy-MM-dd")
    LocalDate dateOfBirth;

    /** Career totals across every ingested season. Populated on the roster/search listing only. */
    @Builder.Default
    long wins = 0;
    @Builder.Default
    long podiums = 0;
    @Builder.Default
    BigDecimal points = BigDecimal.ZERO;
}