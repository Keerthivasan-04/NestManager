package com.nestmanager;

import com.nestmanager.service.AuthService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * NestManagerApplication — main entry point
 *
 * On startup:
 *  - Spring Boot auto-configures everything
 *  - JPA creates all tables in MySQL
 *  - CommandLineRunner creates default admin if none exists
 *  - Tomcat starts on port 8080
 */
@SpringBootApplication
@EnableScheduling
public class NestManagerApplication {

    public static void main(String[] args) {
        SpringApplication.run(NestManagerApplication.class, args);
    }

    /**
     * Runs once after the application context is fully loaded.
     * Creates default admin user (admin / admin123) if users table is empty.
     */
    @Bean
    public CommandLineRunner init(AuthService authService) {
        return args -> authService.createDefaultAdminIfNotExists();
    }
}
