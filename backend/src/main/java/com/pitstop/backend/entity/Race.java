package com.pitstop.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "races",
       uniqueConstraints = @UniqueConstraint(columnNames = {"season_year", "round"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Race {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_year", nullable = false)
    private Season season;

    @Column(nullable = false)
    private Integer round;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "circuit_name", length = 200)
    private String circuitName;

    @Column(length = 100)
    private String country;

    @Column(name = "race_date")
    private LocalDate raceDate;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}