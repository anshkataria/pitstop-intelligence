package com.pitstop.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "race_results", uniqueConstraints = @UniqueConstraint(columnNames = {"race_id", "driver_id"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RaceResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "race_id", nullable = false)
    private Race race;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "driver_id", nullable = false)
    private Driver driver;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "constructor_id", nullable = false)
    private Constructor constructor;

    @Column(name = "grid_position")
    private Integer gridPosition;

    @Column(name = "finish_position")
    private Integer finishPosition;

    @Column(precision = 5, scale = 2)
    private BigDecimal points;

    @Column(length = 100)
    private String status;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
