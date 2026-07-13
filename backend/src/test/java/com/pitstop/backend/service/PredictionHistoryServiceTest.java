package com.pitstop.backend.service;

import com.pitstop.backend.entity.PredictionResultRecord;
import com.pitstop.backend.entity.PredictionRun;
import com.pitstop.backend.repository.PredictionRunRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PredictionHistoryServiceTest {
    @Mock PredictionRunRepository repository;
    @InjectMocks PredictionHistoryService service;

    @Test
    void limitsHistoryRequestsAndReturnsResultCount() {
        PredictionRun run = run();
        ArgumentCaptor<Pageable> page = ArgumentCaptor.forClass(Pageable.class);
        when(repository.findAllByOrderByCreatedAtDesc(page.capture())).thenReturn(List.of(run));

        var history = service.latest(500);

        assertThat(page.getValue().getPageSize()).isEqualTo(100);
        assertThat(history).singleElement().satisfies(summary -> {
            assertThat(summary.getId()).isEqualTo(7L);
            assertThat(summary.getResultCount()).isEqualTo(1);
        });
    }

    @Test
    void returnsStoredPredictionDetails() {
        when(repository.findById(7L)).thenReturn(Optional.of(run()));

        var detail = service.findById(7L);

        assertThat(detail.getCircuitName()).isEqualTo("Albert Park Grand Prix Circuit");
        assertThat(detail.getResults()).singleElement().satisfies(result -> {
            assertThat(result.getDriverRef()).isEqualTo("norris");
            assertThat(result.getPredictedPositionRounded()).isEqualTo(2);
            assertThat(result.getConfidenceRangeLow()).isEqualTo(1);
            assertThat(result.getConfidenceRangeHigh()).isEqualTo(5);
        });
    }

    private PredictionRun run() {
        PredictionRun run = PredictionRun.builder().id(7L).seasonYear(2024).round(3)
            .circuitName("Albert Park Grand Prix Circuit").modelVersion("model-123")
            .createdAt(Instant.parse("2024-03-24T06:00:00Z")).build();
        run.setResults(List.of(PredictionResultRecord.builder().id(1L).run(run)
            .driverRef("norris").constructorRef("mclaren").gridPosition(3)
            .predictedPosition(new BigDecimal("2.4")).predictedPositionRounded(2)
            .confidenceRangeLow(1).confidenceRangeHigh(5).build()));
        return run;
    }
}
