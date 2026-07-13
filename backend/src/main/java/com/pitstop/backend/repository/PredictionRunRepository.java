package com.pitstop.backend.repository;

import com.pitstop.backend.entity.PredictionRun;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PredictionRunRepository extends JpaRepository<PredictionRun, Long> {
    @EntityGraph(attributePaths = "results")
    List<PredictionRun> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "results")
    Optional<PredictionRun> findById(Long id);
}
