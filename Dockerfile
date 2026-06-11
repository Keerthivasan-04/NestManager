# ---- Stage 1: Build ----
FROM maven:3.9.6-eclipse-temurin-17 AS build

WORKDIR /app

# Copy entire backend folder
COPY nestmanager_backend/ ./

# Download dependencies
RUN mvn dependency:go-offline -B

# Build JAR
RUN mvn clean package -DskipTests

# ---- Stage 2: Run ----
FROM eclipse-temurin:17-jre

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]