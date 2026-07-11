package com.pitstop.backend.service;

import com.pitstop.backend.dto.DriverSeasonStatsDto;
import com.pitstop.backend.entity.*;
import com.pitstop.backend.repository.DriverRepository;
import com.pitstop.backend.repository.RaceRepository;
import com.pitstop.backend.repository.RaceResultRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RaceResultServiceTest {
    @Mock RaceResultRepository resultRepository;
    @Mock RaceRepository raceRepository;
    @Mock DriverRepository driverRepository;

    @Test
    void calculatesDriverSeasonStats() {
        Driver driver = Driver.builder().id(1L).firstName("Test").lastName("Driver").build();
        List<RaceResult> results = List.of(
                result(driver, 1, 1, "Finished", "25"),
                result(driver, 3, 2, "Finished", "15"),
                result(driver, 8, 4, "Engine", "0")
        );
        when(driverRepository.existsById(1L)).thenReturn(true);
        when(resultRepository.findByDriverIdAndRaceSeasonYearOrderByRaceRoundAsc(1L, 2024)).thenReturn(results);

        RaceResultService service = new RaceResultService(resultRepository, raceRepository, driverRepository);
        DriverSeasonStatsDto stats = service.getDriverStats(1L, 2024);

        assertThat(stats.getRacesEntered()).isEqualTo(3);
        assertThat(stats.getPoints()).isEqualByComparingTo("40");
        assertThat(stats.getWins()).isEqualTo(1);
        assertThat(stats.getPodiums()).isEqualTo(2);
        assertThat(stats.getPolePositions()).isEqualTo(1);
        assertThat(stats.getDnfs()).isEqualTo(1);
        assertThat(stats.getAverageFinish()).isEqualTo(4.0);
    }

    private RaceResult result(Driver driver, int finish, int grid, String status, String points) {
        return RaceResult.builder().driver(driver).finishPosition(finish).gridPosition(grid)
                .status(status).points(new BigDecimal(points)).build();
    }
}
