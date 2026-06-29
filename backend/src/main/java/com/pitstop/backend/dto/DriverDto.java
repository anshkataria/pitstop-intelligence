package com.pitstop.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;
import lombok.Data;

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
}