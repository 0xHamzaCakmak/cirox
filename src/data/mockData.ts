import { Branch, ExpenseCategory, ExpenseRecord, Staff, StaffPaymentHistory, DailyRevenueRecord, Company, PaymentRecord } from '../types';

export const INITIAL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    id: 'cat-1',
    name: 'Personel',
    type: 'staff_based',
    iconName: 'Users',
    description: 'Günlük yevmiye, avans ve personel prim ödemeleri',
    isSystem: true,
  },
  {
    id: 'cat-2',
    name: 'Kasap & Et Ürünleri',
    type: 'single',
    iconName: 'Beef',
    description: 'Taze kırmızı et, tavuk ve işlenmiş et alımları',
    isSystem: true,
  },
  {
    id: 'cat-3',
    name: 'İçecek & Meşrubat',
    type: 'single',
    iconName: 'Coffee',
    description: 'Kahve, çay, asitli meşrubatlar ve su tedariği',
    isSystem: true,
  },
  {
    id: 'cat-4',
    name: 'Sebze & Meyve (Hal)',
    type: 'single',
    iconName: 'Apple',
    description: 'Günlük taze hal alımları ve yeşillikler',
    isSystem: true,
  },
  {
    id: 'cat-5',
    name: 'Temizlik & Hijyen',
    type: 'single',
    iconName: 'Sparkles',
    description: 'Deterjan, peçete, kimyasal ve mutfak hijyen malzemeleri',
    isSystem: true,
  },
  {
    id: 'cat-6',
    name: 'Nakliye & Lojistik',
    type: 'single',
    iconName: 'Truck',
    description: 'Merkez depo sevkiyat ve kargo taşıma giderleri',
    isSystem: true,
  },
  {
    id: 'cat-7',
    name: 'Kira & Ortak Alan',
    type: 'single',
    iconName: 'Building2',
    description: 'Dönemsel şube kira ve AVM ortak gider payı',
    isSystem: true,
  },
  {
    id: 'cat-8',
    name: 'Elektrik & Doğalgaz & Su',
    type: 'single',
    iconName: 'Zap',
    description: 'Enerji, fırın doğalgaz ve şebeke suyu harcamaları',
    isSystem: true,
  },
  {
    id: 'cat-9',
    name: 'Diğer Genel Giderler',
    type: 'single',
    iconName: 'MoreHorizontal',
    description: 'POS komisyonları, kırtasiye, küçük bakım onarım',
    isSystem: true,
  },
];

interface RawBranchInfo {
  code: string;
  name: string;
  city: string;
  district: string;
  manager: string;
  phone: string;
  baseRevenue: number;
  staffCount: number;
}

