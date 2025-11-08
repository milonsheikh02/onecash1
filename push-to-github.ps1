# OneCash GitHub Push Script
Write-Host "OneCash GitHub Push Script" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green

Write-Host "Initializing repository..." -ForegroundColor Yellow
git init

Write-Host "Adding files..." -ForegroundColor Yellow
git add .

Write-Host "Committing files..." -ForegroundColor Yellow
git commit -m "Initial commit - OneCash exchange system"

Write-Host "Adding remote origin..." -ForegroundColor Yellow
git remote add origin https://github.com/milonsheikh02/onecash1.git

Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host "Done! Your OneCash project has been pushed to GitHub." -ForegroundColor Green