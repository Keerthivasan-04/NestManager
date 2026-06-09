package com.nestmanager.service;

import com.nestmanager.dto.RoomDTO;
import com.nestmanager.exception.DuplicateResourceException;
import com.nestmanager.exception.ResourceNotFoundException;
import com.nestmanager.model.Room;
import com.nestmanager.model.Room.RoomStatus;
import com.nestmanager.model.Room.RoomType;
import com.nestmanager.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * RoomService — all business logic for rooms
 *
 * Responsibilities:
 *  - CRUD operations for rooms
 *  - Prevent duplicate room numbers
 *  - Filter rooms by status and type
 *  - Return vacant rooms for dropdown in frontend modals
 *  - Update room status based on occupancy
 */
@Service
@RequiredArgsConstructor
@Transactional
public class RoomService {

    private final RoomRepository roomRepository;

    // ----------------------------------------------------------------
    // GET ALL ROOMS
    // GET /api/rooms  or  GET /api/rooms?status=VACANT
    // ----------------------------------------------------------------

    public List<RoomDTO.Response> getAllRooms() {
        return roomRepository.findAll()
                .stream()
                .map(RoomDTO.Response::from)
                .collect(Collectors.toList());
    }

    public List<RoomDTO.Response> getRoomsByStatus(RoomStatus status) {
        return roomRepository.findByStatus(status)
                .stream()
                .map(RoomDTO.Response::from)
                .collect(Collectors.toList());
    }

    public List<RoomDTO.Response> getRoomsByType(RoomType type) {
        return roomRepository.findByType(type)
                .stream()
                .map(RoomDTO.Response::from)
                .collect(Collectors.toList());
    }

    public List<RoomDTO.Response> getVacantRooms() {
        return roomRepository
                .findByStatusOrderByRoomNumberAsc(RoomStatus.VACANT)
                .stream()
                .map(RoomDTO.Response::from)
                .collect(Collectors.toList());
    }

    // ----------------------------------------------------------------
    // GET ONE ROOM
    // GET /api/rooms/{id}
    // ----------------------------------------------------------------

    @Transactional(readOnly = true)
    public RoomDTO.Response getRoomById(Long id) {
        Room room = findRoomById(id);
        return RoomDTO.Response.from(room);
    }

    // ----------------------------------------------------------------
    // CREATE ROOM
    // POST /api/rooms
    // ----------------------------------------------------------------

    public RoomDTO.Response createRoom(RoomDTO.Request request) {

        // Prevent duplicate room numbers
        if (roomRepository.existsByRoomNumber(request.getRoomNumber())) {
            throw new DuplicateResourceException(
                    "Room number '" + request.getRoomNumber() + "' already exists"
            );
        }

        Room room = Room.builder()
                .roomNumber(request.getRoomNumber())
                .floor(request.getFloor())
                .type(request.getType())
                .capacity(request.getCapacity())
                .occupiedBeds(0)
                .pricePerMonth(request.getPricePerMonth())
                .status(request.getStatus() != null ? request.getStatus() : RoomStatus.VACANT)
                .amenities(request.getAmenities())
                .notes(request.getNotes())
                .build();

        Room saved = roomRepository.save(room);
        return RoomDTO.Response.from(saved);
    }

    // ----------------------------------------------------------------
    // UPDATE ROOM
    // PUT /api/rooms/{id}
    // ----------------------------------------------------------------

    public RoomDTO.Response updateRoom(Long id, RoomDTO.Request request) {

        Room room = findRoomById(id);

        // If room number is changing, check the new one doesn't already exist
        if (!room.getRoomNumber().equals(request.getRoomNumber())
                && roomRepository.existsByRoomNumber(request.getRoomNumber())) {
            throw new DuplicateResourceException(
                    "Room number '" + request.getRoomNumber() + "' already exists"
            );
        }

        room.setRoomNumber(request.getRoomNumber());
        room.setFloor(request.getFloor());
        room.setType(request.getType());
        room.setCapacity(request.getCapacity());
        room.setPricePerMonth(request.getPricePerMonth());
        room.setStatus(request.getStatus());
        room.setAmenities(request.getAmenities());
        room.setNotes(request.getNotes());

        Room saved = roomRepository.save(room);
        return RoomDTO.Response.from(saved);
    }

    // ----------------------------------------------------------------
    // DELETE ROOM
    // DELETE /api/rooms/{id}
    // ----------------------------------------------------------------

    public void deleteRoom(Long id) {
        Room room = findRoomById(id);

        // Prevent deleting an occupied room
        if (room.getStatus() == RoomStatus.OCCUPIED) {
            throw new IllegalStateException(
                    "Cannot delete Room " + room.getRoomNumber() +
                    " — it is currently occupied. Check out all tenants first."
            );
        }

        roomRepository.delete(room);
    }

    // ----------------------------------------------------------------
    // INTERNAL HELPERS
    // Called by TenantService and BookingService when assigning rooms
    // ----------------------------------------------------------------

    /**
     * Finds a room by its ID or throws 404.
     */
    public Room findRoomById(Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Room not found with id: " + id
                ));
    }

    /**
     * Finds a room by its room number or throws 404.
     * Used by TenantService when assigning a tenant to a room.
     */
    public Room findRoomByNumber(String roomNumber) {
        return roomRepository.findByRoomNumber(roomNumber)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Room not found with number: " + roomNumber
                ));
    }

    /**
     * Updates a room's occupiedBeds count and recalculates status.
     * Called by TenantService on check-in and check-out.
     *
     * @param roomNumber  room number to update
     * @param delta       +1 for check-in, -1 for check-out
     */
    public void updateOccupancy(String roomNumber, int delta) {
        Room room = findRoomByNumber(roomNumber);
        int newOccupied = Math.max(0, room.getOccupiedBeds() + delta);
        room.setOccupiedBeds(Math.min(newOccupied, room.getCapacity()));
        room.recalculateStatus();
        roomRepository.save(room);
    }
}
