package com.pitstop.backend.service;

import com.pitstop.backend.entity.Constructor;
import com.pitstop.backend.entity.Driver;
import com.pitstop.backend.entity.Race;
import com.pitstop.backend.entity.RaceResult;
import com.pitstop.backend.entity.Season;
import com.pitstop.backend.repository.RaceResultRepository;
import com.pitstop.backend.repository.SeasonRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StandingsServiceTest {
    @Mock RaceResultRepository results;
    @Mock SeasonRepository seasons;
    @InjectMocks StandingsService standingsService;

    @Test
    void ranksDriversByPointsAndCalculatesSeasonMetrics() {
        var redBull = constructor(1L, "red_bull", "Red Bull Racing");
        var ferrari = constructor(2L, "ferrari", "Ferrari");
        var max = driver(1L, "verstappen", "Max", "Verstappen");
        var charles = driver(2L, "leclerc", "Charles", "Leclerc");
        var race = race(1L, 2024, 1);
        var secondRace = race(2L, 2024, 2);

        when(seasons.existsById(2024)).thenReturn(true);
        when(results.findByRaceSeasonYearOrderByRaceRoundAscFinishPositionAsc(2024)).thenReturn(List.of(
            result(race, max, redBull, 1, "25"),
            result(secondRace, max, redBull, 2, "18"),
            result(race, charles, ferrari, 2, "18"),
            result(secondRace, charles, ferrari, 3, "15")
        ));

        var standings = standingsService.driverStandings(2024);

        assertThat(standings).hasSize(2);
        assertThat(standings.getFirst().getDriverRef()).isEqualTo("verstappen");
        assertThat(standings.getFirst().getPosition()).isEqualTo(1);
        assertThat(standings.getFirst().getPoints()).isEqualByComparingTo("43");
        assertThat(standings.getFirst().getWins()).isEqualTo(1);
        assertThat(standings.getFirst().getPodiums()).isEqualTo(2);
        assertThat(standings.getFirst().getRacesEntered()).isEqualTo(2);
    }

    @Test
    void combinesBothDriversIntoOneConstructorStanding() {
        var team = constructor(1L, "mclaren", "McLaren");
        var race = race(1L, 2024, 1);
        when(seasons.existsById(2024)).thenReturn(true);
        when(results.findByRaceSeasonYearOrderByRaceRoundAscFinishPositionAsc(2024)).thenReturn(List.of(
            result(race, driver(1L, "norris", "Lando", "Norris"), team, 1, "25"),
            result(race, driver(2L, "piastri", "Oscar", "Piastri"), team, 3, "15")
        ));

        var standings = standingsService.constructorStandings(2024);

        assertThat(standings).singleElement().satisfies(row -> {
            assertThat(row.getConstructorName()).isEqualTo("McLaren");
            assertThat(row.getPoints()).isEqualByComparingTo("40");
            assertThat(row.getWins()).isEqualTo(1);
            assertThat(row.getPodiums()).isEqualTo(2);
            assertThat(row.getRacesEntered()).isEqualTo(1);
        });
    }

    private Constructor constructor(Long id, String ref, String name) {
        return Constructor.builder().id(id).constructorRef(ref).name(name).nationality("British").build();
    }

    private Driver driver(Long id, String ref, String firstName, String lastName) {
        return Driver.builder().id(id).driverRef(ref).firstName(firstName).lastName(lastName).build();
    }

    private Race race(Long id, int year, int round) {
        return Race.builder().id(id).season(Season.builder().year(year).build()).round(round).build();
    }

    private RaceResult result(
        Race race, Driver driver, Constructor constructor, int finishPosition, String points
    ) {
        return RaceResult.builder().race(race).driver(driver).constructor(constructor)
            .finishPosition(finishPosition).points(new BigDecimal(points)).build();
    }
}
