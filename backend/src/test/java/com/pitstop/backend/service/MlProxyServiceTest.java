package com.pitstop.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.http.HttpStatus.BAD_GATEWAY;
import static org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE;
import static org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class MlProxyServiceTest {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockRestServiceServer server;
    private MlProxyService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        service = new MlProxyService(builder, "http://ml-service:8000");
    }

    @Test
    void forwardsPredictionWithoutChangingItsJsonContract() throws Exception {
        JsonNode request = objectMapper.readTree("{\"entries\":[{\"driver_ref\":\"norris\"}]}");
        server.expect(once(), requestTo("http://ml-service:8000/v1/predict"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().json(request.toString()))
                .andRespond(withSuccess("{\"prediction_run_id\":42}", MediaType.APPLICATION_JSON));

        JsonNode response = service.predict(request);

        assertThat(response.get("prediction_run_id").asLong()).isEqualTo(42);
        server.verify();
    }

    @Test
    void mapsMlFailuresToBadGatewayWithoutLeakingInternalResponse() {
        server.expect(requestTo("http://ml-service:8000/v1/health"))
                .andRespond(withStatus(SERVICE_UNAVAILABLE));

        assertThatThrownBy(service::health)
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(BAD_GATEWAY);
                    assertThat(ex.getReason()).isEqualTo("ML service is unavailable");
                });
        server.verify();
    }

    @Test
    void preservesClientErrorStatusWithoutLeakingMlDetails() throws Exception {
        JsonNode request = objectMapper.readTree("{\"entries\":[]}");
        server.expect(requestTo("http://ml-service:8000/v1/predict"))
                .andRespond(withStatus(UNPROCESSABLE_ENTITY)
                        .body("{\"detail\":\"internal validation detail\"}")
                        .contentType(MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> service.predict(request))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(UNPROCESSABLE_ENTITY);
                    assertThat(ex.getReason()).isEqualTo("ML request was rejected");
                });
        server.verify();
    }
}
