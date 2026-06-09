package com.nestmanager.dto;

import com.nestmanager.model.Room;
import com.nestmanager.model.Room.RoomStatus;
import com.nestmanager.model.Room.RoomType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * RoomDTO — request and response shapes for Room
 *
 * Contains two static nested classes:
 *  - Request  → what the frontend sends (POST / PUT)
 *  - Response → what the backend returns (GET)
 */
public class RoomDTO {

    // ----------------------------------------------------------------
    // ROOM REQUEST
    // Sent by rooms.js when adding or editing a room
    //
    // {
    //   "roomNumber": "101",
    //   "floor": "1st",
    //   "type": "SINGLE",
    //   "capacity": 1,
    //   "pricePerMonth": 5500,
    //   "status": "VACANT",
    //   "amenities": "AC, WiFi",
    //   "notes": ""
    // }
    // ----------------------------------------------------------------
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Request {

        @NotBlank(message = "Room number is required")
        @Size(max = 20, message = "Room number must not exceed 20 characters")
        private String roomNumber;

        @Size(max = 50, message = "Floor must not exceed 50 characters")
        private String floor;

        @NotNull(message = "Room type is required")
        private RoomType type;

        @NotNull(message = "Capacity is required")
        @Min(value = 1, message = "Capacity must be at least 1")
        @Max(value = 20, message = "Capacity cannot exceed 20")
        private Integer capacity;

        @NotNull(message = "Price per month is required")
        @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
        private BigDecimal pricePerMonth;

        private RoomStatus status = RoomStatus.VACANT;

        @Size(max = 255, message = "Amenities must not exceed 255 characters")
        private String amenities;

        private String notes;
    }

    // ----------------------------------------------------------------
    // ROOM RESPONSE
    // Returned by RoomController for GET requests
    //
    // {
    //   "id": 1,
    //   "roomNumber": "101",
    //   "floor": "1st",
    //   "type": "SINGLE",
    //   "capacity": 1,
    //   "occupiedBeds": 1,
    //   "pricePerMonth": 5500.00,
    //   "status": "OCCUPIED",
    //   "amenities": "AC, WiFi",
    //   "notes": null
    // }
    // ----------------------------------------------------------------
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {

        private Long id;
        private String roomNumber;
        private String floor;
        private RoomType type;
        private Integer capacity;
        private Integer occupiedBeds;
        private BigDecimal pricePerMonth;
        private RoomStatus status;
        private String amenities;
        private String notes;

        // Convenience factory — builds response from Room entity
        public static Response from(Room room) {
            return Response.builder()
                    .id(room.getId())
                    .roomNumber(room.getRoomNumber())
                    .floor(room.getFloor())
                    .type(room.getType())
                    .capacity(room.getCapacity())
                    .occupiedBeds(room.getOccupiedBeds())
                    .pricePerMonth(room.getPricePerMonth())
                    .status(room.getStatus())
                    .amenities(room.getAmenities())
                    .notes(room.getNotes())
                    .build();
        }
    }
}
