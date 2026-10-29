# CIROX VPS deploy

MasaM QR akışına göre uyarlanmıştır. Proje klasöründe `bash deploy.sh`, GitHub
`main` dalını alır ve CIROX'u günceller. Script Linux VPS içindir; Windows'ta
veya masaüstü geliştirme veritabanında çalıştırılmaz. Sunucuya uzaktan bağlanmaz.

## İlk kurulum — bir kez

Gereksinimler: Node.js **22+**, npm, Git, PM2, MySQL/MariaDB sunucusu,
`mysqldump`, `rsync`, `gzip`, `flock` (util-linux), GNU coreutils ve Nginx.
PM2'yi kurup deploy'u her zaman aynı Linux kullanıcısıyla çalıştırın.
Nginx yeniden yükleme için root veya ilgili sudo yetkileri gerekir. Script
işletim sistemi paketlerini, DB kullanıcılarını, DNS veya TLS sertifikasını kurmaz.

```bash
git clone https://github.com/0xHamzaCakmak/sube-analitik-cirox.git
cd sube-analitik-cirox
cp backend/.env.example backend/.env
cp .deploy.env.example .deploy.env
```

`backend/.env` içine **sunucuya ait** DB ve R2 bilgilerini yazın.
`PUBLIC_FRONTEND_ORIGINS=https://gercek-alan-adiniz.com` olmalı.
İlk admin için `SEED_ADMIN_EMAIL` ve en az 12 karakterli
`SEED_ADMIN_PASSWORD` doldurulmalı. Mevcut admin sonraki deploy'larda değiştirilmez;
mevcut kullanıcının şifresi seed değeriyle sıfırlanmaz. DB kullanıcısında uygulama
işlemleri, migration DDL ve dump için gereken yetkiler bulunmalı. `DATABASE_URL`
da desteklenir; `DB_*` değerleri varsa önceliklidir.

R2'de mevcut fişler varsa **aynı `R2_RECEIPT_ENCRYPTION_KEY` kullanılmalıdır**;
yeni anahtar üretmek eski fotoğrafları okunamaz hale getirir. Yerel `.env` veya
veritabanı GitHub'dan taşınmaz. `.env` dosyasını yalnızca sunucu kullanıcısı okuyabilmeli:

```bash
chmod 600 backend/.env .deploy.env
```

`.deploy.env` içindeki `WEB_ROOT` varsayılan olarak `/var/www/cirox` ve API portu
`4002`'dir. Nginx ayarlarınızla eşleştirin. Kaynak kod klasörü ile web kökü
ayrı olmalı; kaynak kodu veya `backend` klasörünü Nginx ile sunmayın. Web kökü
deploy kullanıcısınca yazılabilir, Nginx kullanıcısınca okunabilir olmalı.

`deploy/nginx.conf.example` ilk Nginx yapılandırması için örnektir. Domain,
web kökü ve portu düzenleyip siteyi etkinleştirin. Alan adını VPS'e yönlendirin,
HTTPS sertifikasını kurun ve `nginx -t` kontrolünü tamamlayın. HTTPS oturum çerezi
ve telefonun canlı kamera erişimi için gereklidir. Hazır bir Nginx yapılandırması
varsa script onu değiştirmez; test edip yeniden yükler.

Veritabanı henüz oluşturulmadıysa ve `.env` kullanıcısında CREATE DATABASE yetkisi varsa:

```bash
INIT_DATABASE=true bash deploy.sh
```

Veritabanı zaten varsa veya DBA tarafından hazırlanmışsa normal komut yeterli:

```bash
bash deploy.sh
```

Sunucu yeniden başladığında PM2'nin açılması için **bir kez** aynı kullanıcıyla
`pm2 startup` komutunun gösterdiği kurulumu tamamlayın. Script her başarılı
deploy sonunda `pm2 save` çalıştırır; sistem başlangıç servisini kendisi kurmaz.

## Sonraki güncellemeler

Masaüstünden değişiklikleri GitHub'a push ettikten sonra VPS'teki proje klasöründe:

```bash
bash deploy.sh
```

İlk kez `deploy.sh` henüz sunucuda yoksa önce `git pull --ff-only origin main`
çalıştırın. Sonraki çalıştırmalarda Git güncellemesi scriptin içindedir. Scriptin
kendisi Git'ten değişmişse, derleme ve migration öncesinde yeni sürümüyle yeniden açılır.
Commit edilmemiş takip edilen dosyalar varsa durur; `reset --hard` kullanmaz.
`.deploy.env`, `.deploy/`, `.env`, bağımlılıklar ve yedekler Git'e gönderilmez.

## Çalışma sırası

