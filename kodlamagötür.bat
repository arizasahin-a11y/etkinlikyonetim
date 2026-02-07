@echo off
:: Windows Terminal'i yönetici olarak aç ve A:\TOOLS\indirici klasöründe başlat
powershell -Command "Start-Process 'wt.exe' -ArgumentList '--startingDirectory A:\TOOLS\kodlama\km' -Verb RunAs"
