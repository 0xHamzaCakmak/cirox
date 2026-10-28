# Şube Analitik Cirox Backend

Frontend'den bağımsız Node.js 22 + Express + TypeScript + TypeORM + MySQL kurulumu.
`culinary-architect/backend` bağlantı ve çalıştırma düzeni örnek alınmıştır.
Bu nedenle proje spesifikasyonundaki PostgreSQL yerine MySQL kullanılır.
Kök package.json korunmuştur. Frontend'de yalnızca gerçek giriş, mevcut admin
formunun API bağlantısı ve Vite geliştirme proxy'si hazırlanmıştır; tasarım korunur.

## Yerel geliştirme

Komutları `backend` klasöründe çalıştırın. Windows PowerShell'de yürütme ilkesi
`npm` komutunu engelliyorsa `npm.cmd` kullanın.

```powershell
cd backend
npm.cmd ci
Copy-Item .env.example .env
# .env içindeki MySQL kullanıcı, şifre ve hedef veritabanını düzenleyin.
npm.cmd run db:init
npm.cmd run db:migrate
npm.cmd run seed:admin
npm.cmd run db:ping
npm.cmd run dev
```

`.env` zaten varsa üzerine kopyalamayın. Ayarlar çalışma dizininden bağımsız
olarak bu backend'in `.env` dosyasından okunur; sistem ortam değişkenleri önceliklidir.
`DB_*` alanları `DATABASE_URL` değerlerine göre önceliklidir. URL kullanırken
örnekteki `DB_*` bağlantı alanlarını kaldırın. URL şifrelerinde özel karakterleri
URL kodlamasıyla yazın.

Varsayılan API adresi: `http://127.0.0.1:4002/api/v1`.
Frontend mevcut komutuyla ayrı terminalde `3000` portunda çalışmaya devam eder.
Referans MasaM QR backend'inin `4001` portuyla çakışmaz.

MySQL sunucusu çalışır durumda olmalıdır. `db:init` komutu `.env` içindeki
hedef adla boş bir veritabanını yoksa oluşturur; bu işlem CREATE yetkisi gerektirir.
Varsayılan hedef `sube_analitik_cirox` adlı ayrı veritabanıdır.
Mevcut MasaM QR veritabanı adı kullanılmamalıdır. Başlangıçta otomatik veritabanı,
tablo veya kullanıcı oluşturulmaz. `DB_SYNCHRONIZE=false` sabittir.
İlk migration `companies`, `branches`, `users`, `auth_sessions` tablolarını kurar;
uygulanan sürümler `schema_migrations` tablosunda takip edilir. Finans ve personel
tabloları ilgili modüller geliştirilirken sonraki migration'larla eklenecektir.
Dördüncü migration günlük ciro (`daily_revenues`) ve fiş eklerini (`receipt_files`) kurar.
Beşinci migration gider kalemleri, gider kayıtları ve personel bağlantı tablosunu
kurar; fişlerin giderlere bağlanmasını sağlar. İlk dokuz sistem gider kalemi eklenir.
Altıncı migration şubeye özel kalem ayarlarını ve eski giderlerde kalem adı/tipi
anlık görüntülerini ekler.
İkinci migration `companies.kind` (center/business) ve isteğe bağlı
`branches.center_company_id` alanlarını ekler; mevcut merkez bağlantılarını korur.
Üçüncü migration benzersiz `users.username` alanını ekler. Mevcut işletmelerin
kodları kullanıcı adına dönüştürülür; uygun olmayan veya tekrar eden kodlar için
benzersiz bir kullanıcı adı üretilir. Mevcut e-posta ve şifreler korunur.

## İlk admin ve şube hesabı

`backend/.env` içine `SEED_ADMIN_EMAIL` ve en az 12 karakterlik benzersiz
`SEED_ADMIN_PASSWORD` yazıp `npm run seed:admin` çalıştırın. Komut mevcut admin
hesabını veya şifresini değiştirmez; sunucu açılışında otomatik hesap oluşturulmaz.

1. Frontend'deki mevcut giriş alanlarından admin e-postası/şifresiyle giriş yapın.
2. Aboneler & Lisanslar ekranındaki mevcut işletme oluşturma formunu açın.
3. İşletme adı, benzersiz kullanıcı adı, sorumlu, giriş e-postası ve en az 6 karakterlik şifre girin.
   Bağlanacağı mevcut bir merkez varsa listeden seçin. Seçilmezse “Merkez yok”
   olarak bağımsız işletme açılır. Bu form yeni merkez oluşturmaz.
