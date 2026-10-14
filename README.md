# FARXZZ AI — Inti Chat + Auth + Riwayat (slice kedua)

Slice ini menyambungkan inti chat (provider adapter + streaming) ke **Supabase**: login email/password sungguhan, riwayat percakapan tersimpan permanen, dan isolasi data per-user lewat Row Level Security di database — bukan dicek manual di kode backend.

## Status infrastruktur (sudah live)

- **Supabase** project `farxzz ai` (`ivubjjcfvsuyvrhirpak`) — aktif, region `ap-northeast-1`.
  - Tabel `profiles`, `conversations`, `messages` dengan RLS policy per-user (ditambahkan di slice ini — sebelumnya RLS aktif tanpa policy, jadi API menolak semua akses).
  - Trigger otomatis bikin baris `profiles` saat user baru sign up.
  - Index pada foreign key `conversations.user_id` dan `messages.conversation_id`.
  - Advisory keamanan Supabase sudah bersih (0 temuan).
- **Railway** project `farxzz-ai-backend` (`15736bb1-f624-4bbe-a70e-9f95d6208aa9`), service `api` (`d15e1876-a31a-4479-a6e7-692e9a23806f`) — environment variable non-rahasia sudah diisi (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PROVIDER_BASE_URL`, `PROVIDER_MODEL`, dll). **Belum ada deployment** — lihat "Yang masih perlu kamu lakukan" di bawah.

File `.env` di `backend/` dan `frontend/` sudah diisi kredensial Supabase asli di atas (jangan di-commit — sudah masuk `.gitignore`). Yang masih kosong cuma `PROVIDER_API_KEY`.

## Catatan jujur

Kode belum pernah benar-benar dijalankan di lingkungan pembuatan (tidak ada akses jaringan untuk `npm install`/`pip install` dari sisi saya). Pola kodenya standar FastAPI + Supabase-py + Vite, tapi tetap uji sendiri saat pertama kali `run`.

## Yang sudah berfungsi (setelah `PROVIDER_API_KEY` diisi)

- Login & daftar akun (email/password) lewat Supabase Auth — `AuthScreen.tsx`.
- Setiap request chat divalidasi backend lewat token Supabase (`get_current_user`), bukan dipercaya begitu saja dari frontend.
- Pesan user & assistant disimpan ke tabel `messages`; percakapan baru otomatis dibuat dan diberi judul dari pesan pertama.
- Sidebar riwayat: daftar percakapan nyata dari database, buka percakapan lama, hapus dengan konfirmasi, "percakapan baru".
- Isolasi data: backend memakai token JWT milik user saat bicara ke Supabase (bukan service-role key), jadi RLS di database yang menjamin user A tidak bisa baca data user B — bukan `if user.id == ...` yang bisa lupa ditulis.
- Streaming SSE, tombol Stop (abort beneran), markdown + syntax highlighting — dari slice sebelumnya, masih jalan.

## Yang masih perlu kamu lakukan

1. **Isi `PROVIDER_API_KEY`** di `backend/.env` (lokal) dan di Railway → service `api` → Variables (untuk production). Saya tidak mengisi ini karena tidak punya key-nya.
2. **Deploy backend ke Railway** — service-nya sudah dibuat tapi kosong. Dua opsi:
   - **Railway CLI (tanpa GitHub):** dari folder `backend/`, `railway up --project 15736bb1-f624-4bbe-a70e-9f95d6208aa9 --service api` (perlu `railway login` dulu).
   - **GitHub:** push kode ini ke repo baru, lalu sambungkan repo itu ke service `api` di dashboard Railway (atau minta saya sambungkan lewat tool kalau kasih nama repo-nya).
3. **Update `ALLOWED_ORIGINS`** di Railway begitu frontend sudah ada domainnya (Vercel dsb.) — saat ini masih `http://localhost:5173`.

## Belum diimplementasikan (tahap selanjutnya sesuai master prompt)

- Role (guest/user/admin) dan admin dashboard.
- Upload & pemrosesan file/gambar (vision, OCR, PDF/DOCX/CSV).
- Tool calling (calculator, web search, dsb.).
- Memory pengguna (preferensi tersimpan terpisah dari riwayat chat).
- Rate limiting, kuota, audit log.
- Deploy frontend (Vercel) dan test suite otomatis.

## Menjalankan secara lokal

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# .env sudah ada & terisi Supabase — tinggal isi PROVIDER_API_KEY
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Buka `http://localhost:5173` — akan muncul layar login/daftar (Supabase Auth sungguhan).