// Anadolu Lezzetleri Gıda A.Ş. (40 Şube)
const rawBranches: RawBranchInfo[] = [
  // İstanbul (20 şube)
  { code: 'IST-01', name: 'Kadıköy Moda Şubesi', city: 'İstanbul', district: 'Kadıköy', manager: 'Emre Yılmaz', phone: '0216 330 12 40', baseRevenue: 78500, staffCount: 14 },
  { code: 'IST-02', name: 'Beşiktaş Çarşı Şubesi', city: 'İstanbul', district: 'Beşiktaş', manager: 'Selin Aksoy', phone: '0212 258 41 12', baseRevenue: 86200, staffCount: 16 },
  { code: 'IST-03', name: 'Bakırköy İskele Şubesi', city: 'İstanbul', district: 'Bakırköy', manager: 'Mustafa Demir', phone: '0212 571 88 90', baseRevenue: 64200, staffCount: 11 },
  { code: 'IST-04', name: 'Şişli Nişantaşı Şubesi', city: 'İstanbul', district: 'Şişli', manager: 'Banu Çelik', phone: '0212 296 33 00', baseRevenue: 94800, staffCount: 18 },
  { code: 'IST-05', name: 'Üsküdar Meydan Şubesi', city: 'İstanbul', district: 'Üsküdar', manager: 'Ahmet Karahan', phone: '0216 553 10 20', baseRevenue: 59000, staffCount: 10 },
  { code: 'IST-06', name: 'Ataşehir Batı Şubesi', city: 'İstanbul', district: 'Ataşehir', manager: 'Merve Doğan', phone: '0216 688 77 44', baseRevenue: 72400, staffCount: 13 },
  { code: 'IST-07', name: 'Maltepe Sahil Şubesi', city: 'İstanbul', district: 'Maltepe', manager: 'Caner Özkan', phone: '0216 441 22 33', baseRevenue: 53100, staffCount: 9 },
  { code: 'IST-08', name: 'Beylikdüzü Yaşam Şubesi', city: 'İstanbul', district: 'Beylikdüzü', manager: 'Gökhan Aydın', phone: '0212 872 90 11', baseRevenue: 49800, staffCount: 9 },
  { code: 'IST-09', name: 'Sarıyer İstinye Şubesi', city: 'İstanbul', district: 'Sarıyer', manager: 'Elif Şentürk', phone: '0212 277 40 50', baseRevenue: 89400, staffCount: 15 },
  { code: 'IST-10', name: 'Pendik Marina Şubesi', city: 'İstanbul', district: 'Pendik', manager: 'Tolga Kaya', phone: '0216 390 15 60', baseRevenue: 51200, staffCount: 9 },
  { code: 'IST-11', name: 'Fatih Aksaray Şubesi', city: 'İstanbul', district: 'Fatih', manager: 'Ömer Faruk Taşkın', phone: '0212 521 80 90', baseRevenue: 61500, staffCount: 11 },
  { code: 'IST-12', name: 'Başakşehir Gölet Şubesi', city: 'İstanbul', district: 'Başakşehir', manager: 'Murat Erdem', phone: '0212 485 11 22', baseRevenue: 58400, staffCount: 10 },
  { code: 'IST-13', name: 'Kartal Sahil Şubesi', city: 'İstanbul', district: 'Kartal', manager: 'Zeynep Bulut', phone: '0216 488 34 50', baseRevenue: 47600, staffCount: 8 },
  { code: 'IST-14', name: 'Beykoz Kavacık Şubesi', city: 'İstanbul', district: 'Beykoz', manager: 'Serkan Öztürk', phone: '0216 413 70 80', baseRevenue: 56300, staffCount: 10 },
  { code: 'IST-15', name: 'Tuzla Viaport Şubesi', city: 'İstanbul', district: 'Tuzla', manager: 'Ayşe Kılıç', phone: '0216 395 10 99', baseRevenue: 67100, staffCount: 12 },
  { code: 'IST-16', name: 'Kağıthane Vadi Şubesi', city: 'İstanbul', district: 'Kağıthane', manager: 'Burak Keskin', phone: '0212 321 00 12', baseRevenue: 75900, staffCount: 14 },
  { code: 'IST-17', name: 'Zeytinburnu Marmara Şubesi', city: 'İstanbul', district: 'Zeytinburnu', manager: 'Hakan Şahin', phone: '0212 546 88 77', baseRevenue: 48900, staffCount: 8 },
  { code: 'IST-18', name: 'Bahçelievler Yayla Şubesi', city: 'İstanbul', district: 'Bahçelievler', manager: 'Dilek Koç', phone: '0212 442 30 40', baseRevenue: 52800, staffCount: 9 },
  { code: 'IST-19', name: 'Ümraniye Çarşı Şubesi', city: 'İstanbul', district: 'Ümraniye', manager: 'Fatih Gündoğdu', phone: '0216 523 44 55', baseRevenue: 63700, staffCount: 11 },
  { code: 'IST-20', name: 'Maslak 1453 Şubesi', city: 'İstanbul', district: 'Sarıyer', manager: 'Arda Güven', phone: '0212 286 99 00', baseRevenue: 92300, staffCount: 17 },

  // Ankara (7 şube)
  { code: 'ANK-01', name: 'Çankaya GOP Şubesi', city: 'Ankara', district: 'Çankaya', manager: 'Tuna Eren', phone: '0312 447 11 20', baseRevenue: 74200, staffCount: 13 },
  { code: 'ANK-02', name: 'Kızılay Meydan Şubesi', city: 'Ankara', district: 'Çankaya', manager: 'İsmail Hakkı Gül', phone: '0312 418 30 40', baseRevenue: 68900, staffCount: 12 },
  { code: 'ANK-03', name: 'Tunalı Hilmi Şubesi', city: 'Ankara', district: 'Çankaya', manager: 'Ezgi Varol', phone: '0312 467 55 60', baseRevenue: 71500, staffCount: 12 },
  { code: 'ANK-04', name: 'Çayyolu Park Şubesi', city: 'Ankara', district: 'Çankaya', manager: 'Barış Ulusoy', phone: '0312 240 88 99', baseRevenue: 66300, staffCount: 11 },
  { code: 'ANK-05', name: 'Batıkent Atlantis Şubesi', city: 'Ankara', district: 'Yenimahalle', manager: 'Berna Aslan', phone: '0312 255 14 30', baseRevenue: 51800, staffCount: 9 },
  { code: 'ANK-06', name: 'Keçiören Sanatoryum Şubesi', city: 'Ankara', district: 'Keçiören', manager: 'Cemil Polat', phone: '0312 359 22 11', baseRevenue: 46200, staffCount: 8 },
  { code: 'ANK-07', name: 'Yenimahalle Batı Şubesi', city: 'Ankara', district: 'Yenimahalle', manager: 'Kemal Akın', phone: '0312 344 70 80', baseRevenue: 54100, staffCount: 9 },

  // İzmir (6 şube)
  { code: 'IZM-01', name: 'Karşıyaka Çarşı Şubesi', city: 'İzmir', district: 'Karşıyaka', manager: 'Onur Taner', phone: '0232 364 20 10', baseRevenue: 69800, staffCount: 12 },
  { code: 'IZM-02', name: 'Alsancak Kordon Şubesi', city: 'İzmir', district: 'Konak', manager: 'Deniz Meriç', phone: '0232 464 88 50', baseRevenue: 81400, staffCount: 15 },
  { code: 'IZM-03', name: 'Bornova Forum Şubesi', city: 'İzmir', district: 'Bornova', manager: 'Pınar Çam', phone: '0232 373 60 70', baseRevenue: 73200, staffCount: 13 },
  { code: 'IZM-04', name: 'Konak Kemeraltı Şubesi', city: 'İzmir', district: 'Konak', manager: 'Ali Rıza Yavuz', phone: '0232 483 15 25', baseRevenue: 58900, staffCount: 10 },
  { code: 'IZM-05', name: 'Bayraklı Adliye Şubesi', city: 'İzmir', district: 'Bayraklı', manager: 'Hüseyin Kurt', phone: '0232 461 40 30', baseRevenue: 62400, staffCount: 11 },
  { code: 'IZM-06', name: 'Buca Şirinyer Şubesi', city: 'İzmir', district: 'Buca', manager: 'Ece Karaca', phone: '0232 448 90 00', baseRevenue: 47500, staffCount: 8 },

  // Bursa (3 şube)
  { code: 'BUR-01', name: 'Nilüfer FSM Şubesi', city: 'Bursa', district: 'Nilüfer', manager: 'Oğuzhan Tekin', phone: '0224 242 10 20', baseRevenue: 67400, staffCount: 12 },
  { code: 'BUR-02', name: 'Osmangazi Kent Şubesi', city: 'Bursa', district: 'Osmangazi', manager: 'Sinan Bilgin', phone: '0224 220 50 60', baseRevenue: 54800, staffCount: 9 },
  { code: 'BUR-03', name: 'Özlüce Bulvar Şubesi', city: 'Bursa', district: 'Nilüfer', manager: 'Gaye Sönmez', phone: '0224 413 77 88', baseRevenue: 63100, staffCount: 11 },

  // Antalya (3 şube)
  { code: 'ANT-01', name: 'Muratpaşa Işıklar Şubesi', city: 'Antalya', district: 'Muratpaşa', manager: 'Volkan Ceylan', phone: '0242 243 12 34', baseRevenue: 76800, staffCount: 14 },
  { code: 'ANT-02', name: 'Konyaaltı Sahil Şubesi', city: 'Antalya', district: 'Konyaaltı', manager: 'Ebru Alkan', phone: '0242 228 90 90', baseRevenue: 71200, staffCount: 13 },
  { code: 'ANT-03', name: 'Lara Barınaklar Şubesi', city: 'Antalya', district: 'Muratpaşa', manager: 'Sedat Özmen', phone: '0242 324 55 66', baseRevenue: 68500, staffCount: 12 },

  // Diğer Büyükşehirler (4 şube)
  { code: 'ESK-01', name: 'Eskişehir Espark Şubesi', city: 'Eskişehir', district: 'Tepebaşı', manager: 'Kaan Vural', phone: '0222 333 44 55', baseRevenue: 59300, staffCount: 10 },
  { code: 'KOC-01', name: 'İzmit Yürüyüş Yolu Şubesi', city: 'Kocaeli', district: 'İzmit', manager: 'Uğur Altın', phone: '0262 322 11 00', baseRevenue: 57400, staffCount: 10 },
  { code: 'ADA-01', name: 'Adana Barajyolu Şubesi', city: 'Adana', district: 'Seyhan', manager: 'Metin Dağ', phone: '0322 225 66 77', baseRevenue: 64700, staffCount: 11 },
  { code: 'GAZ-01', name: 'Gaziantep Sanko Şubesi', city: 'Gaziantep', district: 'Şehitkamil', manager: 'Halil İbrahim Kurt', phone: '0342 338 88 99', baseRevenue: 68200, staffCount: 12 },
];

