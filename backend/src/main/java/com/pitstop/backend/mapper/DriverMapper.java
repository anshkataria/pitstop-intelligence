package com.pitstop.backend.mapper;

import com.pitstop.backend.dto.DriverDto;
import com.pitstop.backend.entity.Driver;
import org.springframework.stereotype.Component;

@Component
public class DriverMapper {

    public DriverDto toDto(Driver driver) {
        return DriverDto.builder()
                .id(driver.getId())
                .driverRef(driver.getDriverRef())
                .firstName(driver.getFirstName())
                .lastName(driver.getLastName())
                .fullName(driver.getFirstName() + " " + driver.getLastName())
                .nationality(driver.getNationality())
                .dateOfBirth(driver.getDateOfBirth())
                .build();
    }
}