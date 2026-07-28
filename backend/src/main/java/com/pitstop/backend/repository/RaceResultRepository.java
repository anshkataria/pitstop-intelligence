package com.pitstop.backend.repository;

import com.pitstop.backend.entity.RaceResult;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RaceResultRepository extends JpaRepository<RaceResult, Long> {
    @EntityGraph(attributePaths = {"race", "race.season"})
    Optional<RaceResult> findTopByRaceSeasonYearOrderByRaceRoundDesc(Integer year);

    @EntityGraph(attributePaths = {"race", "race.season", "driver", "constructor"})
    List<RaceResult> findByRaceIdOrderByFinishPositionAsc(Long raceId);

    @EntityGraph(attributePaths = {"race", "race.season", "driver", "constructor"})
    List<RaceResult> findByRaceSeasonYearAndRaceRoundOrderByFinishPositionAsc(Integer year, Integer round);

    @EntityGraph(attributePaths = {"race", "race.season", "driver", "constructor"})
    List<RaceResult> findByRaceSeasonYearAndRaceRoundOrderByGridPositionAsc(Integer year, Integer round);

    @EntityGraph(attributePaths = {"race", "race.season", "driver", "constructor"})
    List<RaceResult> findByDriverIdAndRaceSeasonYearOrderByRaceRoundAsc(Long driverId, Integer year);

    @EntityGraph(attributePaths = {"race", "race.season", "driver", "constructor"})
    List<RaceResult> findByConstructorIdAndRaceSeasonYearOrderByRaceRoundAsc(Long constructorId, Integer year);

    @EntityGraph(attributePaths = {"race", "race.season", "driver", "constructor"})
    List<RaceResult> findByRaceSeasonYearOrderByRaceRoundAscFinishPositionAsc(Integer year);

    List<RaceResult> findByDriverIdIn(List<Long> driverIds);
}
