package com.pitstop.backend.repository;

import com.pitstop.backend.entity.RaceResult;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RaceResultRepository extends JpaRepository<RaceResult, Long> {
    @EntityGraph(attributePaths = {"race", "race.season"})
    Optional<RaceResult> findTopByRaceSeasonYearOrderByRaceRoundDesc(Integer year);

    /**
     * Driver/constructor lineup from the most recent race before the given date that
     * actually has results, used as a default candidate grid for a race that hasn't
     * happened yet (there's no qualifying/entry-list ingestion, so the last known
     * lineup is the best available starting point).
     */
    @EntityGraph(attributePaths = {"race", "race.season", "driver", "constructor"})
    @Query("""
            SELECT rr FROM RaceResult rr
            WHERE rr.race.raceDate = (
                SELECT MAX(r2.raceDate) FROM Race r2
                WHERE r2.raceDate < :beforeDate
                  AND EXISTS (SELECT 1 FROM RaceResult rr2 WHERE rr2.race = r2)
            )
            ORDER BY rr.finishPosition ASC NULLS LAST
            """)
    List<RaceResult> findMostRecentCompletedEntriesBefore(@Param("beforeDate") LocalDate beforeDate);

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
