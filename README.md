# CIROX — Şube ve Ciro Yönetimi

React/Vite frontend ve Express/TypeORM/MySQL backend. Şube ciro, gider, personel,
raporlama, kullanıcı hesabı ve yetkili R2 fiş arşivi modülleri içerir.

## VPS'te güncelleme

İlk sunucu ayarları tamamlandıktan sonra proje klasöründe:

```bash
bash deploy.sh
```

Script GitHub güncellemesi, bağımlılıklar, derleme, DB yedeği, migration,
PM2 geçişi, sağlık kontrolü ve frontend yayınını yürütür.

**İlk kurulum ve hata/kurtarma ayrıntıları:** [Deploy rehberi](deploy/README.md).

## Yerel geliştirme

Node.js 22+ ve MySQL gerekir. Frontend `npm ci` / `npm run dev` ile 3000 portunda
çalışır. Backend bağlantı ayarları, migration ve ilk admin kurulumu için
[backend rehberini](backend/README.md) izleyin; `npm --prefix backend run dev`
API'yi 4002 portunda başlatır. Gizli `.env` dosyaları Git'e dahil edilmez.
