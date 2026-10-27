# Build stage: full JDK and Maven. Tests are not run here; they need Docker for Testcontainers and run in CI.
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
# Dependencies first, so a source-only change reuses the cached layer.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src src
RUN mvn -B -q -DskipTests package

# Runtime stage: JRE only, running as an unprivileged user. The Ubuntu-based image (not Alpine) is published for
# both amd64 (Render) and arm64 (Apple Silicon laptops), so the same Dockerfile builds in both places.
FROM eclipse-temurin:17-jre
RUN useradd --system --uid 1001 app
WORKDIR /app
COPY --from=build /build/target/*.jar app.jar
USER app
# The app listens on PORT when the host sets it (Render does), otherwise on 8080.
EXPOSE 8080
# 75% of the container's memory for the heap leaves room for metaspace and threads on a small free instance.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