// Kahve Dünyası Roastery Grubu (12 Şube)
const rawCoffeeBranches: RawBranchInfo[] = [
  { code: 'KDG-01', name: 'Bebek Roastery Lab', city: 'İstanbul', district: 'Beşiktaş', manager: 'Cemre Akın', phone: '0212 263 11 20', baseRevenue: 48500, staffCount: 9 },
  { code: 'KDG-02', name: 'Nişantaşı Coffee Lounge', city: 'İstanbul', district: 'Şişli', manager: 'Selin Polat', phone: '0212 240 55 60', baseRevenue: 52000, staffCount: 10 },
  { code: 'KDG-03', name: 'Moda Sahil Kahvecisi', city: 'İstanbul', district: 'Kadıköy', manager: 'Kerem Su', phone: '0216 348 20 30', baseRevenue: 41200, staffCount: 8 },
  { code: 'KDG-04', name: 'Galata Kule Roastery', city: 'İstanbul', district: 'Beyoğlu', manager: 'Leyla Barut', phone: '0212 293 88 11', baseRevenue: 44800, staffCount: 9 },
  { code: 'KDG-05', name: 'Maslak 42 Plazalar', city: 'İstanbul', district: 'Sarıyer', manager: 'Boran Kaya', phone: '0212 285 44 22', baseRevenue: 58000, staffCount: 11 },
  { code: 'KDG-06', name: 'Bağdat Caddesi Erenköy', city: 'İstanbul', district: 'Kadıköy', manager: 'Zehra Tan', phone: '0216 385 70 80', baseRevenue: 49500, staffCount: 9 },
  { code: 'KDG-07', name: 'Tunalı Hilmi Roasters', city: 'Ankara', district: 'Çankaya', manager: 'Ozan Çelik', phone: '0312 466 30 40', baseRevenue: 43000, staffCount: 8 },
  { code: 'KDG-08', name: 'Çayyolu Park Kahve', city: 'Ankara', district: 'Çankaya', manager: 'Gökçe Er', phone: '0312 241 12 34', baseRevenue: 39200, staffCount: 7 },
  { code: 'KDG-09', name: 'Alsancak Kordon Kahve', city: 'İzmir', district: 'Konak', manager: 'Eren Soylu', phone: '0232 463 90 00', baseRevenue: 46000, staffCount: 9 },
  { code: 'KDG-10', name: 'Bostanlı İskele Kahve', city: 'İzmir', district: 'Karşıyaka', manager: 'Aylin Berk', phone: '0232 362 44 55', baseRevenue: 38500, staffCount: 7 },
  { code: 'KDG-11', name: 'Nilüfer FSM Roastery', city: 'Bursa', district: 'Nilüfer', manager: 'Tayfun Gül', phone: '0224 241 77 88', baseRevenue: 36800, staffCount: 7 },
  { code: 'KDG-12', name: 'Lara Sahil Coffee', city: 'Antalya', district: 'Muratpaşa', manager: 'Nilgün Sert', phone: '0242 316 22 33', baseRevenue: 42100, staffCount: 8 },
];

