# Simply Connect — HR Portal

Fast, dependency-free HR dashboard. Koi build step nahi — GitHub pe push karein
aur seedha Vercel pe deploy ho jata hai (static site). Data live Google Sheet
se aata hai.

```
hr-portal/
├── index.html          ← login page + app shell (single page app)
├── css/styles.css       ← saara design/theme yahan hai
├── js/config.js         ← 👉 sirf ye file edit karni hai (Apps Script URL)
├── js/api.js             ← Google Sheet backend se baat karta hai
├── js/app.js              ← saari logic: dashboard, employees, payroll...
├── assets/                ← logo + login illustrations
└── backend/Code.gs         ← Google Apps Script (Sheet ko API banata hai)
```

## Step 1 — Apna Google Sheet taiyaar karein

1. `Portal_Data_.xlsx` ko Google Drive me upload karein aur **Google Sheets
   format me open** karein (File → Save as Google Sheets, ya seedha upload
   karte waqt convert ho jayega).
2. Sheet tabs same rehne chahiye: `Employee`, `Attendance`, `Payroll`,
   `Users`, `LeaveBalances`, `Notifications`, `Requests`, `Devices`.
3. `Employee` tab me `Salary` column update kar dein jab data ready ho —
   baaki sab automatically dashboard pe reflect hoga, code dobara chhedne
   ki zaroorat nahi.
4. `Users` tab hi login credentials control karta hai (`Employee id`,
   `Password`, `Role` = Admin/Employee, `EMP ID`).

## Step 2 — Backend deploy karein (Apps Script)

1. Google Sheet khol kar **Extensions → Apps Script** pe jayein.
2. Jo default `Code.gs` khulta hai, uska sara content delete kar ke is
   repo ki `backend/Code.gs` file ka pura code paste kar dein.
3. Upar **Deploy → New deployment** click karein.
4. Gear icon se type select karein: **Web app**.
5. Settings:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. **Deploy** dabayein, Google permission maangega — allow kar dein.
7. Jo URL milega (kuch aisa: `https://script.google.com/macros/s/AKfycb.../exec`)
   — usay copy kar lein.

> Sheet me kabhi bhi tab/column names change karein to `backend/Code.gs` me
> respective headers bhi update karna hoga.

## Step 3 — Frontend me URL daalein

`js/config.js` file kholein aur ye line update karein:

```js
API_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
```

Bas itna hi — baaki sab automatically kaam karega.

## Step 4 — GitHub pe push karein

```bash
cd hr-portal
git init
git add .
git commit -m "Simply Connect HR Portal"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## Step 5 — Vercel pe deploy karein

1. [vercel.com](https://vercel.com) pe GitHub account se login karein.
2. **Add New → Project** → apni repo select karein.
3. Framework preset: **Other** (koi build command nahi chahiye — root pe
   `index.html` hai, ye pure static site hai).
4. **Deploy** dabayein. 20-30 second me live ho jayega.

Vercel ka global CDN static files ko cache kar deta hai isliye load bohat
fast hoga; sirf Google Sheet ki API call thodi der (~1-2 sec) leti hai jo
`js/api.js` me localStorage cache ki wajah se dusri visit pe turant load
hoti hai.

## Login (demo credentials — apne Users sheet ke mutabiq)

`Users` tab me jo bhi `Employee id` / `Password` combos hain wahi login me
kaam karenge, jaise:

```
Employee ID: abdulsaboor#5
Password:    sc#5
```

Admin accounts (Role = Admin) "Admin" tab select kar ke login karein, baaki
sab "Employee" tab use karein.

## Performance notes

- Koi frontend framework/bundle nahi — sirf 3 chhote JS files, isliye load
  instant hai.
- Pehla login hone ke baad **saara data ek hi API call (`bootstrap`)** me
  aata hai, phir localStorage me 60 seconds cache hota hai — baar baar
  Google Sheet ko hit nahi karta.
- Employee add/edit/delete hone par sirf wahi row update hoti hai, pura
  page reload nahi hota.

## Agla kaam add karna ho to

Har page apne alag function me hai (`renderDashboard`, `renderEmployees`,
`renderPayroll`, `renderAttendance`, `renderRequests`, `renderProfile` —
sab `js/app.js` me). Naya section add karna ho to yahi pattern follow karein.
