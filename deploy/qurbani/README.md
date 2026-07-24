# Kurban video production notlari

Bu parca ana Docker Compose dosyasiyla birlikte kullanilir. `app` ve worker icin ayni
`mizan_qurbani_data` volume'u `/data/qurbani` konumuna baglanmalidir. Volume dogrudan
HTTP ile yayinlanmaz; uygulama yetkili istekte `X-Accel-Redirect` doner.

Production acilisindan once:

1. `ffmpeg` ve `ffprobe` uygulama/worker image'inda kurulu olmalidir.
2. `QURBANI_*` ve `EVOLUTION_*` secret degerleri Docker secrets veya yalniz root'un
   okuyabildigi environment dosyasinda tutulmalidir.
3. `/data/qurbani` her gece sunucu disindaki bir hedefe sifreli yedeklenmelidir.
4. Ayda en az bir kez bos bir test volume'una geri yukleme yapilip video hash'leri
   karsilastirilmalidir.
5. Nginx `nginx-qurbani.conf` parcasi HTTPS server blokuna eklenmelidir.

Ham dosyalar 60 gun, islenmis dosyalar 365 gun saklanir. Temizlik `npm run
qurbani:cleanup` ile worker/cron tarafindan calistirilir; veritabani kaydi olmayan
veya henuz islenmekte olan dosyalar elle silinmemelidir.
