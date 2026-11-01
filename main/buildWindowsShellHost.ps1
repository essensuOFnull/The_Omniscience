$ErrorActionPreference = 'Stop'

$frameworkDirectories = @(
    (Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'),
    (Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319')
)
$compiler = $frameworkDirectories |
    ForEach-Object { Join-Path $_ 'csc.exe' } |
    Where-Object { Test-Path -LiteralPath $_ } |
    Select-Object -First 1

if (-not $compiler) {
    throw 'The .NET Framework C# compiler was not found.'
}

$source = Join-Path $PSScriptRoot 'OmniShellHost.cs'
$output = Join-Path $PSScriptRoot 'OmniShellHost.exe'
& $compiler /nologo /target:winexe /optimize+ "/out:$output" $source
if ($LASTEXITCODE -ne 0) {
    throw "OmniShellHost compilation failed with exit code $LASTEXITCODE."
}
Write-Output "Built $output"
