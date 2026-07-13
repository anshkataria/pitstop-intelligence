package com.pitstop.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "prediction_runs")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PredictionRun {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "season_year", nullable = false)
    private Integer seasonYear;
    @Column(nullable = false)
    private Integer round;
    @Column(name = "circuit_name", nullable = false)
    private String circuitName;
    @Column(name = "model_version")
    private String modelVersion;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @OneToMany(mappedBy = "run", fetch = FetchType.LAZY)
    @OrderBy("predictedPositionRounded ASC")
    @Builder.Default
    private List<PredictionResultRecord> results = new ArrayList<>();
}
