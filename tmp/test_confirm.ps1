$json = @{
    updates = @(
        @{
            date = "2026-03-31"
            name = "חייל א"
            role = "שומר"
            type = "שמירה"
            hours = "12:00-13:00"
            points = 5
        },
        @{
            date = "2026-03-31"
            name = "חייל ב"
            role = "חובש"
            type = "חפ`ק"
            hours = "לתאם"
            points = 3
        }
    )
} | ConvertTo-Json -Depth 10 -Compress

$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
try {
    $response = Invoke-RestMethod -Uri "https://151.145.89.228.sslip.io/webhook/confirm-guards" -Method Post -Body $bytes -ContentType "application/json; charset=utf-8"
    Write-Output ($response | ConvertTo-Json)
} catch {
    Write-Error $_.Exception.Message
    $streamReader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $streamReader.ReadToEnd()
    Write-Error "Error body: $errorBody"
}
