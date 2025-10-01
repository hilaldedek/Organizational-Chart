# 🏢 Organizasyon Şeması (Org Chart) Projesi

Modern, interaktif ve dinamik bir organizasyon şeması uygulaması. Bu proje, şirket hiyerarşisini görselleştirmek, personel yönetimi yapmak ve departman organizasyonunu kolaylaştırmak için geliştirilmiştir.

## 📋 İçindekiler

- [Özellikler](#-özellikler)
- [Kullandığım Teknolojiler](#-kullandığım-teknolojiler)
- [Kurulum](#-kurulum)
- [Çalıştırma](#-çalıştırma)
- [Proje Yapısı](#-proje-yapısı)
- [API Endpoints](#-api-endpoints)
- [Kullanım](#-kullanım)
- [Katkıda Bulunma](#-katkıda-bulunma)
- [Lisans](#-lisans)

## ✨ Özellikler

### 🎯 Ana Özellikler

- **Interaktif Organizasyon Şeması**: Drag & drop ile personel ve departman yönetimi
- **Gerçek Zamanlı Güncelleme**: Değişiklikler anında görselleştirilir
- **Otomatik Düzenleme**: ELK.js ile akıllı layout algoritması
- **Departman Yönetimi**: Dinamik departman oluşturma ve düzenleme
- **Personel Yönetimi**: Kapsamlı personel ekleme, düzenleme ve taşıma

### 🔧 Gelişmiş Özellikler

- **Hiyerarşik Layout**: Otomatik organizasyon yapısı oluşturma
- **Drag & Drop**: Sürükle-bırak ile kolay personel atama
- **Toast Bildirimleri**: Kullanıcı dostu geri bildirim sistemi
- **State Management**: Zustand ile merkezi durum yönetimi
- **TypeScript**: Tip güvenliği ve geliştirici deneyimi
- **PostgreSQL**: Güvenilir veri saklama

## 🛠 Kullandığım Teknolojiler

### Frontend

- **Next.js 15.5.4** - React framework'ü, server-side rendering ve API routes için
- **React 19.1.0** - Modern UI kütüphanesi
- **TypeScript 5** - Tip güvenliği ve geliştirici deneyimi
- **Tailwind CSS 4** - Utility-first CSS framework
- **@xyflow/react 12.8.5** - Interaktif node-based diagram kütüphanesi
- **Zustand 5.0.8** - Hafif ve performanslı state management
- **React Toastify 11.0.5** - Kullanıcı bildirimleri
- **React Icons 4.10.0** - Icon kütüphanesi

### Backend

- **Next.js API Routes** - Serverless API endpoints
- **PostgreSQL** - İlişkisel veritabanı
- **pg 8.16.3** - PostgreSQL Node.js driver'ı

### Layout & Visualization

- **ELK.js 0.11.0** - Graph layout algoritması (Eclipse Layout Kernel)
- **Custom Hooks** - React hooks ile özel iş mantığı

### Geliştirme Araçları

- **ESLint** - Kod kalitesi ve tutarlılık
- **Turbopack** - Hızlı build ve development server

## 🚀 Kurulum

### Ön Gereksinimler

- Node.js 18+
- PostgreSQL 12+
- npm veya yarn

### 1. Projeyi Klonlayın

```bash
git clone <repository-url>
cd orgChart/my-org-chart
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
# veya
yarn install
```

### 3. Veritabanı Kurulumu

PostgreSQL veritabanınızı oluşturun ve aşağıdaki tabloları oluşturun:

```sql
-- Employee tablosu
CREATE TABLE employee (
    person_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    department_id INTEGER REFERENCES department(unit_id),
    manager_id INTEGER REFERENCES employee(person_id),
    role VARCHAR(50) DEFAULT 'employee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Department tablosu
CREATE TABLE department (
    unit_id SERIAL PRIMARY KEY,
    unit_name VARCHAR(100) NOT NULL UNIQUE,
    manager_id INTEGER REFERENCES employee(person_id),
    max_employees INTEGER NOT NULL DEFAULT 5,
    employee_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Ortam Değişkenlerini Ayarlayın

`.env.local` dosyası oluşturun:

```env
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=orgchart_db
DB_USER=your_username
DB_PASSWORD=your_password
```

## ▶️ Çalıştırma

### Development Modu

```bash
npm run dev
# veya
yarn dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.


## 📁 Proje Yapısı

```
my-org-chart/
├── src/
│   ├── app/
│   │   ├── api/                    # API endpoints
│   │   │   ├── add-department/     # Sidebardan Departman ekleme
│   │   │   ├── add-employee/       # Sidebardan Personel ekleme
│   │   │   ├── add-employee-to-department/  # Departmanlara personel ekleme 
│   │   │   ├── delete-employee/    # Personel silme
│   │   │   ├── get-ceo/           # CEO bilgileri
│   │   │   ├── get-org-hierarchy/ # Organizasyon hiyerarşisi
│   │   │   ├── list-department/   # Departman listesi
│   │   │   ├── list-unemployed/   # Atanmamış personeller
│   │   │   └── move-employee-between-departments/  # Departmanlar arası personel veya personel grubu taşıma
│   │   ├── components/            # React bileşenleri
│   │   │   ├── DepartmentNode.tsx # Departman node bileşeni
│   │   │   ├── EmployeeCard.tsx   # Sidebardaki Personel kartı
│   │   │   ├── EmployeeNode.tsx   # Personel node bileşeni
│   │   │   ├── OrgChart.tsx       # Ana organizasyon şeması
│   │   │   ├── OrgChartInner.tsx  # İç organizasyon şeması
│   │   │   └── Sidebar.tsx        # Yan panel
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── useDragAndDrop.ts  # Drag & drop işlemleri
│   │   │   ├── useELKLayout.ts    # ELK.js layout yönetimi
│   │   │   ├── useEmployeeUpdate.ts # Personel güncelleme
│   │   │   └── useOrgChart.ts     # Ana organizasyon şeması hook'u
│   │   ├── stores/                # State management
│   │   │   └── orgChartStore.ts   # Zustand store
│   │   ├── types/                 # TypeScript tip tanımları
│   │   │   ├── employeeCard.ts
│   │   │   ├── orgChart.ts
│   │   │   └── sidebar.ts
│   │   ├── utils/                 # Yardımcı fonksiyonlar
│   │   │   ├── constants.ts
│   │   │   ├── orgChartHelpers.ts
│   │   │   └── toast.ts
│   │   ├── globals.css            # Global stiller
│   │   ├── layout.tsx             # Ana layout
│   │   └── page.tsx               # Ana sayfa
│   └── lib/
│       └── db.ts                  # Veritabanı bağlantısı
├── public/                        # Statik dosyalar
├── package.json
├── next.config.ts
├── tsconfig.json
└── tailwind.config.js
```

## 🔌 API Endpoints

### Personel Yönetimi

- `POST /api/add-employee` - Sidebardan yeni personel ekleme
- `DELETE /api/delete-employee` - Personel silme
- `GET /api/list-unemployed` - Atanmamış personelleri listeleme

### Departman Yönetimi

- `POST /api/add-department` - Sidebardan yeni departman ekleme
- `GET /api/list-department` - Departman listesi

### Organizasyon İşlemleri

- `GET /api/get-org-hierarchy` - Organizasyon hiyerarşisi
- `GET /api/get-ceo` - CEO bilgileri
- `POST /api/add-employee-to-department` - Personeli departmana atama
- `POST /api/move-employee-between-departments` - Personel taşıma
- `POST /api/update-employee-and-department` - Personel ve departman güncelleme

## 💡 Kullanım

### 1. Personel Ekleme

- Sidebarda yer alan "Yeni Personel Ekle" bölümünü kullanın.
- Ad, soyad ve ünvan bilgilerini girin.
- "Personel Ekle" butonuna tıklayın.

### 2. Departman Oluşturma

- Sidebarda yer alan "Yeni Birim Ekle" bölümünü kullanın.
- Birim adı ve maksimum personel sayısını girin.
- "Birim Ekle" butonuna tıklayın.

### 3. Personel Atama

- Atanmamış personelleri sürükleyip departmanlara bırakın.
- Mevcut personelleri farklı departmanlara taşıyın.
- Hiyerarşik yapıyı drag & drop ile düzenleyin.

### 4. Layout Düzenleme

- Otomatik layout algoritması ile düzenli görünüm
- Manuel düzenleme için node'ları sürükleyin.
- Zoom ve pan işlemleri ile navigasyon

## 🎨 Tasarım Özellikleri

### Renk Paleti

- **Ana Arka Plan**: `#F9F7F7` (Açık gri)
- **Node Arka Planı**: `#FFFFFF` (Beyaz)
- **Button Rengi**: `#ED775A` (Turuncu)
- **Metin Rengi**: `#252A34` (Koyu gri)
- **Border Rengi**: `#7D7C7C` (Orta gri)


## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın.

## 👨‍💻 Geliştirici

**Hilal** - _Full Stack Developer_

- GitHub: [@hilal](https://github.com/hilaldedek)
- LinkedIn: [Hilal](https://www.linkedin.com/in/hil%C3%A2ldedek/)

## 🙏 Teşekkürler

- [React Flow](https://reactflow.dev/) - Interaktif diagram kütüphanesi
- [ELK.js](https://www.eclipse.org/elk/) - Graph layout algoritması
- [Next.js](https://nextjs.org/) - React framework
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!
