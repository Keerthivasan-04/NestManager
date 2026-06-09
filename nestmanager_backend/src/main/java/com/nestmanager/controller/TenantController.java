package com.nestmanager.controller;

import com.nestmanager.dto.TenantDTO;
import com.nestmanager.model.Tenant.TenantStatus;
import com.nestmanager.service.TenantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * TenantController — REST endpoints for tenants
 *
 * Endpoints:
 *  GET    /api/tenants              → get all tenants (optional ?status=ACTIVE)
 *  GET    /api/tenants/{id}         → get one tenant
 *  POST   /api/tenants              → create tenant
 *  PUT    /api/tenants/{id}         → update tenant
 *  PATCH  /api/tenants/{id}/checkout → check out tenant
 *  DELETE /api/tenants/{id}         → delete tenant
 */
@RestController
@RequestMapping("/api/tenants")
@RequiredArgsConstructor
public class TenantController {

    private final TenantService tenantService;

    // ----------------------------------------------------------------
    // GET /api/tenants
    // GET /api/tenants?status=ACTIVE
    // GET /api/tenants?status=CHECKED_OUT
    // ----------------------------------------------------------------
    @GetMapping
    public ResponseEntity<List<TenantDTO.Response>> getAllTenants(
            @RequestParam(required = false) TenantStatus status) {

        List<TenantDTO.Response> tenants = status != null
                ? tenantService.getTenantsByStatus(status)
                : tenantService.getAllTenants();

        return ResponseEntity.ok(tenants);
    }

    // ----------------------------------------------------------------
    // GET /api/tenants/{id}
    // ----------------------------------------------------------------
    @GetMapping("/{id}")
    public ResponseEntity<TenantDTO.Response> getTenantById(@PathVariable Long id) {
        return ResponseEntity.ok(tenantService.getTenantById(id));
    }

    // ----------------------------------------------------------------
    // POST /api/tenants
    // ----------------------------------------------------------------
    @PostMapping
    public ResponseEntity<TenantDTO.Response> createTenant(
            @Valid @RequestBody TenantDTO.Request request) {

        TenantDTO.Response created = tenantService.createTenant(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // ----------------------------------------------------------------
    // PUT /api/tenants/{id}
    // ----------------------------------------------------------------
    @PutMapping("/{id}")
    public ResponseEntity<TenantDTO.Response> updateTenant(
            @PathVariable Long id,
            @Valid @RequestBody TenantDTO.Request request) {

        return ResponseEntity.ok(tenantService.updateTenant(id, request));
    }

    // ----------------------------------------------------------------
    // PATCH /api/tenants/{id}/checkout
    //
    // Request body: { "checkOutDate": "2025-03-20" }
    // Response: updated tenant with status = CHECKED_OUT
    // Side effect: room occupiedBeds decremented, room status recalculated
    // ----------------------------------------------------------------
    @PatchMapping("/{id}/checkout")
    public ResponseEntity<TenantDTO.Response> checkoutTenant(
            @PathVariable Long id,
            @Valid @RequestBody TenantDTO.CheckoutRequest request) {

        return ResponseEntity.ok(tenantService.checkoutTenant(id, request));
    }

    // ----------------------------------------------------------------
    // DELETE /api/tenants/{id}
    // ----------------------------------------------------------------
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTenant(@PathVariable Long id) {
        tenantService.deleteTenant(id);
        return ResponseEntity.noContent().build();
    }
}
