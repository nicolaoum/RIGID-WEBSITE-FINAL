# RIGID API Test Script
$baseUrl = "http://localhost:3000/api"
Write-Host "`n=== RIGID API TESTS ===`n" -ForegroundColor Cyan

# Test Buildings
Write-Host "1. GET Buildings..." -ForegroundColor Yellow
try {
    $buildings = Invoke-RestMethod -Uri "$baseUrl/buildings" -Method GET
    Write-Host "   PASS - Found $($buildings.Count) buildings`n" -ForegroundColor Green
} catch { Write-Host "   FAIL - $($_.Exception.Message)`n" -ForegroundColor Red }

# Test Units GET
Write-Host "2. GET Units..." -ForegroundColor Yellow
try {
    $units = Invoke-RestMethod -Uri "$baseUrl/units" -Method GET
    Write-Host "   PASS - Found $($units.Count) units`n" -ForegroundColor Green
} catch { Write-Host "   FAIL - $($_.Exception.Message)`n" -ForegroundColor Red }

# Test Units POST
Write-Host "3. POST Unit..." -ForegroundColor Yellow
try {
    $newUnit = @{ buildingId="bldg-001"; unitNumber="TEST999"; bedrooms=2; bathrooms=1; sqft=1000; rent=1300; available=$true; availableDate="2025-03-01" } | ConvertTo-Json
    $created = Invoke-RestMethod -Uri "$baseUrl/units" -Method POST -Body $newUnit -ContentType "application/json"
    Write-Host "   PASS - Created unit: $($created.id)`n" -ForegroundColor Green
    $script:testUnitId = $created.id
} catch { Write-Host "   FAIL - $($_.Exception.Message)`n" -ForegroundColor Red }

# Test Residents GET
Write-Host "4. GET Residents..." -ForegroundColor Yellow
try {
    $residents = Invoke-RestMethod -Uri "$baseUrl/residents" -Method GET
    Write-Host "   PASS - Found $($residents.Count) residents`n" -ForegroundColor Green
} catch { Write-Host "   FAIL - $($_.Exception.Message)`n" -ForegroundColor Red }

# Test Residents POST
Write-Host "5. POST Resident..." -ForegroundColor Yellow
try {
    $newResident = @{ name="Test User"; email="testapi@test.com"; phone="555-0000"; unitId="unit-001"; leaseStart="2025-02-01"; leaseEnd="2026-02-01" } | ConvertTo-Json
    $created = Invoke-RestMethod -Uri "$baseUrl/residents" -Method POST -Body $newResident -ContentType "application/json"
    Write-Host "   PASS - Created resident: $($created.id)`n" -ForegroundColor Green
    $script:testResidentId = $created.id
} catch { Write-Host "   FAIL - $($_.Exception.Message)`n" -ForegroundColor Red }

# Test Check Resident
Write-Host "6. Check Resident..." -ForegroundColor Yellow
try {
    $check = Invoke-RestMethod -Uri "$baseUrl/check-resident?email=testapi@test.com" -Method GET
    Write-Host "   PASS - Resident check successful`n" -ForegroundColor Green
} catch { Write-Host "   FAIL - $($_.Exception.Message)`n" -ForegroundColor Red }

# Test DELETE Resident
Write-Host "7. DELETE Resident..." -ForegroundColor Yellow
if ($script:testResidentId) {
    try {
        Invoke-RestMethod -Uri "$baseUrl/residents?id=$($script:testResidentId)" -Method DELETE | Out-Null
        Write-Host "   PASS - Deleted resident`n" -ForegroundColor Green
    } catch { Write-Host "   FAIL - $($_.Exception.Message)`n" -ForegroundColor Red }
} else { Write-Host "   SKIP - No resident to delete`n" -ForegroundColor Gray }

# Test Notices GET
Write-Host "8. GET Notices..." -ForegroundColor Yellow
try {
    $notices = Invoke-RestMethod -Uri "$baseUrl/notices" -Method GET
    Write-Host "   PASS - Found $($notices.Count) notices`n" -ForegroundColor Green
} catch { Write-Host "   FAIL - $($_.Exception.Message)`n" -ForegroundColor Red }

