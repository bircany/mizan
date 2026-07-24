# VPS production kontrol listesi

## Kalıcı Payload medyası

Payload `media` koleksiyonunun `/app/media` dizini kalıcı volume'a bağlanmalıdır:

```yaml
services:
  app:
    volumes:
      - mizan_media:/app/media

volumes:
  mizan_media:
```

- Volume olmadan production deploy yapılmamalıdır; yeni image medya dosyalarını silebilir.
- Medya günlük olarak VPS dışındaki şifreli hedefe yedeklenmelidir.
- Geri yükleme production öncesinde ve sonrasında periyodik olarak test edilmelidir.
- `/app/media` doğrudan yazılabilir public dizin olarak açılmamalıdır.

## Kurban videosu (production kapısı)

- `QURBANI_STORAGE_ROOT=/data/qurbani` olmadan kurban video özelliği açılmaz.
- App, tusd ve FFmpeg worker aynı `mizan_qurbani_data` Docker volume'unu kullanır.
- `/data/qurbani` public `alias` olmaz; dosya yalnız uygulama doğrulamasından sonra
  internal `X-Accel-Redirect` ile sunulur.
- `ffmpeg` ve `ffprobe` image içinde kurulu ve worker health check'i başarılı olmalıdır.
- Volume her gün sunucu dışında, şifreli bir hedefe yedeklenir. Ayda bir boş test
  volume'una geri yükleme yapılıp SHA-256 dosya doğrulaması kaydedilir.
- Ham video 60 gün, işlenmiş video 365 gün sonra worker tarafından temizlenir.
- Evolution API, WhatsApp webhook, erişim token ve upload secret değerleri yalnız
  sunucuda tutulur; hiçbirine `NEXT_PUBLIC_` ön eki verilmez.
- Canlıya geçmeden önce özel kurumsal WhatsApp numarasıyla tek test havuzu için
  yükleme, işleme, onay, kişisel link ve mesaj teslimi uçtan uca tamamlanır.

Ayrıntılı Compose/Nginx parçaları [deploy/qurbani](../deploy/qurbani/) dizinindedir.
