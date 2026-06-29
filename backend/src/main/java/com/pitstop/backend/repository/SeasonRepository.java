package com.pitstop.backend.repository;

import com.pitstop.backend.entity.Season;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeasonRepository extends JpaRepository<Season, Integer> {

    @Query("SELECT s.year FROM Season s ORDER BY s.year DESC")
    List<Integer> findAllYearsDescending();
}