# Test Notices POST
Write-Host "9. POST Notice..." -ForegroundColor Yellow
try {
    $newNotice = @{ title="Test Notice"; content="API Test"; priority="medium"; buildingIds=@("bldg-001") } | ConvertTo-Json
    $created = Invoke-RestMethod -Uri "$baseUrl/notices" -Method POST -Body $newNotice -ContentType "application/json"
    Write-Host "   PASS - Created notice: $($created.id)`n" -ForegroundColor Green
    $script:testNoticeId = $created.id
} catch { Write-Host "   FAIL - $($_.Exception.Message)`n" -ForegroundColor Red }

# Test DELETE Notice
Write-Host "10. DELETE Notice..." -ForegroundColor Yellow
if ($script:testNoticeId) {
    try {
        Invoke-RestMethod -Uri "$baseUrl/notices?id=$($script:testNoticeId)" -Method DELETE | Out-Null
        Write-Host "   PASS - Deleted notice`n" -ForegroundColor Green
    } catch { Write-Host "   FAIL - $($_.Exception.Message)`n" -ForegroundColor Red }
} else { Write-Host "   SKIP - No notice to delete`n" -ForegroundColor Gray }

# Test Tickets GET
Write-Host "11. GET Tickets (All)..." -ForegroundColor Yellow
try {
    $tickets = Invoke-RestMethod -Uri "$baseUrl/tickets?type=all" -Method GET
    Write-Host "   PASS - Found $($tickets.Count) tickets`n" -ForegroundColor Green
} catch { Write-Host "   FAIL - $($_.Exception.Message)`n" -ForegroundColor Red }

# Test Tickets POST
Write-Host "12. POST Ticket..." -ForegroundColor Yellow
try {
    $newTicket = @{ residentId="resident-001"; subject="Test Ticket"; description="API Test"; priority="medium"; category="maintenance" } | ConvertTo-Json
    $created = Invoke-RestMethod -Uri "$baseUrl/tickets" -Method POST -Body $newTicket -ContentType "application/json"
    Write-Host "   PASS - Created ticket: $($created.id)`n" -ForegroundColor Green
    $script:testTicketId = $created.id
} catch { Write-Host "   FAIL - $($_.Exception.Message)`n" -ForegroundColor Red }

# Test UPDATE Ticket
Write-Host "13. UPDATE Ticket Status..." -ForegroundColor Yellow
if ($script:testTicketId) {
    try {
        $update = @{ id=$script:testTicketId; status="in-progress" } | ConvertTo-Json
        Invoke-RestMethod -Uri "$baseUrl/tickets" -Method PUT -Body $update -ContentType "application/json" | Out-Null
        Write-Host "   PASS - Updated ticket status`n" -ForegroundColor Green
    } catch { Write-Host "   FAIL - $($_.Exception.Message)`n" -ForegroundColor Red }
} else { Write-Host "   SKIP - No ticket to update`n" -ForegroundColor Gray }

# Test DELETE Ticket
Write-Host "14. DELETE Ticket..." -ForegroundColor Yellow
if ($script:testTicketId) {
    try {
        Invoke-RestMethod -Uri "$baseUrl/tickets?id=$($script:testTicketId)" -Method DELETE | Out-Null
        Write-Host "   PASS - Deleted ticket`n" -ForegroundColor Green
    } catch { Write-Host "   FAIL - $($_.Exception.Message)`n" -ForegroundColor Red }
} else { Write-Host "   SKIP - No ticket to delete`n" -ForegroundColor Gray }

# Test Inquiries POST
Write-Host "15. POST Inquiry..." -ForegroundColor Yellow
try {
    $newInquiry = @{ name="Test User"; email="test@test.com"; phone="555-1234"; message="API Test Inquiry"; propertyInterest="bldg-001" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/inquiries" -Method POST -Body $newInquiry -ContentType "application/json" | Out-Null
    Write-Host "   PASS - Inquiry submitted`n" -ForegroundColor Green
} catch { Write-Host "   FAIL - $($_.Exception.Message)`n" -ForegroundColor Red }

Write-Host "=== TESTS COMPLETE ===`n" -ForegroundColor Cyan
