package com.pitstop.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "prediction_results")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PredictionResultRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "prediction_run_id", nullable = false)
    private PredictionRun run;
    @Column(name = "driver_ref", nullable = false)
    private String driverRef;
    @Column(name = "constructor_ref", nullable = false)
    private String constructorRef;
    @Column(name = "grid_position", nullable = false)
    private Integer gridPosition;
    @Column(name = "predicted_position", nullable = false)
    private BigDecimal predictedPosition;
    @Column(name = "predicted_position_rounded", nullable = false)
    private Integer predictedPositionRounded;
    @Column(name = "confidence_range_low", nullable = false)
    private Integer confidenceRangeLow;
    @Column(name = "confidence_range_high", nullable = false)
    private Integer confidenceRangeHigh;
}
