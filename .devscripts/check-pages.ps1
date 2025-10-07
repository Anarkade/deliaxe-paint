param(
  [string[]]$urls = @('https://anarkade.github.io/deliaxe-paint/','https://deliaxe-paint.anarka.de/')
)

$client = New-Object System.Net.Http.HttpClient
foreach($u in $urls) {
  Write-Host "\n=== $u ==="
  try {
    $resp = $client.GetAsync($u).Result
    Write-Host "Status: $($resp.StatusCode)"
    $body = $resp.Content.ReadAsStringAsync().Result
    $lines = $body -split "\r?\n"
    $lines[0..9] | ForEach-Object { Write-Host $_ }
  } catch {
    Write-Host "Request failed: $_"
  }
}
