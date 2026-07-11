package com.pitstop.backend.repository;

import com.pitstop.backend.entity.Race;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RaceRepository extends JpaRepository<Race, Long> {

    List<Race> findBySeasonYearOrderByRoundAsc(Integer year);

    Optional<Race> findBySeasonYearAndRound(Integer year, Integer round);

    Optional<Race> findTopBySeasonYearOrderByRoundDesc(Integer year);

    @Query("SELECT r FROM Race r JOIN FETCH r.season WHERE r.season.year = :year ORDER BY r.round ASC")
    List<Race> findBySeasonYearWithSeason(@Param("year") Integer year);

    Page<Race> findByCountry(String country, Pageable pageable);
}
