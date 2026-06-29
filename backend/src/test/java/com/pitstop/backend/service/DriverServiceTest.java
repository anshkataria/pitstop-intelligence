package com.pitstop.backend.service;

import com.pitstop.backend.dto.DriverDto;
import com.pitstop.backend.entity.Driver;
import com.pitstop.backend.exception.ResourceNotFoundException;
import com.pitstop.backend.mapper.DriverMapper;
import com.pitstop.backend.repository.DriverRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DriverServiceTest {

    @Mock
    private DriverRepository driverRepository;

    @Mock
    private DriverMapper driverMapper;

    @InjectMocks
    private DriverService driverService;

    private Driver sampleDriver;
    private DriverDto sampleDriverDto;

    @BeforeEach
    void setUp() {
        sampleDriver = Driver.builder()
                .id(1L)
                .driverRef("hamilton")
                .firstName("Lewis")
                .lastName("Hamilton")
                .nationality("British")
                .dateOfBirth(LocalDate.of(1985, 1, 7))
                .build();

        sampleDriverDto = DriverDto.builder()
                .id(1L)
                .driverRef("hamilton")
                .firstName("Lewis")
                .lastName("Hamilton")
                .fullName("Lewis Hamilton")
                .nationality("British")
                .dateOfBirth(LocalDate.of(1985, 1, 7))
                .build();
    }

    @Test
    @DisplayName("findById returns DriverDto when driver exists")
    void findById_whenDriverExists_returnsDto() {
        when(driverRepository.findById(1L)).thenReturn(Optional.of(sampleDriver));
        when(driverMapper.toDto(sampleDriver)).thenReturn(sampleDriverDto);

        DriverDto result = driverService.findById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getDriverRef()).isEqualTo("hamilton");
        assertThat(result.getFullName()).isEqualTo("Lewis Hamilton");
    }

    @Test
    @DisplayName("findById throws ResourceNotFoundException when driver does not exist")
    void findById_whenDriverMissing_throwsNotFoundException() {
        when(driverRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> driverService.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Driver")
                .hasMessageContaining("99");
    }

    @Test
    @DisplayName("findByRef returns DriverDto when ref matches")
    void findByRef_whenRefExists_returnsDto() {
        when(driverRepository.findByDriverRef("hamilton")).thenReturn(Optional.of(sampleDriver));
        when(driverMapper.toDto(sampleDriver)).thenReturn(sampleDriverDto);

        DriverDto result = driverService.findByRef("hamilton");

        assertThat(result.getDriverRef()).isEqualTo("hamilton");
    }

    @Test
    @DisplayName("findByRef throws ResourceNotFoundException for unknown ref")
    void findByRef_whenRefMissing_throwsNotFoundException() {
        when(driverRepository.findByDriverRef("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> driverService.findByRef("unknown"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Driver")
                .hasMessageContaining("unknown");
    }
}