package com.nestmanager.service;

import com.nestmanager.dto.TenantDTO;
import com.nestmanager.exception.ResourceNotFoundException;
import com.nestmanager.model.Notification;
import com.nestmanager.model.Room;
import com.nestmanager.model.Tenant;
import com.nestmanager.model.Tenant.TenantStatus;
import com.nestmanager.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TenantService {

    private final TenantRepository    tenantRepository;
    private final RoomService         roomService;
    private final NotificationService notificationService;

    // GET ALL
    public List<TenantDTO.Response> getAllTenants() {
        return tenantRepository.findAllWithRoom()
                .stream()
                .map(TenantDTO.Response::from)
                .collect(Collectors.toList());
    }

    public List<TenantDTO.Response> getTenantsByStatus(TenantStatus status) {
        return tenantRepository.findByStatusWithRoom(status)
                .stream()
                .map(TenantDTO.Response::from)
                .collect(Collectors.toList());
    }

    // GET ONE
    @Transactional(readOnly = true)
    public TenantDTO.Response getTenantById(Long id) {
        return TenantDTO.Response.from(findTenantById(id));
    }

    // CREATE
    public TenantDTO.Response createTenant(TenantDTO.Request request) {

        Tenant tenant = Tenant.builder()
                .name(request.getName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .gender(request.getGender())
                .address(request.getAddress())
                .idProofType(request.getIdProofType())
                .idProofNumber(request.getIdProofNumber())
                .checkInDate(request.getCheckInDate())
                .expectedCheckOut(request.getExpectedCheckOut())
                .rentPerMonth(request.getRentPerMonth())
                .securityDeposit(request.getSecurityDeposit())
                .emergencyContact(request.getEmergencyContact())
                .status(TenantStatus.ACTIVE)
                .build();

        if (request.getRoomNumber() != null && !request.getRoomNumber().isBlank()) {
            Room room = roomService.findRoomByNumber(request.getRoomNumber());
            tenant.setRoom(room);
            roomService.updateOccupancy(request.getRoomNumber(), +1);
        }

        Tenant saved = tenantRepository.save(tenant);

        // Notify on new tenant
        notificationService.createNotification(
                Notification.NotificationType.SYSTEM,
                "New tenant added — " + saved.getName(),
                saved.getName() + " has been added as a tenant" +
                        (saved.getRoomNumber() != null ? " for Room " + saved.getRoomNumber() : "") +
                        " starting " + saved.getCheckInDate() + "."
        );

        return TenantDTO.Response.from(saved);
    }

    // UPDATE
    public TenantDTO.Response updateTenant(Long id, TenantDTO.Request request) {

        Tenant tenant = findTenantById(id);
        String oldRoomNumber = tenant.getRoomNumber();

        tenant.setName(request.getName());
        tenant.setPhone(request.getPhone());
        tenant.setEmail(request.getEmail());
        tenant.setGender(request.getGender());
        tenant.setAddress(request.getAddress());
        tenant.setIdProofType(request.getIdProofType());
        tenant.setIdProofNumber(request.getIdProofNumber());
        tenant.setCheckInDate(request.getCheckInDate());
        tenant.setExpectedCheckOut(request.getExpectedCheckOut());
        tenant.setRentPerMonth(request.getRentPerMonth());
        tenant.setSecurityDeposit(request.getSecurityDeposit());
        tenant.setEmergencyContact(request.getEmergencyContact());
        tenant.setStatus(request.getStatus());

        String newRoomNumber = request.getRoomNumber();
        boolean roomChanged  = newRoomNumber != null && !newRoomNumber.equals(oldRoomNumber);

        if (roomChanged) {
            if (oldRoomNumber != null) roomService.updateOccupancy(oldRoomNumber, -1);
            Room newRoom = roomService.findRoomByNumber(newRoomNumber);
            tenant.setRoom(newRoom);
            roomService.updateOccupancy(newRoomNumber, +1);
        }

        Tenant saved = tenantRepository.save(tenant);
        return TenantDTO.Response.from(saved);
    }

    // CHECKOUT
    public TenantDTO.Response checkoutTenant(Long id, TenantDTO.CheckoutRequest request) {

        Tenant tenant = findTenantById(id);

        if (tenant.getStatus() == TenantStatus.CHECKED_OUT) {
            throw new IllegalStateException("Tenant is already checked out");
        }

        String roomNumber = tenant.getRoomNumber();

        tenant.setStatus(TenantStatus.CHECKED_OUT);
        tenant.setActualCheckOut(request.getCheckOutDate());
        // Keep room linked so history shows the room number
        // but decrement occupancy so room shows as VACANT
        if (roomNumber != null) {
            roomService.updateOccupancy(roomNumber, -1);
        }

        Tenant saved = tenantRepository.save(tenant);

        // Create checkout notification
        notificationService.createNotification(
                Notification.NotificationType.CHECKOUT,
                "Tenant checked out — " + saved.getName(),
                saved.getName() + " has checked out from Room " +
                        (roomNumber != null ? roomNumber : "--") +
                        " on " + request.getCheckOutDate() + "."
        );

        return TenantDTO.Response.from(saved);
    }

    // DELETE
    public void deleteTenant(Long id) {
        Tenant tenant = findTenantById(id);

        if (tenant.getStatus() == TenantStatus.ACTIVE && tenant.getRoomNumber() != null) {
            roomService.updateOccupancy(tenant.getRoomNumber(), -1);
        }

        tenantRepository.delete(tenant);
    }

    // HELPER
    public Tenant findTenantById(Long id) {
        return tenantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Tenant not found with id: " + id
                ));
    }
}