// Burger Lab Craft Fast-Food Ltd. (8 Şube)
const rawBurgerBranches: RawBranchInfo[] = [
  { code: 'BLB-01', name: 'Karaköy Craft Burger', city: 'İstanbul', district: 'Beyoğlu', manager: 'Alp Ekinci', phone: '0212 251 10 90', baseRevenue: 38400, staffCount: 7 },
  { code: 'BLB-02', name: 'Moda Burger Lab', city: 'İstanbul', district: 'Kadıköy', manager: 'Sarp Demir', phone: '0216 345 80 10', baseRevenue: 34200, staffCount: 6 },
  { code: 'BLB-03', name: 'Beşiktaş Akaretler', city: 'İstanbul', district: 'Beşiktaş', manager: 'İrem Yıldız', phone: '0212 260 22 44', baseRevenue: 36800, staffCount: 7 },
  { code: 'BLB-04', name: 'Caddebostan Craft', city: 'İstanbul', district: 'Kadıköy', manager: 'Mert Aksoy', phone: '0216 368 40 50', baseRevenue: 39500, staffCount: 7 },
  { code: 'BLB-05', name: 'Göktürk Orman Yolu', city: 'İstanbul', district: 'Eyüp', manager: 'Tuğçe Şen', phone: '0212 322 70 80', baseRevenue: 29800, staffCount: 5 },
  { code: 'BLB-06', name: 'Kızılay Craft Burger', city: 'Ankara', district: 'Çankaya', manager: 'Emre Güneş', phone: '0312 419 60 70', baseRevenue: 32400, staffCount: 6 },
  { code: 'BLB-07', name: 'Bornova Küçükpark', city: 'İzmir', district: 'Bornova', manager: 'Cansu Özer', phone: '0232 342 11 22', baseRevenue: 31200, staffCount: 6 },
  { code: 'BLB-08', name: 'FSM Bulvarı Burger', city: 'Bursa', district: 'Nilüfer', manager: 'Kadir Bal', phone: '0224 243 55 66', baseRevenue: 28900, staffCount: 5 },
];

// Ege Meze & Balık Evi Zinciri (5 Şube)
const rawSeafoodBranches: RawBranchInfo[] = [
  { code: 'EGE-01', name: 'Bostanlı Balıkçısı', city: 'İzmir', district: 'Karşıyaka', manager: 'Kenan Yıldız', phone: '0232 362 10 20', baseRevenue: 64000, staffCount: 11 },
  { code: 'EGE-02', name: 'Çeşme Marina Balık', city: 'İzmir', district: 'Çeşme', manager: 'Haluk Kaptan', phone: '0232 712 40 50', baseRevenue: 82500, staffCount: 14 },
  { code: 'EGE-03', name: 'Urla İskele Meze Evi', city: 'İzmir', district: 'Urla', manager: 'Sevil Erten', phone: '0232 754 88 90', baseRevenue: 58200, staffCount: 10 },
  { code: 'EGE-04', name: 'Alaçatı Değirmenler', city: 'İzmir', district: 'Çeşme', manager: 'Barış Deniz', phone: '0232 716 33 44', baseRevenue: 71000, staffCount: 12 },
  { code: 'EGE-05', name: 'Foça Liman Balıkçısı', city: 'İzmir', district: 'Foça', manager: 'Recep Usta', phone: '0232 812 15 25', baseRevenue: 49500, staffCount: 8 },
];

// O YER CAFE (3 Şube / Masa Bölümü)
const rawOyerBranches: RawBranchInfo[] = [
  { code: 'OYR-01', name: 'Kartal Sahil Cafe', city: 'İstanbul', district: 'Kartal', manager: 'Serdar Yer', phone: '0532 714 73 46', baseRevenue: 18500, staffCount: 4 },
  { code: 'OYR-02', name: 'Maltepe Meydan Bistro', city: 'İstanbul', district: 'Maltepe', manager: 'Serdar Yer', phone: '0532 714 73 46', baseRevenue: 15200, staffCount: 3 },
  { code: 'OYR-03', name: 'Pendik Marina Kahve', city: 'İstanbul', district: 'Pendik', manager: 'Serdar Yer', phone: '0532 714 73 46', baseRevenue: 12800, staffCount: 3 },
];

// Sarıyer Börekçisi (2 Şube)
const rawSariyerBranches: RawBranchInfo[] = [
  { code: 'SYB-01', name: 'Savcı Usta Şubesi', city: 'İstanbul', district: 'Sarıyer', manager: 'Savcı Usta', phone: '0532 999 88 77', baseRevenue: 34500, staffCount: 5 },
  { code: 'SYB-02', name: 'Tarihi İskele Şubesi', city: 'İstanbul', district: 'Sarıyer', manager: 'Mehmet Usta', phone: '0212 242 10 20', baseRevenue: 29000, staffCount: 4 },
];

const buildBranchesForCompany = (companyId: string, rawList: RawBranchInfo[], startId = 1): Branch[] => {
  return rawList.map((b, idx) => {
    const rev = b.baseRevenue;
    const creditCard = Math.round(rev * 0.69);
    const cash = Math.round(rev * 0.18);
    const online = Math.round(rev * 0.09);
    const other = rev - (creditCard + cash + online);

    const dailyTotalWage = Math.round(b.staffCount * 650);
    const monthlyStaffCost = Math.round(dailyTotalWage * 30 * 1.35);

    const kasap = Math.round(rev * (companyId === 'comp-2' ? 0.04 : companyId === 'comp-4' ? 0.32 : 0.22));
    const icecek = Math.round(rev * (companyId === 'comp-2' ? 0.35 : 0.08));
    const sebzeMeyve = Math.round(rev * 0.07);
    const temizlik = Math.round(rev * 0.025);
    const nakliye = Math.round(rev * 0.03);
    const kira = Math.round(rev * 0.08);
    const elektrik = Math.round(rev * 0.045);
    const diger = Math.round(rev * 0.03);
    const dailyExpense = dailyTotalWage + kasap + icecek + sebzeMeyve + temizlik + nakliye + kira + elektrik + diger;
    const netProfit = rev - dailyExpense;

    const externalBranchId = `EXT-BR-${b.city.substring(0, 3).toUpperCase()}-${(100 + startId + idx).toString()}`;
    const productCost = Math.round(rev * 0.38);
    const returnedCost = Math.round(productCost * (0.02 + (idx % 5) * 0.015));
    const netProductCost = productCost - returnedCost;
    const expectedSalesAmount = Math.round(netProductCost * 2.65);
    const variance = rev - expectedSalesAmount;
    const branchDebt = Math.round(netProductCost * 1.4 + (idx % 7) * 4500);

    let varianceNote = 'Beklenen ciro ile gerçekleşen ciro uyumlu (normal sapma bandı).';
    if (variance < -3000) {
      varianceNote = `Günün satış cirosu ile beklenen ciro arasında ${Math.abs(variance).toLocaleString('tr-TR')} ₺ fark mevcuttur.`;
    } else if (variance > 4000) {
      varianceNote = `Beklenen cironun ${variance.toLocaleString('tr-TR')} ₺ üzerinde satış gerçekleşti. Promosyon katkısı.`;
    }

    const status: 'active' | 'review' | 'passive' = idx === 12 ? 'review' : 'active';
    const performanceScore = Math.min(99, Math.max(65, Math.round(75 + (netProfit / rev) * 60 + (idx % 8))));

    return {
      id: `branch-${companyId}-${startId + idx}`,
      companyId,
      code: b.code,
      name: b.name,
      city: b.city,
      district: b.district,
      managerName: b.manager,
      phone: b.phone,
      status,
      dailyRevenue: rev,
      dailyExpense,
      netProfit,
      revenueBreakdown: { creditCard, cash, online, other },
      expenseBreakdown: {
        personel: dailyTotalWage,
        kasap,
        icecek,
        sebzeMeyve,
        temizlik,
        nakliye,
        kira,
        elektrik,
        diger,
      },
      staffCount: b.staffCount,
      dailyTotalWage,
      monthlyStaffCost,
      siparisIntegration: {
        externalBranchId,
        externalOrderId: `SIP-2026-0911-${(400 + idx).toString()}`,
        orderDate: '2026-09-11',
        productCost,
        returnedCost,
        netProductCost,
        expectedSalesAmount,
        branchDebt,
        lastSyncTime: 'Bugün 08:30 (Aktif Entegrasyon)',
        varianceNote,
      },
      performanceScore,
    };
  });
};