1. Tek deploy kilidi, Linux/Node/araç, Nginx ve hedef dizin kontrolleri.
2. Git fast-forward güncellemesi.
3. Frontend `npm ci --include=dev`; yeni backend için ayrı release ve bağımlılıklar.
4. Frontend tip kontrolü, iki derleme, HTTPS origin ve R2 ayar kontrolü.
5. DB bağlantısı; **migration öncesi** doğrulanmış gzip SQL yedeği.
6. TypeORM'un kayıtlı tüm eksik migration'ları, ilk admin kontrolü ve DB doğrulaması.
7. `sube-analitik-cirox-api` PM2 uygulamasının yeni backend sürümüne geçişi.
8. `/api/v1/health/ready`: hem MySQL bağlantısı hem Git commit SHA doğrulaması.
9. Assetler kopyalanır, `index.html` atomik olarak değiştirilir; Nginx reload ve PM2 save.

API başka bir portta çalışacaksa `BACKEND_PORT` ve Nginx proxy portunu birlikte
değiştirin. Script `NODE_ENV=production`, `HOST=127.0.0.1` ve
`DB_SYNCHRONIZE=false` kullanır. CIROX'a ait tek PM2 uygulamasına dokunur;
MasaM QR servisini veya tüm PM2 uygulamalarını yeniden başlatmaz.

Backend release klasörü değiştiğinde yalnızca CIROX'a ait PM2 kaydı yeniden
oluşturulur. Aynı release için normal reload kullanılır. Gerçek `pm_exec_path`
ve `pm_cwd` yeni release ile eşleşmeden sağlık kontrolüne ve frontend yayınına
geçilmez; sadece ortam değişkenindeki commit SHA'nın değişmesi yeterli değildir.
Bu kontrol, yeni frontend'in eski backend ile çalışıp yeni endpoint'lerde 404
vermesini önler. Önceki sürüme dönüşte de aynı dosya yolu kontrolü uygulanır.

## Yedek, saklama ve hata davranışı

DB yedekleri `.deploy/backups/<db>_<zaman>-<pid>.sql.gz` altında, yalnızca
deploy kullanıcısının erişebileceği izinlerle saklanır. `<db>_latest.sql.gz` en
son yedeğe işaret eder. Boş veya başarısız dump kabul edilmez; önceki yedek
korunur. MySQL şifresi komut satırına yazılmaz; geçici 0600 ayar dosyası kullanılır
ve çıkışta kaldırılır. Dump; rutin/event/trigger yetkisi de isteyebilir.

Yeni backend `.deploy/releases/` içinde ayrı bağımlılıklarla hazırlanır;
çalışan backend'in dosyaları derleme sırasında değiştirilmez. Yeni sürüm sağlıklı
olmadan frontend yayınlanmaz. Güncel ve önceki backend korunur; başarılı deploy
sonunda varsayılan son **3 release** ve son **7 sıkıştırılmış DB yedeği** tutulur.
Başarısız deploy'da yedek temizliği yapılmaz. Değerler `.deploy.env` ile değişir.
Eski hash'li frontend assetleri açık tarayıcılar ve geri dönüş için silinmez.

Migration hata verirse API/frontend yeni sürüme geçirilmez. API geçişinden sonra
hata olursa önceki backend'e dönüş denenir ve önceki index varsa geri konur.
**DB migration'ları otomatik geri alınmaz.** MySQL DDL kısmen uygulanabilir;
yeni şema eski backend ile uyumsuzsa kod geri dönüşü tek başına yeterli olmaz.
Bu durumda log ve deploy öncesi yedek incelenerek elle kurtarma gerekir. Script
otomatik SQL restore yapmaz ve canlı veriyi silmez. Başarı, tüm adımlar
tamamlanıp scriptin sıfır çıkış kodu vermesiyle anlaşılır.

## Testler

```bash
bash -n deploy.sh
bash scripts/test-deploy.sh
npm --prefix backend run typecheck
npm --prefix backend run test:deploy-config
```

Deploy testleri gerçek DB, R2, PM2 veya Nginx çağrısı yapmaz; geçici proje içi
fixture'larla bozuk/boş dump, migration hatasında durma, commit doğrulaması ve
geri dönüş davranışını kontrol eder. Gerçek VPS yayını ayrıca sunucuda doğrulanmalıdır.

Referanslar: [PM2 ecosystem](https://pm2.keymetrics.io/docs/usage/environment/),
[mysqldump](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html).

## Projeye ozel Node kurulumu

Sistemdeki diger uygulamalarin Node surumunu degistirmeden kurulan Node icin
.deploy.env dosyasina su satiri ekleyin:

    export PATH="/opt/cirox-node22/bin:$PATH"

Deploy, npm ve CIROX PM2 interpreter yolu bu Node surumunu kullanir.
PM2 ecosystem interpreter degeri process.execPath ile mutlak yola sabitlenir.
