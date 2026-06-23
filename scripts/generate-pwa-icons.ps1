Add-Type -AssemblyName System.Drawing

function Save-Icon {
  param([int]$Size, [string]$Path)
  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::FromArgb(26, 26, 46))
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(233, 69, 96))
  $margin = [int]($Size * 0.25)
  $diam = $Size - 2 * $margin
  $g.FillEllipse($brush, $margin, $margin, $diam, $diam)
  $inner = [int]($Size * 0.375)
  $innerSize = [int]($Size * 0.25)
  $g.FillEllipse($brush, $inner, $inner, $innerSize, $innerSize)
  $g.Dispose()
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

$public = Join-Path (Split-Path $PSScriptRoot -Parent) 'public'
Save-Icon -Size 192 -Path (Join-Path $public 'pwa-192.png')
Save-Icon -Size 512 -Path (Join-Path $public 'pwa-512.png')
Write-Host 'PWA icons generated.'