export const INITIAL_BRANCHES: Branch[] = [
  ...buildBranchesForCompany('comp-1', rawBranches, 1),
  ...buildBranchesForCompany('comp-2', rawCoffeeBranches, 1),
  ...buildBranchesForCompany('comp-3', rawBurgerBranches, 1),
  ...buildBranchesForCompany('comp-4', rawSeafoodBranches, 1),
  ...buildBranchesForCompany('comp-5', rawOyerBranches, 1),
  ...buildBranchesForCompany('comp-sariyer', rawSariyerBranches, 1),
];

// Generate 7-day trend metrics for Central Dashboard
export const SEVEN_DAYS_TREND = [
  { day: '05 Eyl Cuma', date: '2026-09-05', revenue: 2480000, expense: 1540000, net: 940000 },
  { day: '06 Eyl Cmt', date: '2026-09-06', revenue: 2890000, expense: 1720000, net: 1170000 },
  { day: '07 Eyl Paz', date: '2026-09-07', revenue: 2950000, expense: 1780000, net: 1170000 },
  { day: '08 Eyl Pzt', date: '2026-09-08', revenue: 2210000, expense: 1480000, net: 730000 },
  { day: '09 Eyl Sal', date: '2026-09-09', revenue: 2340000, expense: 1510000, net: 830000 },
  { day: '10 Eyl Çar', date: '2026-09-10', revenue: 2450000, expense: 1560000, net: 890000 },
  { day: '11 Eyl Per (Bugün)', date: '2026-09-11', revenue: 2618500, expense: 1642000, net: 976500 },
];

export const INITIAL_STAFF: Staff[] = [
  { id: 'st-1', branchId: 'branch-1', branchName: 'Kadıköy Moda Şubesi', fullName: 'Emre Yılmaz', role: 'Şube Müdürü', dailyWage: 1100, monthlySalary: 38500, status: 'active', phone: '0532 111 22 33', hireDate: '2023-04-10' },
  { id: 'st-2', branchId: 'branch-1', branchName: 'Kadıköy Moda Şubesi', fullName: 'Kerem Altan', role: 'Şef Aşçı', dailyWage: 950, monthlySalary: 32000, status: 'active', phone: '0533 222 33 44', hireDate: '2023-06-15' },
  { id: 'st-3', branchId: 'branch-1', branchName: 'Kadıköy Moda Şubesi', fullName: 'Deniz Polat', role: 'Kasiyer', dailyWage: 680, monthlySalary: 23500, status: 'active', phone: '0535 333 44 55', hireDate: '2024-01-08' },
  { id: 'st-4', branchId: 'branch-1', branchName: 'Kadıköy Moda Şubesi', fullName: 'Hasan Çetin', role: 'Kıdemli Garson', dailyWage: 650, monthlySalary: 22500, status: 'active', phone: '0536 444 55 66', hireDate: '2024-02-14' },
  { id: 'st-5', branchId: 'branch-1', branchName: 'Kadıköy Moda Şubesi', fullName: 'Gizem Vural', role: 'Barista', dailyWage: 640, monthlySalary: 22000, status: 'active', phone: '0537 555 66 77', hireDate: '2024-03-20' },
  { id: 'st-6', branchId: 'branch-1', branchName: 'Kadıköy Moda Şubesi', fullName: 'Yusuf Kaplan', role: 'Motorlu Kurye', dailyWage: 750, monthlySalary: 26000, status: 'active', phone: '0538 666 77 88', hireDate: '2024-05-12' },

  { id: 'st-7', branchId: 'branch-2', branchName: 'Beşiktaş Çarşı Şubesi', fullName: 'Selin Aksoy', role: 'Şube Müdürü', dailyWage: 1150, monthlySalary: 40000, status: 'active', phone: '0539 777 88 99', hireDate: '2022-11-01' },
  { id: 'st-8', branchId: 'branch-2', branchName: 'Beşiktaş Çarşı Şubesi', fullName: 'Volkan Kılıç', role: 'Şef Aşçı', dailyWage: 980, monthlySalary: 33500, status: 'active', phone: '0530 888 99 00', hireDate: '2023-02-18' },
  { id: 'st-9', branchId: 'branch-2', branchName: 'Beşiktaş Çarşı Şubesi', fullName: 'Aylin Şimşek', role: 'Kasiyer', dailyWage: 700, monthlySalary: 24000, status: 'active', phone: '0531 999 00 11', hireDate: '2024-04-05' },

  { id: 'st-10', branchId: 'branch-21', branchName: 'Çankaya GOP Şubesi', fullName: 'Tuna Eren', role: 'Şube Müdürü', dailyWage: 1100, monthlySalary: 38500, status: 'active', phone: '0541 123 45 67', hireDate: '2023-01-10' },
  { id: 'st-11', branchId: 'branch-21', branchName: 'Çankaya GOP Şubesi', fullName: 'Kemal Sunar', role: 'Şef Aşçı', dailyWage: 920, monthlySalary: 31500, status: 'active', phone: '0542 234 56 78', hireDate: '2023-08-22' },
  { id: 'st-12', branchId: 'branch-28', branchName: 'Karşıyaka Çarşı Şubesi', fullName: 'Onur Taner', role: 'Şube Müdürü', dailyWage: 1080, monthlySalary: 37500, status: 'active', phone: '0543 345 67 89', hireDate: '2023-05-19' },
  { id: 'st-13', branchId: 'branch-34', branchName: 'Nilüfer FSM Şubesi', fullName: 'Oğuzhan Tekin', role: 'Şube Müdürü', dailyWage: 1050, monthlySalary: 36500, status: 'active', phone: '0544 456 78 90', hireDate: '2023-09-01' },
];

