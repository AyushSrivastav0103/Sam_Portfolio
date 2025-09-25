# Sam Portfolio

A full-stack portfolio project using Node.js (Express), React, and Tailwind CSS.

---

## 🚀 Features
- Modern React frontend (with Vite)
- Express.js backend API
- Tailwind CSS for styling
- Contact form with email (Nodemailer)
- Booking system with Google Calendar integration
- Rate limiting, security headers, CORS, logging

---

## 🛠️ Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

---

## 📦 Installation

1. **Clone the repository:**
   ```sh
git clone https://github.com/AyushSrivastav0103/Sam_Portfolio.git
cd Sam_Portfolio
```

2. **Install all dependencies:**
   ```sh
npm install
```

3. **Install Tailwind CSS and its dependencies explicitly:**
   > This ensures you get `tailwind.config.js` and `postcss.config.js` generated if missing.
   ```sh
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```
   - If `tailwind.config.js` and `postcss.config.js` already exist, you can skip `npx tailwindcss init -p`.

---

## 🗂️ Project Structure
- `src/` — React frontend code
- `server.js` — Express backend
- `tailwind.config.js` — Tailwind CSS config
- `postcss.config.js` — PostCSS config
- `.env` — Environment variables (not committed)

---

## 📄 Scripts
Defined in `package.json`:

| Script         | Description                        |
|----------------|------------------------------------|
| `npm run dev`  | Start frontend (Vite dev server)    |
| `npm run server` | Start backend (Express)           |
| `npm run server:dev` | Backend with auto-reload (nodemon) |
| `npm run build`| Build frontend for production       |
| `npm run preview` | Preview production build         |
| `npm run lint` | Run ESLint                         |

---

## 🧩 Dependencies

### Main dependencies
- **express**
- **cors**
- **dotenv**
- **helmet**
- **morgan**
- **express-rate-limit**
- **nodemailer**
- **googleapis**
- **react**
- **react-dom**
- **lucide-react**

### Dev dependencies
- **tailwindcss**
- **postcss**
- **autoprefixer**
- **vite**
- **@vitejs/plugin-react**
- **eslint** and plugins
- **nodemon**

---

## ⚙️ Environment Variables
Create a `.env` file in the root (do **not** commit this file). Example:

```
PORT=5174
SMTP_HOST=your.smtp.host
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=yourpassword
FROM_EMAIL=your@email.com
TO_EMAIL=destination@email.com
GCAL_CALENDAR_ID=your_calendar_id
GCAL_SERVICE_ACCOUNT_JSON=your_service_account_json
GCAL_SERVICE_ACCOUNT_B64=your_service_account_b64
TIMEZONE=Asia/Kolkata
SLOT_MINUTES=20
START_HOUR=10
END_HOUR=17
MEETING_URL=https://meet.google.com/your-meeting
```
- Only set Google Calendar variables if you want booking integration.

---

## 🏃‍♂️ Running the Project

### 1. **Start the backend**
```sh
npm run server
```

### 2. **Start the frontend**
```sh
npm run dev
```

- The frontend (Vite) runs on [http://localhost:5173](http://localhost:5173) by default.
- The backend (Express) runs on [http://localhost:5174](http://localhost:5174) by default.

---

## 🏗️ Build for Production
```sh
npm run build
```
- This builds the frontend into the `dist/` folder.

---

## 📝 Notes
- **.env** and **node_modules/** are gitignored for security and cleanliness.
- If you add new dependencies, always run `npm install <package>` and commit the updated `package.json` and `package-lock.json`.
- For Tailwind, always ensure you have all three: `tailwindcss`, `postcss`, and `autoprefixer`.

---

## 🤝 Contributing
Pull requests are welcome! For major changes, open an issue first to discuss what you would like to change.

---

## 📄 License
[MIT](LICENSE)

---

## 📣 Credits
- Inspired by modern portfolio and booking solutions.

---

## 🐞 Troubleshooting
- If you get errors about missing Tailwind/PostCSS config, re-run:
  ```sh
  npx tailwindcss init -p
  ```
- If you get port conflicts, change the `PORT` in `.env`.

---

## 📬 Contact
For any issues, use the contact form on the site or email directly.