4. Otomatik giriş kutusu açıksa yeni şube hesabına geçilir. Kapalıysa admin
   hesabında kalınır; çıkış yapıp işletmenin kullanıcı adı veya e-postası/şifresiyle giriş yapılabilir.

Kullanıcı adı 3–32 karakterdir: İngilizce harf, rakam, nokta, tire ve alt çizgi.
Büyük/küçük harf ayrımı yapılmaz; kullanıcı adları tüm işletmeler arasında
benzersizdir. `POST /auth/login` `{ identifier, password }` kabul eder; identifier
kullanıcı adı veya e-posta olabilir. Eski `{ email, password }` istekleri de desteklenir.
İşletme oluşturma API'sinde `username` kullanılır; önceki `establishmentCode`
alanı geriye uyumluluk için kullanıcı adı olarak kabul edilir.

İşletmenin özel veri alanı, şube ve kullanıcı tek transaction ile kaydedilir. Tekrarlanan e-posta/kod,
pasif merkez ve şube kotası kontrol edilir. Yeni şubenin mali göstergeleri sıfırdır.
Mevcut demo butonları yalnızca örnek frontend verileriyle çalışır; API yetkisi
vermez. Gerçek oturumda perspektif butonları kullanıcı rolünü değiştirmez.
Admin, merkez ve şube modülü butonlarıyla mevcut sayfalara geçer; yetkisi admin
olarak kalır. Ayrı bir admin arayüzü oluşturulmamıştır.

İşletmenin `company_id` alanı kendi verisinin sahibidir; `center_company_id`
yalnızca izleme bağlantısıdır ve boş olabilir. İşletme oluşturma formundaki merkez
listesi yalnızca `kind=center` hesaplarını içerir; başka işletmeler merkez seçilemez.
Merkez hesabı sadece kendisine bağlı işletmeleri görüntüler, bağımsız veya başka
merkeze bağlı işletmelere erişemez. Bağlantı kaldırıldığında izleme yetkisi anında
sona erer. İşletmenin hesabı, verisi ve mevcut oturumu bağlantı değişiminden etkilenmez.
Sonraki finans API'leri `writableBranch` kontrolünü kullanmalıdır; merkez rolü
işletme kayıtlarına yazamaz. `/branches` altındaki tüm yazma istekleri ayrıca
merkez rolü için engellenir.
Henüz backend'i hazırlanmayan işlemler gerçek hesaplarda kayıt yapmaz ve mevcut
bildirim alanında bilgi gösterir.

Şifreler scrypt ile hashlenir. Rastgele oturum anahtarının yalnızca SHA-256 özeti
veritabanında saklanır; tarayıcıda HttpOnly, SameSite=Lax ve production'da Secure
çerez kullanılır. Oturum süresi `SESSION_TTL_DAYS` ile belirlenir. Çıkışta oturum
sunucuda iptal edilir. Kullanıcı/şube/firma durumu her yetkili istekte kontrol edilir.

Giriş endpoint'i 15 dakikada IP başına 20 denemeyle sınırlıdır. PM2/Nginx
kurulumunda `trust proxy` varsayılan olarak kapalıdır; reverse proxy arkasında
bu sınır proxy IP'si için ortak uygulanır. Proxy topolojisi belli olduğunda
güvenilen proxy adresleri ayrıca yapılandırılmalıdır.

