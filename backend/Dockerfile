FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .

RUN ./mvnw dependency:go-offline -q

COPY src ./src

RUN ./mvnw package -DskipTests -q

FROM eclipse-temurin:21-jre-alpine AS runtime

WORKDIR /app

RUN addgroup -S pitstop && adduser -S pitstop -G pitstop

COPY --from=builder /app/target/*.jar app.jar

RUN chown pitstop:pitstop app.jar

USER pitstop

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]