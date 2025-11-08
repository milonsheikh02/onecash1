@echo off
echo OneCash GitHub Push Script
echo ========================

echo Initializing repository...
git init

echo Adding files...
git add .

echo Committing files...
git commit -m "Initial commit - OneCash exchange system"

echo Adding remote origin...
git remote add origin https://github.com/milonsheikh02/onecash1.git

echo Pushing to GitHub...
git push -u origin main

echo Done! Your OneCash project has been pushed to GitHub.
pause