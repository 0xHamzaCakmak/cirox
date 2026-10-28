# MASAM QR — ÇOKLU ŞUBE & FRANCHISE FİNANS/OPERASYON YÖNETİM PLATFORMU
## Tam Kapsamlı Sistem Spesifikasyonu ve Codex Geliştirme Rehberi

---

> **Bu Belgenin Amacı:**  
> Bu doküman, **MasaM QR** uygulamasının backend (veritabanı, API, servisler, yetkilendirme) ve frontend mimarisini uçtan uca açıklamak; OpenAI Codex, Claude veya yazılım mühendisliği ekiplerinin projeyi eş zamanlı ve hatasız bir şekilde adım adım inşa etmesini sağlamak amacıyla hazırlanmıştır.

---

## 1. GENEL BAKIŞ VE MİMARİ VİZYON

**MasaM QR**, restoran zincirleri, kafeler, döner/burger franchise ağları ve bağımsız gastronomi işletmeleri için tasarlanmış **Multi-Tenant (Çok Kiracılı) SaaS** platformudur.

Platform **3 ana katmandan (Bölümden)** oluşur:
1. **Şube Tarafı (Branch / Franchisee Module):** Mobil öncelikli (Mobile-First/PWA), günlük ciro/kasa kapanışı, fiş/fatura kamera tarama (OCR), giderler ve personel yevmiye takibi.
2. **Merkez Tarafı (HQ / Brand Management Module):** Şubeler arası finansal konsolidasyon, ciro/kârlılık analizi, royalty (ciro payı) hesaplama, merkezi gider kalemleri, şube sipariş ve borç-alacak mutabakatı.
3. **Admin Tarafı (SuperAdmin / SaaS Platform Module):** Abone restoran markalarının (tenant) lisans yönetimi, paket kotaları, Sanal POS ile otomatik/havale tahsilat, otomatik lisans kilitleme ve platform genel KPI'ları.

---

## 2. 3 ANA BÖLÜM VE FONKSİYONEL GEREKSİNİMLER

```
+-----------------------------------------------------------------------------------+
|                           MASAM QR SAAS PLATFORMU                                  |
+-----------------------------------------------------------------------------------+
|  [SÜPER ADMİN] SaaS Lisanslama, Aboneler, Sanal POS, Paketler, Otomatik Kilit     |
+-----------------------------------------------------------------------------------+
|  [MERKEZ - HQ] Konsolide Finans, Şube Karşılaştırma, Royalty, Borç-Alacak, Rapor  |
+-----------------------------------------------------------------------------------+
|  [ŞUBE - STORE] Mobil Giriş, Z-Raporu, Kasa Ciro, Kamera Fiş/OCR, Personel Yevmiye|
+-----------------------------------------------------------------------------------+
```

---

### BÖLÜM 1: ŞUBE TARAFI (BRANCH / FRANCHISEE MODULE)
*Mobil cihazlarda kasiyer, şube müdürü veya işletmeci tarafından hızlı ve hatasız kullanılmak üzere tasarlanmıştır.*

#### 1.1. Mobil Öncelikli Ciro Girişi (Z-Raporu & Kasa Kapanışı)
- **Ciro Dağılım Kalemleri:**
  - `creditCard` (Kredi Kartı / POS Tahsilatları)
  - `cash` (Nakit Kasa Girişi)
  - `online` (Online Paket Servis: Yemeksepeti, Trendyol Yemek, Getir, Migros Yemek vb.)
  - `other` (Açık hesap, yemek çeki/kartları Multinet/Sodexo/Ticket, kuponlar)
  - `total` (Otomatik hesaplanan brüt toplam)
- **Hızlı Giriş Özellikleri:**
  - Sayısal tuş takımı (`inputMode="decimal"`, `pattern="[0-9]*"`).
  - Hızlı artırma çipleri (+100 ₺, +500 ₺, +1.000 ₺, +5.000 ₺).
  - Z-Raporu fiş numarası ve kasa notu.

#### 1.2. Fiş & Fatura Kamera Entegrasyonu ve OCR Tarama
- Şube müdürü cep telefonu kamerası ile alışveriş fişi veya faturasını çeker.
- Görsel sıkıştırılır (max 1024px genişlik, WebP/JPEG) ve sunucuya iletilir.
- **OCR / Vision API Servisi:** Fiş üzerinden tarih, işletme adı, KDV oranları (%1, %10, %20) ve genel toplam tutarını otomatik okuyarak forma doldurur.

