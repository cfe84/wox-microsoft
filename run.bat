@echo off

SET mypath=%~dp0
cd %mypath%
node dist\index.js %*