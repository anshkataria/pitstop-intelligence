package com.pitstop.backend.service;

import com.pitstop.backend.entity.PredictionResultRecord;
import com.pitstop.backend.entity.PredictionRun;
import com.pitstop.backend.entity.RaceResult;
import com.pitstop.backend.entity.Driver;
import com.pitstop.backend.repository.PredictionRunRepository;
import com.pitstop.backend.repository.RaceResultRepository;
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
    @Mock RaceResultRepository raceResults;
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

    @Test
    void evaluatesPredictionsAgainstTheOfficialClassification() {
        PredictionRun run = run();
        run.setResults(List.of(
            prediction(run, "norris", "2.40", 2, 1, 5),
            prediction(run, "verstappen", "3.20", 3, 2, 4)
        ));
        when(repository.findById(7L)).thenReturn(Optional.of(run));
        when(raceResults.findByRaceSeasonYearAndRaceRoundOrderByFinishPositionAsc(2024, 3))
            .thenReturn(List.of(actual("norris", 1), actual("verstappen", 3)));

        var evaluation = service.evaluate(7L);

        assertThat(evaluation.getStatus()).isEqualTo("COMPLETE");
        assertThat(evaluation.getEvaluatedCount()).isEqualTo(2);
        assertThat(evaluation.getMeanAbsoluteError()).isEqualByComparingTo("0.80");
        assertThat(evaluation.getRootMeanSquaredError()).isEqualByComparingTo("1.00");
        assertThat(evaluation.getExactMatchRate()).isEqualByComparingTo("50.0");
        assertThat(evaluation.getConfidenceCoverage()).isEqualByComparingTo("100.0");
        assertThat(evaluation.getResults()).first().satisfies(result -> {
            assertThat(result.getDriverRef()).isEqualTo("norris");
            assertThat(result.getPredictedPosition()).isEqualTo(2);
            assertThat(result.getActualPosition()).isEqualTo(1);
            assertThat(result.getAbsoluteError()).isEqualByComparingTo("1.40");
        });
    }

    @Test
    void reportsPendingWhenOfficialResultsAreNotAvailable() {
        when(repository.findById(7L)).thenReturn(Optional.of(run()));
        when(raceResults.findByRaceSeasonYearAndRaceRoundOrderByFinishPositionAsc(2024, 3))
            .thenReturn(List.of());

        var evaluation = service.evaluate(7L);

        assertThat(evaluation.getStatus()).isEqualTo("PENDING");
        assertThat(evaluation.getEvaluatedCount()).isZero();
        assertThat(evaluation.getMeanAbsoluteError()).isNull();
        assertThat(evaluation.getResults()).isEmpty();
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

    private PredictionResultRecord prediction(
        PredictionRun run,
        String driverRef,
        String predicted,
        int rounded,
        int low,
        int high
    ) {
        return PredictionResultRecord.builder().run(run).driverRef(driverRef)
            .constructorRef("team").gridPosition(rounded)
            .predictedPosition(new BigDecimal(predicted)).predictedPositionRounded(rounded)
            .confidenceRangeLow(low).confidenceRangeHigh(high).build();
    }

    private RaceResult actual(String driverRef, int finishPosition) {
        return RaceResult.builder()
            .driver(Driver.builder().driverRef(driverRef).build())
            .finishPosition(finishPosition)
            .build();
    }
}