export const INITIAL_STAFF_PAYMENTS: StaffPaymentHistory[] = [
  { id: 'sp-1', staffId: 'st-3', staffName: 'Deniz Polat', branchId: 'branch-1', date: '2026-09-10', amount: 680, type: 'yevmiye', description: 'Tam mesai günlük yevmiye' },
  { id: 'sp-2', staffId: 'st-4', staffName: 'Hasan Çetin', branchId: 'branch-1', date: '2026-09-10', amount: 650, type: 'yevmiye', description: 'Tam mesai günlük yevmiye' },
  { id: 'sp-3', staffId: 'st-6', staffName: 'Yusuf Kaplan', branchId: 'branch-1', date: '2026-09-09', amount: 1500, type: 'avans', description: 'Motosiklet bakım avansı' },
  { id: 'sp-4', staffId: 'st-2', staffName: 'Kerem Altan', branchId: 'branch-1', date: '2026-09-01', amount: 32000, type: 'maas', description: 'Ağustos ayı net hakediş' },
  { id: 'sp-5', staffId: 'st-5', staffName: 'Gizem Vural', branchId: 'branch-1', date: '2026-09-08', amount: 640, type: 'yevmiye', description: 'Tam mesai günlük yevmiye' },
];

export const INITIAL_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp-1',
    branchId: 'branch-1',
    branchName: 'Kadıköy Moda Şubesi',
    date: '2026-09-11',
    categoryId: 'cat-2',
    categoryName: 'Kasap & Et Ürünleri',
    amount: 14500,
    description: 'Köfte kıyma ve tavuk bonfile sevkiyatı (İrsaliye #9841)',
    createdAt: '2026-09-11 09:15',
    receiptNumber: 'IRS-9841',
    receiptImage: 'https://images.unsplash.com/photo-1554415707-9e426466f916?w=800&auto=format&fit=crop&q=80',
    receiptFileName: 'kasap_irsaliye_9841.jpg',
    vatRate: 1,
  },
  {
    id: 'exp-2',
    branchId: 'branch-1',
    branchName: 'Kadıköy Moda Şubesi',
    date: '2026-09-11',
    categoryId: 'cat-4',
    categoryName: 'Sebze & Meyve (Hal)',
    amount: 4200,
    description: 'Günlük domates, patates, marul ve taze yeşillikler',
    createdAt: '2026-09-11 07:45',
    receiptNumber: 'HAL-4412',
    receiptImage: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=800&auto=format&fit=crop&q=80',
    receiptFileName: 'kadikoy_hal_fisi_4412.jpg',
    vatRate: 1,
  },
  {
    id: 'exp-3',
    branchId: 'branch-1',
    branchName: 'Kadıköy Moda Şubesi',
    date: '2026-09-11',
    categoryId: 'cat-1',
    categoryName: 'Personel',
    amount: 680,
    description: 'Günlük kasiyer yevmiyesi (Elden Nakit Verildi)',
    staffId: 'st-3',
    staffName: 'Deniz Polat',
    createdAt: '2026-09-11 11:30',
    vatRate: 0,
  },
  {
    id: 'exp-4',
    branchId: 'branch-1',
    branchName: 'Kadıköy Moda Şubesi',
    date: '2026-09-10',
    categoryId: 'cat-3',
    categoryName: 'İçecek & Meşrubat',
    amount: 3850,
    description: '15 koli su, 20 koli meşrubat ve espresso çekirdekleri',
    createdAt: '2026-09-10 14:20',
    receiptNumber: 'FAT-8831',
    receiptImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
    receiptFileName: 'icecek_faturasi_8831.pdf',
    vatRate: 10,
  },
  {
    id: 'exp-5',
    branchId: 'branch-2',
    branchName: 'Beşiktaş Çarşı Şubesi',
    date: '2026-09-11',
    categoryId: 'cat-2',
    categoryName: 'Kasap & Et Ürünleri',
    amount: 17800,
    description: 'Kırmızı et ve şarküteri siparişi',
    createdAt: '2026-09-11 08:30',
    receiptNumber: 'IRS-9912',
    receiptImage: 'https://images.unsplash.com/photo-1554415707-9e426466f916?w=800&auto=format&fit=crop&q=80',
    receiptFileName: 'et_irsaliye_9912.jpg',
    vatRate: 1,
  },
  {
    id: 'exp-6',
    branchId: 'branch-2',
    branchName: 'Beşiktaş Çarşı Şubesi',
    date: '2026-09-11',
    categoryId: 'cat-5',
    categoryName: 'Temizlik & Hijyen',
    amount: 2100,
    description: 'Bulaşık deterjanı ve zemin temizleme kimyasalı',
    createdAt: '2026-09-11 10:10',
    receiptNumber: 'FAT-1049',
    receiptImage: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=800&auto=format&fit=crop&q=80',
    receiptFileName: 'temizlik_faturasi_1049.jpg',
    vatRate: 20,
  },
  {
    id: 'exp-7',
    branchId: 'branch-4',
    branchName: 'Şişli Nişantaşı Şubesi',
    date: '2026-09-11',
    categoryId: 'cat-2',
    categoryName: 'Kasap & Et Ürünleri',
    amount: 21400,
    description: 'Premium antrikot ve taze et teslimatı',
    createdAt: '2026-09-11 09:00',
    receiptNumber: 'IRS-9944',
    receiptImage: 'https://images.unsplash.com/photo-1554415707-9e426466f916?w=800&auto=format&fit=crop&q=80',
    receiptFileName: 'antrikot_irsaliye_9944.jpg',
    vatRate: 1,
  },
  {
    id: 'exp-8',
    branchId: 'branch-21',
    branchName: 'Çankaya GOP Şubesi',
    date: '2026-09-11',
    categoryId: 'cat-6',
    categoryName: 'Nakliye & Lojistik',
    amount: 1950,
    description: 'Merkez depodan kuru gıda sevkiyat navlunu',
    createdAt: '2026-09-11 12:00',
  },
];