## Kontroller

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run db:ping
npm.cmd start
```

- `GET /api/v1/health`: HTTP servisi kontrolü.
- `GET /api/v1/health/ready`: MySQL sorgusu ile hazır olma kontrolü; bağlantı yoksa 503.
- Backend başlangıçta veritabanı bağlantısı başarısız olursa hata koduyla kapanır.

Kimlik doğrulama ve minimum admin API'leri:

- `POST /api/v1/auth/login`: kullanıcı adı veya e-posta/şifre ile giriş ve yetkili başlangıç verileri.
- `GET /api/v1/auth/me`: oturum doğrulama ve başlangıç verilerini yenileme.
- `POST /api/v1/auth/logout`: oturumu iptal etme.
- `GET /api/v1/admin/tenants`: yalnızca admin için firmalar/şubeler.
- `POST /api/v1/admin/establishments`: yalnızca admin için şube ve kullanıcı oluşturma.
- `POST /api/v1/admin/establishments/:branchId/center`: admin tarafından merkez bağlantısı atama/kaldırma (`centerCompanyId: string | null`); sahiplik değişmez.
- `GET /api/v1/branches/:branchId`: işletme sahibi/admin/bağlı merkez için profil görüntüleme.

Frontend geliştirmede Vite `/api` isteklerini 4002 portuna yönlendirir.
Farklı dağıtımlarda `VITE_API_BASE_URL` kullanılabilir; üretimde aynı origin
üzerinden `/api/v1` yönlendirmesi önerilir. Arayüzün JSX yapısı ve sınıfları
değiştirilmeden mevcut form davranışları bağlanmıştır.

`npm run test:auth` entegrasyon testi yapılandırılmış veritabanında geçici
test hesapları açar; yalnızca kendi oluşturduğu kayıtları sonunda siler.
Giriş, yetkisiz erişim, tenant izolasyonu, kota, tekrar kayıt/rollback,
pasif hesaplar, oturum süresi ve çıkış davranışını doğrular.
Canlı sunucuda değil, geliştirme veritabanında çalıştırın.
Günlük ciro ve gider kayıtları gerçek veritabanına bağlıdır. Personel yönetimi,
OCR ve ödeme modülleri sonraki aşamaların kapsamındadır.

## Giderler, faturalar ve muhasebe görünümü

- `POST /api/v1/branch/expenses`: `branchId`, `clientRequestId` (UUID), `categoryId`,
  `date`, `amount`, `vatRate`, `description`, opsiyonel `staffId`/`receiptNumber`,
  `receiptIds` alır. Tutar kuruş hassasiyetindedir; KDV oranı 0/1/10/20 olabilir.
  İşletme ve kayıt yapan kullanıcı sunucu oturumundan belirlenir.
- `GET /api/v1/branch/expenses?branchId=...`: yetkili gider listesi.
- `POST /api/v1/branch/expenses/:expenseId/delete`: kaydı aktif listeden kaldırır;
  `deleted_at`/`deleted_by` ile arşivde ve fişleri R2'de korur. Kalıcı silme yapmaz.

Yalnızca işletmenin kendi kullanıcısı gider oluşturur/kaldırır. Bağlı merkez ve
admin görüntüler. Personel bazlı giderlerde KDV sıfırdır, fotoğraf isteğe bağlıdır;
personel seçildiyse aynı şubeye ait aktif personel olması gerekir. Personel
seçilmeden genel personel ödemesi de kaydedilebilir. Diğer giderlerde en az bir
R2 fotoğrafı zorunludur. Aynı fotoğraf başka giderde veya ciro kaydında kullanılamaz.
`clientRequestId` tekrar gönderilirse aynı içerik tek kayıt olarak kalır; farklı
içerikle tekrar kullanım hata verir. İşlemler transaction ile tamamlanır.

Kayıt/kaldırma cevabı güncel gider, şube ve net kâr verilerini içerir; liste ve
özetler yenilemeden güncellenir. Pencereye yeniden odaklanıldığında veriler
yeniden okunur. Muhasebe dosyası, yeni gider ve fiş çekme içerik alanında ayrı
tam sayfalardır (`expense_accounting`, `expense_new`, `expense_camera`); Giderlere
Dön kontrolü listeye getirir. Mobil kısayollar da bu sayfalara yönlenir.

Muhasebe görünümünde gerçek işletme adı, güncel tarih, dönem filtresi, iki ondalıklı
KDV hesabı ve tüm fotoğraf ekleri gösterilir. PDF düğmesi tarayıcı yazdırmasını
açar; PDF olarak kaydet seçilerek dışa aktarılır. Yazdırmada sol menü ve uygulama
üst çubuğu gizlenir. Bu çıktı uygulama kayıt dökümüdür, muhasebe onayı yerine geçmez.

`npm run test:revenue` artık gider oluşturma, fotoğraf bağlama, idempotency,
tenant izolasyonu, merkez yazma yasağı, toplamların güncellenmesi ve arşivlemeyi
de gerçek DB/R2 üzerinde test eder; yalnızca kendi geçici kayıtlarını temizler.

## Şubeye özel gider kalemleri

Şube menüsünde Gider Kalemleri bulunur. İlk dokuz sistem kalemi yeni işletmelerde
varsayılan olarak aktiftir. Her şube sistem kaleminin adını, tipini, açıklamasını,
varsayılan KDV oranını ve görünürlüğünü kendisi için değiştirebilir; sistem
şablonu ve diğer işletmeler etkilenmez. Özel kalemler şube sahipliğiyle kaydedilir.
`branch_expense_category_settings` tablosu şube bazındaki ayarları tutar.

- `GET /api/v1/branch/expense-categories?branchId=...`: yetkili şube kalemleri.
- `POST /api/v1/branch/expense-categories`: şubenin yeni kalemi; `branchId`, `name`,
  `type`, `description`, `iconName`, `defaultVatRate`, `isActive` alır.
- `POST /api/v1/branch/expense-categories/:id/update`: aynı alanların değişecek
  olanlarıyla düzenleme; `branchId` zorunludur. Sadece `isActive` gönderilerek
  göz düğmesiyle gizleme/etkinleştirme yapılır. Kalıcı silme yoktur.

İşletmenin kendi şube kullanıcısı yazar; merkez ve admin görüntüler. Kalem adı
aynı şubede tekrar edemez; gizli bir kalemle aynı isimde yeni kalem açmak yerine
mevcut kalem etkinleştirilir. Personel bazlı kalemde varsayılan KDV sıfıra sabitlenir.
Tüm kalemler kapalıysa gider formu yeni kayıt kabul etmez ve kalemler sayfasına
yönlendirme gösterir. Gizli veya başka şubeye ait kalemle API üzerinden yeni
gider kaydı da reddedilir. Kapatılan kalemler geçmiş giderleri ve raporları silmez.
Yeni giderlerde kalem adı ve tipi kayıt anında saklanır; sonradan düzenlenen ad/tip
eski giderin anlamını değiştirmez. Liste/rapor filtreleri geçmiş kayıtlara erişimi korur.

## Geliştirmede canlı güncelleme

Vite HMR açıktır; Windows dosya değişiklikleri polling ile izlenir. Geliştirmede
PWA service worker üretilmez; eski yerel `/sw.js` veya `/dev-sw.js` kaydı uygulama
açılışında kaldırılır. Gerekirse uygulama bir kez otomatik yenilenerek eski worker'dan
çıkar. Üretim PWA davranışı korunur. `node scripts/check-hmr.mjs` proje kökünde
çalıştırılarak gerçek Vite websocket'i ve geçici, görünümü değiştirmeyen CSS
işaretiyle canlı güncelleme kontrol edilir; işaret test sonunda kaldırılır.

## Günlük ciro ve fotoğraflar

- `POST /api/v1/branch/revenue`: yalnızca işletmenin kendi şube kullanıcısı yazar.
  Alanlar: `branchId`, `date`, `creditCard`, `cash`, `online`, `other`, `notes`, `receiptIds`.
  Şube/tarih çifti benzersizdir; tekrar kayıtta aynı gün güncellenir. Tutarlar
  en fazla iki ondalık basamakla kabul edilir; toplam DB tarafından hesaplanır.
  İşletme ve kaydı yapan kullanıcı istemciden alınmaz, oturumdan belirlenir.
- `GET /api/v1/branch/revenue?branchId=...`: kendi işletmesi, admin veya bağlı merkez okur.
- `POST /api/v1/branch/:branchId/receipts`: `multipart/form-data`, `image` alanı;
  JPEG/PNG/WebP ve sunucudaki decoder'ın desteklediği HEIF fotoğrafları, en fazla 20 MB.
  Görsel doğrulanır (en fazla 60 megapiksel), yönü düzeltilir; uzun kenar en fazla
  4096 piksel olacak şekilde, oranı korunarak WebP'ye çevrilir. Küçük görseller
  büyütülmez. Kalite 88, effort 6 ve smart subsampling kullanılır; GPS/EXIF
  metadata'sı çıkarılır. Okunabilirliği bozacak sabit bir KB sınırı zorlanmaz.
  VPS diskinde veya R2'de ayrıca orijinal kopya tutulmaz; R2'ye optimize edilmiş
  tek dosya yazılır. İşlem sırasında sunucu RAM'i kullanılır.
- `GET /api/v1/branch/receipts/:id`: oturum ve şube yetkisi kontrol edilerek görsel döner.

Her güne en fazla 8 fotoğraf eklenebilir. Başka şubeye veya başka günün kaydına
ait görseller eklenemez. Kayıttan çıkarılan fotoğraf R2'den kalıcı silinmez;
bağlantısı kaldırılır. Kaydedilmeden bırakılan fotoğraflar da `receipt_files`
üzerinde ilişkisiz kalır; ileride arşiv/saklama politikasıyla temizlenebilir.
Yeni fotoğraf yükleme veya kayıt hatasında başarı bildirimi verilmez.

R2 bağlantısı MasaM QR ile aynı S3 düzenini kullanır; nesneler ayrı
`cirox/receipts/` dizininde tutulur. Fişlere SSE-C ile ayrı AES-256 anahtarı
uygulanır; ürün bucket'ı halka açık olsa bile bu anahtar olmadan fiş okunamaz.
İstemciye R2 anahtarı veya public medya URL'si verilmez; görseller yetkili API'den
sunulur. [Cloudflare S3 uyumluluk dokümanı](https://developers.cloudflare.com/r2/api/s3/api/).

Görsel API'si `Cache-Control: private, no-cache`, `Vary: Cookie` ve fotoğrafa
özel `ETag` döndürür. Tarayıcı dosyayı saklayabilir; tekrar açılışta önce oturum
ve şube yetkisi doğrulanır. ETag eşleşirse R2 okunmadan ve görsel byte'ları
gönderilmeden `304` döner. `no-cache` saklamayı değil, tekrar kullanmadan önce
doğrulamayı gerektirir. Diğer API yanıtları `no-store` kalır. Sunucu ayrıca
5 dakika / süreç başına en fazla 32 MB LRU RAM önbelleği kullanır; aynı dosyanın
eşzamanlı okumaları birleştirilir. Disk önbelleği veya kalıcı tarayıcı service
worker fotoğraf önbelleği eklenmez. Yetkisiz istek önbelleğe rağmen reddedilir.

Bu yol Cloudflare edge CDN değildir. R2 kullanımı tek başına CDN anlamına
gelmez; CDN için özel alan adı ve erişim denetimiyle ayrı dağıtım yapılandırması
gerekir. Mevcut özel fişler halka açık ürün görselleri gibi sunulmaz.

`.env` alanları: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_BUCKET`, `R2_RECEIPT_ENCRYPTION_KEY` (32 rastgele byte'ın base64 karşılığı).
**Şifreleme anahtarını yedekleyin; VPS'te aynı değer kullanılmalıdır.** Eski
dosyaları taşımadan bu anahtarı değiştirmeyin. Bağlantı bilgileri yalnızca
backend `.env` dosyasındadır, frontend'e aktarılmaz.

`npm run r2:check` geçici test görseliyle şifreli yazma/okuma ve anahtarsız erişim
reddini kontrol eder; yalnızca kendi test görselini siler. `npm run test:revenue`
geçici hesaplarla gerçek DB ve R2 üzerinde uçtan uca ciro/fotoğraf testini çalıştırır
ve kendi kayıtlarını temizler. Bu komutlar R2 ağ erişimi gerektirir.

Mobil ve masaüstünde `getUserMedia` arka kamera tercihiyle kamera izni ister.
HTTPS (geliştirmede localhost) gerekir. HTTP LAN adresinden telefonda canlı
kamera kullanılamaz; ekranda açıklama ve yerleşik kamera/dosya yakalama seçeneği
sunulur. İzin reddi ayrıca açıklanır. Destekleniyorsa ImageCapture ile fotoğraf,
diğer cihazlarda video karesinden yüksek kaliteli JPEG alınır. Sayfadan çıkınca
veya sekme arka plana geçince kamera durdurulur. Dosya Seç ile galeriden de
eklenebilir. OCR uygulanmaz; fotoğraflar kayıt ekidir.
VPS Nginx `/api/` yönlendirmesinde yükleme için `client_max_body_size 24m;`
tanımlanmalı; `/api/v1` yolları ve çerezler korunmalıdır.
`npm run test:receipts` görüntü optimizasyonu ve RAM önbelleğini R2 bağlantısı
gerektirmeden doğrular. `test:revenue`, gerçek DB/R2 ve yetkili ETag/304 akışını
geçici kayıtlarla test eder.

## Personel ücretleri ve ödemeler

`1793145606000-StaffCompensation` migration'ı ücretin giriş esasını ve giderin
günlük/aylık ödeme bilgisini ekler. Günlük ücret × 30 = aylık ücret; aylık ücret
÷ 30 = günlük ücret (kuruşa yuvarlanır). Son girilen esas korunur; örneğin
10.000 TL aylık ücretin günlük karşılığı 333,33 TL olsa da aylık tutar değişmez.

`POST /api/v1/branch/staff` personel oluşturur; `/:staffId/update` ve
`/:staffId/status` aynı yol altında profil ve çalışma durumunu günceller.
İşlemler yalnızca işletmenin kendi şube hesabına açıktır. Oluşturma isteği
`clientRequestId` ile tekrarlansa da ikinci personel oluşmaz.

Personel ödemesi `/branch/expenses` üzerinden tek gider olarak saklanır.
`paymentBasis` (`daily`/`monthly`) ve `staffPaymentType` gider kaydındadır.
Personelin adı ve kayıt anındaki ücretleri geçmiş kayıtta korunur. Ödeme
geçmişi bu giderlerden üretilir; ayrıca ödeme satırı oluşturularak çift sayılmaz.
Raporlar ödeme tarihine göre gerçekleşen tutarı toplar: aylık ödeme otomatik
olarak günlere dağıtılmaz. Gider arşivlenirse ödeme geçmişinden de çıkar.

## Şube ayarları ve mevcut kullanıcı hesabı

`1793145607000-BranchSettings` migration'ı şubenin resmi unvan, ticaret sicili,
vergi dairesi/numarası ve iletişim e-postasını ekler. Mevcut telefon alanı
kullanılır. `POST /api/v1/settings/business` yalnızca giriş yapılan şubenin
bilgilerini günceller; hedef şube veya kullanıcı kimliği istemciden alınmaz.

`POST /api/v1/settings/profile` şube kullanıcısının kendi adını, kullanıcı adını,
giriş e-postasını ve telefonunu günceller. Mevcut şifre her güncellemede doğrulanır.
İsteğe bağlı yeni şifre en az 8 karakterdir. Şifre değişikliğinde eski oturumlar
silinir, açık oturum için yeni HttpOnly çerez oluşturulur. Rol, işletme veya şube
üyeliği bu uçtan değiştirilemez. `npm run test:auth` profil, şifre, oturum iptali
ve ayarların şubeler arasında yalıtılmasını geçici kayıtlarla doğrular.

ŞubeSipariş ve MasaM QR entegrasyon sekmeleri yalnızca demo alanlarıdır. API
anahtarları, alan adları ve eşleştirme kimlikleri örnektir; sunucuya kaydedilmez,
dış servise istek atılmaz ve finansal kayıt üretilmez. Gerçek entegrasyon ve
çoklu şube üyelikleri bu aşamada uygulanmamıştır.

## VPS / PM2

VPS'te aynı backend klasörü ve o sunucuya özel `.env` kullanılır. Yerel `.env`
ve node_modules sunucuya taşınmaz. Ayrı veritabanı ve ona yetkili kullanıcıyı
hazırlayıp sunucudaki `.env` içine girin. Alan adı ve TLS/Nginx ayarları sunucuya
göre ayrıca tamamlanmalıdır. Aşağıdaki komutlar yalnızca kurulum rehberidir;
bu aşamada VPS'e bağlantı veya yayın yapılmamıştır.

```bash
cd /projenin/yolu/backend
npm ci
# İlk kurulumda .env.example dosyasından .env oluşturup düzenleyin.
npm run typecheck
npm run build
# Veritabanı DBA tarafından önceden hazırlanmamışsa, yalnızca ilk kurulumda:
npm run db:init
npm run db:migrate
# Yalnızca ilk admin kurulumu için, .env SEED_ADMIN alanları hazır olduktan sonra:
npm run seed:admin
npm run db:ping
pm2 start ecosystem.config.cjs --env production
pm2 save
curl --fail http://127.0.0.1:4002/api/v1/health/ready
```

Sonraki güncellemelerde build sonrasında:
`pm2 reload ecosystem.config.cjs --env production --update-env`.
PM2 sistem başlangıç ayarı (`pm2 startup`) VPS kullanıcısına göre ayrıca yapılır.
Nginx `/api/` isteklerini `http://127.0.0.1:4002` adresine, yolunu koruyarak
iletmelidir. `PUBLIC_FRONTEND_ORIGINS` gerçek HTTPS frontend adreslerini içermelidir.
API ve MySQL aynı VPS'teyse `DB_HOST=127.0.0.1`, `DB_PORT=3306` düzeni korunur.
