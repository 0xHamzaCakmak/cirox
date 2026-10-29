# Patron mobil arayüzü ve PWA kontrol raporu

Mobil yerleşim kuralları gerçek `merkez` hesabında, en fazla 767 px genişlikte devreye girer. Masaüstündeki mevcut kart/sütun düzeni korunur. Bu çalışmada backend API'leri, veritabanı, finans hesaplamaları ve yetkiler değiştirilmedi.

## Yapılanlar

- Kompakt başlık, tek drawer ve sabit **Panel – Şubeler – Menü** navigasyonu; drawer'da Escape, odak yönetimi ve geri dönüş.
- Mobilde ayrı kart/tablo tercihi: şubeler kartlarla açılır, masaüstü varsayılanı tablo kalır. Mobil şube araması eklendi. Geniş tablolar sadece kendi alanlarında kaydırılır.
- Şube incelemede iki sütunlu KPI'lar, tam genişlikte dağılımlar ve dikey personel kartları. Tarihler 16 px yazılı, en az 44 px yüksekliğinde alanlardan seçilir.
- Dashboard'da okunabilir KPI'lar, ekrana uyan grafikler ve veri olmadığında açıklayıcı durum mesajı.
- Gündüz/gece teması, bildirimler, fiş görüntüleme ve 10/25/50 sayfalama korunur. Alt navigasyon için safe-area dahil içerik payı bırakılır.
- Ayarlar sayfasında sadece taşma, dokunma alanları ve sekme kullanımına yönelik mobil düzeltmeler yapıldı.
- PWA manifesti CiroX/Türkçe olarak düzenlendi; ikonlar, standalone, viewport ve iOS metaları doğrulandı. API istekleri service worker'da `NetworkOnly`; `/api` HTML/offline fallback dışında. Sunucunun mevcut `no-store` davranışı korunur.

## Değiştirilen dosyalar

Yeni dosyalar:

- `src/patron-mobile.css`
- `src/hooks/useMobileViewport.ts`
- `src/components/common/PatronMobileHeader.tsx`
- `src/components/common/PatronMobileDrawer.tsx`
- `scripts/patron-mobile.browser.test.mjs`
- `scripts/patron-pwa.test.mjs`
- `docs/patron-mobile-ui.md`

Güncellenen dosyalar:

- `src/App.tsx`, `src/context/AppContext.tsx`, `src/index.css`
- `src/components/common/Header.tsx`, `MobileNav.tsx`, `NotificationBell.tsx`
- `src/components/common/CenterDashboardOverview.tsx`, `BranchExpenseHistory.tsx`, `ReceiptModal.tsx`
- `src/components/pages/BranchesPage.tsx`, `BranchDetailPage.tsx`
- `vite.config.ts`, `index.html`

## Testler

- İzole headless Chrome'da **320, 360, 375, 390, 430, 768, 1024, 1440, 1920 px**: **44 yerleşim kontrolü başarılı**.
- Sayfa yatay taşması, kart sütunları, 44×44 dokunma alanları, 16 px input yazıları, alt navigasyonun içerikle çakışmaması, tema ve bildirim açılır kutusu kontrol edildi.
- Tarih menüsü ve özel tarih aralığı, arama, şube değişimi, geri dönüşte tarihlerin korunması, fiş görüntüleme, 10/25/50 sayfalama ve tema tercihinin yenilemeden sonra korunması doğrulandı.
- Şube ve admin hesaplarında patron mobil header/navigasyonunun devreye girmediği doğrulandı.
- Hesaplama/yetki/şube seçimleri için **19 test**, oluşturulan PWA paketi için **3 test**, TypeScript kontrolü ve üretim derlemesi başarılı.
- Tarayıcı testleri tüm API isteklerini izole test yanıtlarıyla karşılar; müşteri hesabına bağlanmaz ve veri yazmaz.

Ekran görüntüleri ve ölçümler: `coverage/patron-mobile-qa/` (Git dışında); ayrıntılı ölçümler `results.json` dosyasında.

Testleri tekrarlamak için:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 3033
node --import tsx scripts/patron-mobile.browser.test.mjs
npm.cmd run lint
npm.cmd run build
node --test scripts/patron-pwa.test.mjs
```

Tarayıcı testi varsayılan olarak kurulu Chrome'u kullanır; farklı bir Chromium yolu `CIROX_TEST_BROWSER` ile verilebilir.

Gerçek iOS Safari/Android cihazda ana ekrana kurulum, sanal klavye ve cihaz çentiği davranışı bu Windows ortamında fiziksel cihazla doğrulanmadı. Bu cihazlar için gerekli manifest/viewport/safe-area kuralları kontrol edildi.