export const INITIAL_DAILY_REVENUE_RECORDS: DailyRevenueRecord[] = [
  {
    id: 'rev-rec-1',
    branchId: 'branch-1',
    branchName: 'Kadıköy Moda Şubesi',
    date: '2026-09-11',
    creditCard: 54100,
    cash: 14200,
    online: 7100,
    other: 3100,
    total: 78500,
    notes: 'Öğle ve akşam servisi yoğun geçti, paket servis normal seviyede.',
    submittedBy: 'Emre Yılmaz (Şube Müdürü)',
    createdAt: '2026-09-11 22:45',
  },
  {
    id: 'rev-rec-2',
    branchId: 'branch-2',
    branchName: 'Beşiktaş Çarşı Şubesi',
    date: '2026-09-11',
    creditCard: 59800,
    cash: 15600,
    online: 7800,
    other: 3000,
    total: 86200,
    notes: 'Maç günü sebebiyle akşam cirosunda %22 artış görüldü.',
    submittedBy: 'Selin Aksoy (Şube Müdürü)',
    createdAt: '2026-09-11 23:10',
  },
  {
    id: 'rev-rec-3',
    branchId: 'branch-4',
    branchName: 'Şişli Nişantaşı Şubesi',
    date: '2026-09-11',
    creditCard: 68500,
    cash: 16100,
    online: 7400,
    other: 2800,
    total: 94800,
    notes: 'Kurumsal catering faturası tahsil edildi.',
    submittedBy: 'Banu Çelik (Şube Müdürü)',
    createdAt: '2026-09-11 22:30',
  },
];

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp-5',
    name: 'O YER CAFE',
    code: 'OYR',
    sector: 'Cafe & Bistro (Kartal)',
    ownerName: 'Serdar Yer',
    ownerEmail: 'serdar@oyercafe.com',
    ownerPhone: '0532 714 73 46',
    taxNumber: '5544332211',
    taxOffice: 'Kartal V.D.',
    branchesCount: 3,
    createdAt: '2025-08-01',
    subscription: {
      planTier: 'growth',
      planName: 'POS & Menü Pro',
      price: 15000,
      billingCycle: 'yearly',
      billingMethod: 'bank_transfer',
      status: 'past_due', // 10 Gün Gecikti
      branchLimit: 3,
      startDate: '2025-09-01',
      nextBillingDate: '2026-09-01',
      daysRemaining: -10,
      lastPaymentDate: '2025-09-01',
      lastPaymentAmount: 15000,
      autoRenew: false,
    },
    notes: 'Yıllık lisans vadesi 10 gün geçti. WhatsApp hatırlatması ve tahsilat takibi gerekiyor.',
  },
  {
    id: 'comp-sariyer',
    name: 'Sarıyer Börekçisi',
    code: 'SYB',
    sector: 'Geleneksel Börek & Fırın Zinciri',
    ownerName: 'Savcı Usta',
    ownerEmail: 'savci@sariyerborekcisi.com',
    ownerPhone: '0532 999 88 77',
    taxNumber: '3422119988',
    taxOffice: 'Sarıyer V.D.',
    branchesCount: 2,
    createdAt: '2026-01-10',
    subscription: {
      planTier: 'growth',
      planName: 'Büyüme Growth (5 Şube)',
      price: 15000,
      billingCycle: 'yearly',
      billingMethod: 'bank_transfer',
      status: 'active',
      branchLimit: 5,
      startDate: '2026-01-10',
      nextBillingDate: '2027-01-10',
      daysRemaining: 121,
      lastPaymentDate: '2026-01-10',
      lastPaymentAmount: 15000,
      autoRenew: false,
    },
    notes: 'Merkez işletmesi. Bağlı şubeler: Savcı Usta, Tarihi İskele Şubesi.',
  },
  {
    id: 'comp-1',
    name: 'Anadolu Lezzetleri Gıda A.Ş.',
    code: 'ALG',
    sector: 'Geleneksel Kebap & Döner Zinciri',
    ownerName: 'Hamza Çakmak',
    ownerEmail: 'merkez@subeanalitik.com',
    ownerPhone: '0532 555 1020',
    taxNumber: '1029384756',
    taxOffice: 'Kadıköy V.D.',
    branchesCount: 40,
    createdAt: '2025-03-15',
    subscription: {
      planTier: 'enterprise',
      planName: 'Kurumsal Enterprise (40+ Şube)',
      price: 12500,
      billingCycle: 'monthly',
      billingMethod: 'credit_card', // Otomatik Kart Çekimi
      status: 'active',
      branchLimit: 50,
      startDate: '2026-01-01',
      nextBillingDate: '2026-10-01',
      daysRemaining: 19,
      lastPaymentDate: '2026-09-01',
      lastPaymentAmount: 12500,
      autoRenew: true,
      creditCardLast4: '4092',
    },
    notes: 'Ana merkez hesabı. 40 şube aktif veri giriyor, ciro ve gider analitiği aktif.',
  },
  {
    id: 'comp-2',
    name: 'Kahve Dünyası Roastery Grubu',
    code: 'KDG',
    sector: '3. Nesil Kahve & Kafe Zinciri',
    ownerName: 'Murat Erdem',
    ownerEmail: 'murat@kahvedunyasi.com',
    ownerPhone: '0544 321 9080',
    taxNumber: '8877665544',
    taxOffice: 'Beşiktaş V.D.',
    branchesCount: 12,
    createdAt: '2025-06-20',
    subscription: {
      planTier: 'growth',
      planName: 'Büyüme Growth (15 Şube)',
      price: 5400,
      billingCycle: 'monthly',
      billingMethod: 'credit_card',
      status: 'active',
      branchLimit: 15,
      startDate: '2026-02-15',
      nextBillingDate: '2026-09-25',
      daysRemaining: 14,
      lastPaymentDate: '2026-08-25',
      lastPaymentAmount: 5400,
      autoRenew: true,
      creditCardLast4: '8812',
    },
    notes: 'İstanbul ve Ankara şubeleri aktif. Otomatik Sanal POS kart çekimi tanımlı.',
  },
  {
    id: 'comp-3',
    name: 'Burger Lab Craft Fast-Food Ltd.',
    code: 'BLB',
    sector: 'Gurme Burger & Sokak Lezzetleri',
    ownerName: 'Arda Tezcan',
    ownerEmail: 'arda@burgerlab.com',
    ownerPhone: '0555 678 1234',
    taxNumber: '4433221100',
    taxOffice: 'Beyoğlu V.D.',
    branchesCount: 8,
    createdAt: '2025-09-10',
    subscription: {
      planTier: 'growth',
      planName: 'Büyüme Growth (10 Şube)',
      price: 4200,
      billingCycle: 'monthly',
      billingMethod: 'bank_transfer', // Merkezden Havale/EFT
      status: 'active',
      branchLimit: 10,
      startDate: '2026-03-01',
      nextBillingDate: '2026-09-18',
      daysRemaining: 7,
      lastPaymentDate: '2026-08-18',
      lastPaymentAmount: 4200,
      autoRenew: false,
    },
    notes: 'Ödemeleri merkez finans birimi havale/EFT ile yapıyor.',
  },
  {
    id: 'comp-4',
    name: 'Ege Meze & Balık Evi Zinciri',
    code: 'EGE',
    sector: 'Restoran & Balık Lokantaları',
    ownerName: 'Kenan Yıldız',
    ownerEmail: 'kenan@egemeze.com',
    ownerPhone: '0533 111 4455',
    taxNumber: '9988776611',
    taxOffice: 'Konak V.D.',
    branchesCount: 5,
    createdAt: '2025-11-05',
    subscription: {
      planTier: 'starter',
      planName: 'Başlangıç Starter (5 Şube)',
      price: 2500,
      billingCycle: 'monthly',
      billingMethod: 'bank_transfer',
      status: 'past_due', // Ödeme Gecikmede / Askıda
      branchLimit: 5,
      startDate: '2026-01-10',
      nextBillingDate: '2026-09-08',
      daysRemaining: -3,
      lastPaymentDate: '2026-08-08',
      lastPaymentAmount: 2500,
      autoRenew: false,
    },
    notes: 'Eylül ayı lisans ödemesi 3 gün gecikmede. Sistem askıya alma uyarısı veriyor.',
  },
];

