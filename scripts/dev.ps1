param(
    [switch]$SkipDeploy
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$onChainDir = Join-Path $repoRoot 'on-chain'
$clientDir = Join-Path $repoRoot 'client'
$rpcUrl = 'http://127.0.0.1:8545'

function Test-RpcReady {
    param(
        [string]$Url
    )

    try {
        $body = '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
        $response = Invoke-RestMethod -Uri $Url -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 2
        return $response.result -ne $null
    } catch {
        return $false
    }
}

function Wait-ForRpc {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 45
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    while ((Get-Date) -lt $deadline) {
        if (Test-RpcReady -Url $Url) {
            return
        }

        Start-Sleep -Milliseconds 750
    }

    throw "Hardhat RPC did not become ready at $Url within $TimeoutSeconds seconds."
}

function Open-PowerShellWindow {
    param(
        [string]$WorkingDirectory,
        [string]$Command
    )

    $escapedDir = $WorkingDirectory.Replace("'", "''")
    $fullCommand = "Set-Location '$escapedDir'; $Command"

    Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoExit',
        '-ExecutionPolicy', 'Bypass',
        '-Command', $fullCommand
    ) | Out-Null
}

if (-not (Test-Path (Join-Path $onChainDir 'package.json'))) {
    throw "Missing on-chain/package.json. Run this from the repo root."
}

if (-not (Test-Path (Join-Path $clientDir 'package.json'))) {
    throw "Missing client/package.json. Run this from the repo root."
}

$clientEnvPath = Join-Path $clientDir '.env'
if (-not (Test-Path $clientEnvPath)) {
    Write-Warning "client/.env is missing. The frontend will still open, but Supabase-backed features will fail until you add it."
}

$nodeAlreadyRunning = Test-RpcReady -Url $rpcUrl

if ($nodeAlreadyRunning) {
    Write-Host "Hardhat node is already running at $rpcUrl" -ForegroundColor Yellow
} else {
    Write-Host "Opening Hardhat node window..." -ForegroundColor Cyan
    Open-PowerShellWindow -WorkingDirectory $onChainDir -Command 'npx hardhat node'

    Write-Host "Waiting for Hardhat RPC..." -ForegroundColor Cyan
    Wait-ForRpc -Url $rpcUrl
}

if (-not $SkipDeploy) {
    Write-Host "Deploying contracts to localhost..." -ForegroundColor Cyan
    Push-Location $onChainDir
    try {
        npx hardhat ignition deploy --network localhost ignition/modules/RewardSystem.ts
    } finally {
        Pop-Location
    }
} else {
    Write-Host "Skipping deployment because -SkipDeploy was used." -ForegroundColor Yellow
}

Write-Host "Opening Vite dev server window..." -ForegroundColor Cyan
Open-PowerShellWindow -WorkingDirectory $clientDir -Command 'npm run dev'

Write-Host ''
Write-Host 'Local dev stack started.' -ForegroundColor Green
Write-Host 'Hardhat RPC: http://127.0.0.1:8545'
Write-Host 'Frontend: check the Vite window for the local URL'
Write-Host 'Use npm run dev:skip-deploy if the local chain is already deployed and you only want to relaunch the app.'