#### 1.3. Gider & Harcama Kayıtları
- **Tekil Giderler:** Kira, elektrik, su, kasap/et alımı, sebze/meyve, temizlik, nakliye/kurye yakıtı vb.
- **Personel Bazlı Harcamalar:** Personel yevmiyesi, haftalık avans, prim, elden nakit ödeme.
- Gider kalemi seçimi, fatura/fiş görseli eki, KDV oranı ve açıklama.

#### 1.4. Şube Personel & Yevmiye Takibi
- Şubede çalışan personellerin listesi (Aşçı, Garson, Kasiyer, Barista, Kurye).
- Günlük yevmiye ve aylık maaş modeli.
- Günlük çalışma durumuna göre yevmiye hak edişi ve avans kesintileri dökümü.

#### 1.5. ŞubeSipariş Entegrasyonu & Mutabakat
- Merkez depodan veya anlaşmalı tedarikçiden şubeye gönderilen hammadde maliyeti (`productCost`).
- Şubeden merkeze yapılan iadeler (`returnedCost`).
- Net maliyet (`netProductCost = productCost - returnedCost`).
- Beklenen ciro ve şubenin merkeze olan güncel borç tutarı (`branchDebt`).

---

### BÖLÜM 2: MERKEZ TARAFI (HQ / BRAND MANAGEMENT MODULE)
*Marka sahipleri, genel müdürlük, finans direktörleri ve franchise yöneticileri için analitik yönetim konsoludur.*

#### 2.1. Çoklu Şube Konsolide Finans Gösterge Paneli (Dashboard)
- Tüm şubelerin anlık toplam cirosu, toplam gideri ve konsolide net kârı.
- Şube bazlı ciro sıralaması (En yüksekten en düşüğe).
- Nakit vs POS vs Online Yemek Servisi pasta dağılımı.
- Dünkü ciro ve geçen haftanın aynı gününe göre büyüme yüzdesi.