export const INITIAL_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay-1',
    companyId: 'comp-1',
    companyName: 'Anadolu Lezzetleri Gıda A.Ş.',
    date: '2026-09-01 10:15',
    amount: 12500,
    method: 'credit_card',
    status: 'success',
    transactionId: 'TXN-20260901-40921',
    invoiceNumber: 'SUB-2026-0901',
    description: 'Eylül 2026 Kurumsal Enterprise Lisans Bedeli (Otomatik Kart Çekimi - **** 4092)',
  },
  {
    id: 'pay-2',
    companyId: 'comp-2',
    companyName: 'Kahve Dünyası Roastery Grubu',
    date: '2026-08-25 14:30',
    amount: 5400,
    method: 'credit_card',
    status: 'success',
    transactionId: 'TXN-20260825-88120',
    invoiceNumber: 'SUB-2026-0825',
    description: 'Ağustos-Eylül 2026 Büyüme Paketi Lisansı (Otomatik Kart Çekimi - **** 8812)',
  },
  {
    id: 'pay-3',
    companyId: 'comp-3',
    companyName: 'Burger Lab Craft Fast-Food Ltd.',
    date: '2026-08-18 11:05',
    amount: 4200,
    method: 'bank_transfer',
    status: 'success',
    transactionId: 'TR88-0006-20260818',
    invoiceNumber: 'SUB-2026-0818',
    description: 'Ağustos 2026 Şube Analitik Yazılım Lisansı (Garanti BBVA Havale Onaylandı)',
  },
  {
    id: 'pay-4',
    companyId: 'comp-1',
    companyName: 'Anadolu Lezzetleri Gıda A.Ş.',
    date: '2026-08-01 09:00',
    amount: 12500,
    method: 'credit_card',
    status: 'success',
    transactionId: 'TXN-20260801-40919',
    invoiceNumber: 'SUB-2026-0801',
    description: 'Ağustos 2026 Kurumsal Enterprise Lisans Bedeli (Otomatik Kart Çekimi)',
  },
];

