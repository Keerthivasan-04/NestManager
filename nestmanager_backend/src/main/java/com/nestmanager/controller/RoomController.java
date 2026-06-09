package com.nestmanager.controller;

import com.nestmanager.dto.RoomDTO;
import com.nestmanager.model.Room.RoomStatus;
import com.nestmanager.model.Room.RoomType;
import com.nestmanager.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * RoomController — REST endpoints for rooms
 *
 * Endpoints:
 *  GET    /api/rooms               → get all rooms (optional ?status=VACANT)
 *  GET    /api/rooms/{id}          → get one room
 *  POST   /api/rooms               → create room
 *  PUT    /api/rooms/{id}          → update room
 *  DELETE /api/rooms/{id}          → delete room
 */
@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    // ----------------------------------------------------------------
    // GET /api/rooms
    // GET /api/rooms?status=VACANT
    // GET /api/rooms?type=DOUBLE
    // ----------------------------------------------------------------
    @GetMapping
    public ResponseEntity<List<RoomDTO.Response>> getAllRooms(
            @RequestParam(required = false) RoomStatus status,
            @RequestParam(required = false) RoomType type) {

        List<RoomDTO.Response> rooms;

        if (status != null && type != null) {
            rooms = roomService.getRoomsByStatus(status)
                    .stream()
                    .filter(r -> r.getType() == type)
                    .toList();
        } else if (status != null) {
            rooms = roomService.getRoomsByStatus(status);
        } else if (type != null) {
            rooms = roomService.getRoomsByType(type);
        } else {
            rooms = roomService.getAllRooms();
        }

        return ResponseEntity.ok(rooms);
    }

    // ----------------------------------------------------------------
    // GET /api/rooms/{id}
    // ----------------------------------------------------------------
    @GetMapping("/{id}")
    public ResponseEntity<RoomDTO.Response> getRoomById(@PathVariable Long id) {
        return ResponseEntity.ok(roomService.getRoomById(id));
    }

    // ----------------------------------------------------------------
    // POST /api/rooms
    // ----------------------------------------------------------------
    @PostMapping
    public ResponseEntity<RoomDTO.Response> createRoom(
            @Valid @RequestBody RoomDTO.Request request) {

        RoomDTO.Response created = roomService.createRoom(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // ----------------------------------------------------------------
    // PUT /api/rooms/{id}
    // ----------------------------------------------------------------
    @PutMapping("/{id}")
    public ResponseEntity<RoomDTO.Response> updateRoom(
            @PathVariable Long id,
            @Valid @RequestBody RoomDTO.Request request) {

        return ResponseEntity.ok(roomService.updateRoom(id, request));
    }

    // ----------------------------------------------------------------
    // DELETE /api/rooms/{id}
    // ----------------------------------------------------------------
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoom(@PathVariable Long id) {
        roomService.deleteRoom(id);
        return ResponseEntity.noContent().build();
    }
}