#### 2.2. Şube Performans & KPI Skorlama (1-100 Puan)
- Ciro hedefi tutturma oranı.
- Gider / Ciro maliyet disiplini (İdeal oran %65-%75 altı).
- Personel gideri oranı (İdeal: cironun en fazla %15-%22'si).
- Şube denetim notları ve operasyonel kalite puanı.

#### 2.3. Royalty (Franchise Ciro Payı) & Marka Bedeli
- Şubelerle yapılan franchise sözleşmesine göre ciro payı modeli:
  - **Yüzdesel Model:** Aylık net ciro üzerinden belirlenen oran (%3 - %8).
  - **Sabit Bedel:** Aylık maktu franchise lisans ücreti.
- Otomatik hakediş tahakkuku ve şube cari hesabına borç kaydı oluşturulması.

#### 2.4. Dinamik Gider Kalemleri Yönetimi (Category Master)
- Yeni gider kategorisi tanımlama (Ad, tip: tekil/personel bazlı, KDV oranı, ikon).
- Sistem standart kalemleri ile işletmeye özel kalemlerin ayrımı.

#### 2.5. Şube Cari Ekstre & Borç-Alacak Takibi
- Şubeye gönderilen hammadde, merkez siparişleri, iadeler, royalty payı ve şubenin merkeze yaptığı banka transferlerinin konsolide cari ekstresi.

#### 2.6. Finansal Raporlama & Dışa Aktarma
- Gelir Tablosu (P&L: Ciro - Hammadde - Personel - Sabit Giderler = Net Faaliyet Kârı).
- Excel (.xlsx), CSV ve PDF formatında dışa aktarma (Export).

---

### BÖLÜM 3: ADMİN TARAFI (SAAS SUPERADMIN / PLATFORM MODULE)
*SaaS platformunun sahibi olan yazılım şirketi için çok kiracılı (multi-tenant) lisanslama ve gelir konsoludur.*

#### 3.1. Abone İşletmeler & Lisans Yönetimi (Tenant Management)
- Sistemde kayıtlı restoran zincirleri (Örn: Sarıyer Börekçisi, Burger Town, vb.).
- Firma unvanı, yetkili kişi, iletişim bilgileri, vergi dairesi/numarası.
- Lisans durumu yönetimi:
  - `active`: Lisans aktif, tüm şubeler ve merkez tam yetkili.
  - `trial`: Deneme süreci (Örn: 14 gün).
  - `near_due`: Vadesine 7 gün veya daha az kalanlar (Sarı uyarı).
  - `past_due`: Vadesi geçmiş (Kırmızı uyarı).
  - `passive`: Lisansı askıya alınmış / kilitlenmiş işletme.

#### 3.2. Lisans Paketleri & Kotalar
- **Starter Plan:** 1-3 Şube, temel ciro ve gider takibi.
- **Growth Plan:** 4-10 Şube, Z-raporu OCR, personel modülü, şube karşılaştırma.
- **Enterprise Plan:** Sınırsız şube, tam konsolidasyon, özel API entegrasyonu, öncelikli destek.
- Şube açma limiti (`branchLimit`) kontrolü: Merkez yeni şube eklerken lisans sınırına takılırsa paket yükseltme uyarısı alır.

#### 3.3. Abonelik Tahsilatları & Sanal POS Entegrasyonu
- **Otomatik Kredi Kartı Çekimi:** Kayıtlı karttan her ay sözleşme tarihinde otomatik çekim (iyzico / PayTR / Stripe entegrasyonu).
- **Merkez Banka Havalesi / EFT:** İşletmelerin şirket banka hesaplarına havale yapması ve dekont no/tarih ile sisteme manuel veya webhook ile işlenmesi.
- Tahsilat Defteri: Tüm tahsilat işlemleri, işlem no, fatura no, tutar, tarih ve durum.

#### 3.4. Otomatik Lisans Kilitleme & Akıllı WhatsApp Hatırlatma
- Vadesi dolan ve 3 gün içinde ödeme yapmayan abonenin sistemi otomatik olarak "Kısıtlı / Ödeme Bekleniyor" ekranına düşer.
- Süper admin tek tıkla şablonlu WhatsApp ödeme hatırlatma mesajı açabilir (`wa.me` API entegrasyonu).

#### 3.5. Platform Genel Finans Metrikleri
- MRR (Monthly Recurring Revenue - Aylık Düzenli Lisans Geliri).
- Toplam Abone Firma ve Aktif Şube Sayısı.
- Tahsilat Başarı Oranı (%98+).

---

## 3. VERİTABANI ŞEMASI (RELATIONAL / POSTGRESQL / CLOUD SQL)

Sistem ilişkisel veritabanı (PostgreSQL) üzerinde tasarlanmıştır. Tüm tablolarda `tenant_id` (`company_id`) bazlı veri izolasyonu esastır.

```
                      +-------------------+
                      |     companies     | (Tenants)
                      +---------+---------+
                                | 1
                                |
             +------------------+------------------+
             | n                                   | n
    +--------+--------+                   +--------+--------+
    |    branches     |                   |      users      |
    +--------+--------+                   +-----------------+
             | 1
             |
     +-------+-------+--------------------+--------------------+
     | n             | n                  | n                  | n
+----+----+     +----+----+          +----+----+          +----+----+
| daily_  |     |expenses |          |  staff  |          | sube_   |
|revenues |     +----+----+          +----+----+          | siparis |
+---------+          | 1                  | 1             +---------+
                     |                    |
                +----+----+          +----+----+
                | expense_|          |  staff_ |
                |category |          | payments|
                +---------+          +---------+
```

### 3.1. Tablo Tanımları (DDL)

```sql
-- 1. ENUM TİPLERİ
CREATE TYPE user_role AS ENUM ('admin', 'merkez', 'sube');
CREATE TYPE license_status AS ENUM ('active', 'passive', 'trial', 'past_due');
CREATE TYPE billing_method AS ENUM ('credit_card', 'bank_transfer', 'manual');
CREATE TYPE plan_tier AS ENUM ('starter', 'growth', 'enterprise');
CREATE TYPE payment_status AS ENUM ('success', 'pending', 'failed');
CREATE TYPE staff_payment_type AS ENUM ('yevmiye', 'avans', 'maas', 'prim');

-- 2. ABONE FİRMALAR (TENANTS)
CREATE TABLE companies (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(32) NOT NULL UNIQUE,
    sector VARCHAR(128) NOT NULL,
    owner_name VARCHAR(128) NOT NULL,
    owner_email VARCHAR(128) NOT NULL,
    owner_phone VARCHAR(32) NOT NULL,
    tax_number VARCHAR(32),
    tax_office VARCHAR(128),
    branches_count INT DEFAULT 1,
    status license_status DEFAULT 'active',
    plan_tier plan_tier DEFAULT 'growth',
    plan_name VARCHAR(64) DEFAULT 'Growth Pro',
    license_price DECIMAL(12, 2) NOT NULL DEFAULT 5000.00,
    billing_cycle VARCHAR(16) DEFAULT 'monthly',
    billing_method billing_method DEFAULT 'bank_transfer',
    branch_limit INT DEFAULT 5,
    start_date DATE NOT NULL,
    next_billing_date DATE NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    credit_card_last4 VARCHAR(4),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ABONELİK TAHSİLATLARI & ÖDEMELER
CREATE TABLE payment_records (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(12, 2) NOT NULL,
    method billing_method NOT NULL,
    status payment_status DEFAULT 'success',
    transaction_id VARCHAR(128) NOT NULL,
    invoice_number VARCHAR(64) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. KULLANICILAR & ROLLER
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) REFERENCES companies(id) ON DELETE CASCADE,
    branch_id VARCHAR(64),
    name VARCHAR(128) NOT NULL,
    email VARCHAR(128) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    title VARCHAR(64),
    phone VARCHAR(32),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. ŞUBELER
CREATE TABLE branches (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(128) NOT NULL,
    city VARCHAR(64) NOT NULL,
    district VARCHAR(64) NOT NULL,
    manager_name VARCHAR(128) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    status VARCHAR(16) DEFAULT 'active',
    royalty_rate DECIMAL(5, 2) DEFAULT 0.00, -- Örn: %4.00 royalty
    performance_score INT DEFAULT 85,
    login_email VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_branch_code_per_company UNIQUE (company_id, code)
);

-- 6. GÜNLÜK CİRO GİRİŞLERİ
CREATE TABLE daily_revenues (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    branch_name VARCHAR(128) NOT NULL,
    date DATE NOT NULL,
    credit_card DECIMAL(12, 2) DEFAULT 0.00,
    cash DECIMAL(12, 2) DEFAULT 0.00,
    online DECIMAL(12, 2) DEFAULT 0.00,
    other DECIMAL(12, 2) DEFAULT 0.00,
    total DECIMAL(12, 2) GENERATED ALWAYS AS (credit_card + cash + online + other) STORED,
    receipt_count INT DEFAULT 0,
    z_report_number VARCHAR(64),
    notes TEXT,
    submitted_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_branch_daily_revenue UNIQUE (branch_id, date)
);

-- 7. GİDER KALEMLERİ (KATEGORİLER)
CREATE TABLE expense_categories (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) REFERENCES companies(id) ON DELETE CASCADE, -- NULL ise sistem genel kalemi
    name VARCHAR(128) NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'single', -- 'single' veya 'staff_based'
    icon_name VARCHAR(64) DEFAULT 'Receipt',
    description TEXT,
    default_vat_rate DECIMAL(4, 2) DEFAULT 10.00, -- %1, %10, %20
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. GİDERLER & FATURALAR
CREATE TABLE expenses (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    branch_name VARCHAR(128) NOT NULL,
    category_id VARCHAR(64) NOT NULL REFERENCES expense_categories(id),
    category_name VARCHAR(128) NOT NULL,
    date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    vat_rate DECIMAL(4, 2) DEFAULT 10.00,
    description TEXT NOT NULL,
    receipt_number VARCHAR(64),
    receipt_image_url TEXT,
    staff_id VARCHAR(64),
    staff_name VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. PERSONELLER
CREATE TABLE staff (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    branch_name VARCHAR(128) NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    role VARCHAR(64) NOT NULL,
    daily_wage DECIMAL(10, 2) DEFAULT 0.00,
    monthly_salary DECIMAL(10, 2) DEFAULT 0.00,
    status VARCHAR(16) DEFAULT 'active',
    phone VARCHAR(32),
    hire_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. PERSONEL ÖDEME GEÇMİŞİ (YEVMİYE, AVANS)
CREATE TABLE staff_payment_history (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    staff_id VARCHAR(64) NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    staff_name VARCHAR(128) NOT NULL,
    date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type staff_payment_type NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. ŞUBE SİPARİŞ & MUTABAKAT ENTEGRASYONU
CREATE TABLE sube_siparis_integrations (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE UNIQUE,
    external_branch_id VARCHAR(64),
    product_cost DECIMAL(12, 2) DEFAULT 0.00,
    returned_cost DECIMAL(12, 2) DEFAULT 0.00,
    net_product_cost DECIMAL(12, 2) GENERATED ALWAYS AS (product_cost - returned_cost) STORED,
    expected_sales_amount DECIMAL(12, 2) DEFAULT 0.00,
    branch_debt DECIMAL(12, 2) DEFAULT 0.00,
    variance_note TEXT,
    last_sync_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. PERFORMANS İNDEKSLERİ
CREATE INDEX idx_daily_revenues_lookup ON daily_revenues(company_id, branch_id, date);
CREATE INDEX idx_expenses_lookup ON expenses(company_id, branch_id, date);
CREATE INDEX idx_staff_branch ON staff(company_id, branch_id);
CREATE INDEX idx_payments_company ON payment_records(company_id, date);
```

---

## 4. ADIM ADIM GELİŞTİRME PLANI (STEP-BY-STEP CONCURRENT ROADMAP)

Aşağıdaki adımlar, backend ve database işlemlerinden başlayarak frontend ile eş zamanlı geliştirilecek şekilde sıralanmıştır:

### AŞAMA 1: BACKEND TEMELLERİ VE VERİTABANI İNŞASI
1. **Veritabanı Migration ve Drizzle/Prisma Kurulumu:**
   - PostgreSQL üzerinde yukarıdaki tabloların migration dosyalarını oluşturun.
   - İlişkiler ve unique kısıtlamaları bağlayın.
2. **Multi-Tenancy & Auth Middleware:**
   - JWT doğrulama middleware'i oluşturun.
   - Her gelen istekte `req.user.companyId` ve `req.user.role` kontrolü yapın.
   - SuperAdmin harici tüm kullanıcıların sorgularına otomatik `WHERE company_id = ?` filtresi uygulayın.
3. **Seed Data:**
   - 1 Süper Admin kullanıcısı.
   - 2 Örnek Restoran Markası (Örn: Sarıyer Börekçisi ve Burger Town).
   - Bu markalara bağlı 3'er şube, personeller ve son 14 günlük örnek ciro/gider kayıtları.

### AŞAMA 2: ŞUBE MODÜLÜ API VE MOBİL ENTEGRASYONU
1. **Günlük Ciro API (`POST /api/branch/revenue`):**
   - Nakit, Kredi Kartı, Online ve Diğer kalemlerini valide edin.
   - Aynı şube ve gün için kayıt varsa `UPDATE` (upsert) veya hata döndürün.
2. **Kamera & Görsel Yükleme / OCR Servisi (`POST /api/branch/upload-receipt`):**
   - Görseli multipart/form-data veya base64 olarak kabul edin.
   - Gemini Vision veya Google Cloud Vision API kullanarak fiş metnini çözümleyin (Total, KDV, Tarih, Fiş No).
   - Çıkan sonucu JSON olarak şube mobil formuna ön doldurma için iletin.
3. **Gider Kaydı API (`POST /api/branch/expenses`):**
   - Tekil veya personel bazlı harcama kaydını oluşturun.
   - Fiş görseli URL'sini ekleyin.
4. **Şube Mobil Frontend:**
   - PWA Install Prompt ve Service Worker desteği.
   - Hızlı artırma çipleri ve mobil tuş takımı entegrasyonu.
   - Çevrimdışı (offline) durumunda IndexedDB kuyruğuna yazma ve internet gelince sync etme.

### AŞAMA 3: MERKEZ (HQ) MODÜLÜ API VE KONSOLİDASYON
1. **Konsolide Dashboard API (`GET /api/hq/dashboard-summary`):**
   - Tarih aralığında (günlük, haftalık, aylık) tüm şubelerin cirolarını toplayın.
   - Toplam giderleri kategori bazında gruplayın.
   - Net kâr = Toplam Ciro - Toplam Gider formülünü hesaplayın.
2. **Şube Sıralama ve KPI Skorlama Servisi (`GET /api/hq/branch-performance`):**
   - Şubeleri ciro, kârlılık ve gider disiplini puanına göre 1-100 arasında derecelendirin.
3. **Royalty Hesaplama Motoru (`POST /api/hq/royalty/calculate`):**
   - Ay sonunda şubelerin onaylanmış cirolarını çekin.
   - Sözleşmedeki yüzdeye göre franchise ciro payını ve KDV'sini hesaplayıp fatura taslağı oluşturun.
4. **ŞubeSipariş Cari Mutabakat Servisi (`GET /api/hq/branch-reconciliation/:branchId`):**
   - Merkezin gönderdiği ürün maliyeti vs şubenin bildirdiği satış cirosu arasındaki sapmayı (variance) raporlayın.

### AŞAMA 4: SÜPER ADMİN MODÜLÜ VE SANAL POS SİSTEMİ
1. **Firma & Lisans Yönetim API (`GET/POST/PUT /api/admin/tenants`):**
   - Yeni firma oluşturma, şube limiti ve lisans ücreti belirleme.
   - Lisans durumunu anlık değiştirme (Aktif / Askıya Al).
2. **Sanal POS Tahsilat API (`POST /api/admin/charge`):**
   - Kredi kartı veya havale/EFT ile ödeme kaydı oluşturma.
   - Başarılı tahsilatta `next_billing_date` tarihini 30 gün / 365 gün ileriye öteleme.
   - `payment_records` tablosuna benzersiz dekont ve fatura numarası ile log atma.
3. **Otomatik Vade Kontrolü & Cron Job:**
   - Her gece 00:01'de çalışan zamanlayıcı:
     - Vadesine 7 gün kalan işletmelere e-posta/SMS uyarısı.
     - Vadesi dolan ve 3 gün ödeme yapmayan firmanın durumunu `passive` yapıp şube ve merkez girişlerini kısıtlama.
4. **WhatsApp Entegrasyon Link Oluşturucu:**
   - `wa.me/905xxxxxxxxx?text=Sayin%20Yetkili...` şablonu ile tek tıkla tahsilat hatırlatma.

---

## 5. İŞ MANTIĞI VE FORMÜLLER (BUSINESS LOGIC)

| Metrik | Formül | Açıklama |
| :--- | :--- | :--- |
| **Toplam Günlük Ciro** | `creditCard + cash + online + other` | Şubenin kasasına giren tüm brüt hasılat. |
| **Şube Net Kârı** | `dailyRevenue - dailyExpense` | Cirodan personeller dahil tüm güncel giderlerin düşülmesi. |
| **Konsolide Merkez Net Kârı** | `Σ(Tüm Şubeler Ciro) - Σ(Tüm Şubeler Giderler)` | Franchise ağının brüt kârlılığı. |
| **Royalty Ciro Payı Bedeli** | `dailyRevenue * (royaltyRate / 100)` | Şubenin markaya ödemekle yükümlü olduğu isim hakkı payı. |
| **Net Hammadde Maliyeti** | `productCost - returnedCost` | Şubeye sevk edilen maldan iadeler düşüldükten sonraki tutar. |
| **Personel Maliyet Oranı** | `(Aylık Personel Gideri / Aylık Ciro) * 100` | İdeal hedef gastronomi için %18 - %22 aralığıdır. |
| **Şube Performans Skoru** | `(Ciro Puanı * 0.4) + (Kâr Puanı * 0.3) + (Maliyet Disiplini * 0.3)` | 1 - 100 arası normalize edilmiş karne skoru. |

---

## 6. CODEX PROMPT ŞABLONU (DİREKT KOPYALANIP KULLANILABİLİR)

Codex veya AI mühendisine görev verirken aşağıdaki metni doğrudan kullanabilirsiniz:

```text
Sen üst düzey bir Full-Stack Yazılım Mühendisisin.
Önümüzdeki proje: "MasaM QR — Çoklu Şube & Franchise Finans/Operasyon Yönetim Platformu".
Proje 3 temel bölümden oluşmaktadır:
1. Şube Tarafı (Mobil öncelikli ciro, gider, Z-raporu kamera/OCR, personel yevmiye)
2. Merkez Tarafı (Konsolide ciro/kâr, şube karşılaştırma, royalty hesaplama, cari mutabakat)
3. Admin Tarafı (SaaS müşteri lisansları, paket kotaları, Sanal POS tahsilatı, otomatik kilit)

Geliştirmeye AŞAMA 1'den (Database Şeması & PostgreSQL DDL / Drizzle ORM modelleri) başlayacağız.
Adım adım ilerle:
- İlk olarak veri tabanı tablolarını ve tiplerini oluştur.
- İkinci olarak Multi-Tenant ve Rol Bazlı Yetkilendirme (admin, merkez, sube) middleware'ini kur.
- Üçüncü olarak Şube Tarafı mobil ciro ve gider API'lerini yaz.
- Dördüncü olarak Merkez konsolidasyon ve analitik uç noktalarını tamamla.
- Beşinci olarak Süper Admin lisanslama ve Sanal POS ödeme motorunu bağla.

Her adımı temiz, TypeScript tip güvenliğine sahip ve üretime hazır (production-ready) kod olarak sun.
Hazırsan 1. Adımdan (Veritabanı Şemaları & Migration) başla!
```
