# Ratio Automation System

A multi-sheet Excel stepping layout generator and optimizer. It calculates plate runs and layout allocations based on target waste limits, then generates optimized downloadable Excel spreadsheets.

## Project Structure

```
Ratio/
├── app/
│   ├── backend/         # FastAPI backend
│   └── frontend/        # React/Vite frontend (Tailwind CSS)
├── README.md            # This instruction file
└── ...
```

---

## 🚀 How to Run the Backend (Python FastAPI)

The backend is built with FastAPI. To set up and run it locally:

### 1. Navigate to the backend directory

```bash
cd app/backend
```

### 2. Set up a Virtual Environment

It is highly recommended to run the backend in a virtual environment (`venv`):

* **Create environment**:
  ```bash
  python -m venv venv
  ```
* **Activate environment**:
  * **Windows (PowerShell)**:
    ```powershell
    .\venv\Scripts\Activate.ps1
    ```
  * **Windows (CMD)**:
    ```cmd
    .\venv\Scripts\activate.bat
    ```
  * **macOS / Linux**:
    ```bash
    source venv/bin/activate
    ```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Start the Server

Run the FastAPI application with Uvicorn:

```bash
python -m uvicorn main:app --reload
```

By default, the backend will start running on **`http://localhost:8000`**.

---

## 💻 How to Run the Frontend (React + Vite)

The frontend is a React application styled using Tailwind CSS.

### 1. Navigate to the frontend directory

```bash
cd app/frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Development Server

```bash
npm run dev
```

By default, the Vite server will run on **`http://localhost:5173`**.

---

## 🛠️ Developer Mode (Localhost Backend)

The frontend includes a built-in Developer Mode to switch API calls between the production Render.com server and your local backend.

### How to Access:

1. Open the frontend application in your browser.
2. Type **`dev`** on your keyboard (anywhere on the page, as long as your cursor is not currently focused inside an input field).
3. The **Localhost API** panel will appear in the top-right corner.
4. Toggle the switch to enable localhost mode.
5. *(Optional)* If your local backend is running on a different port than `8000`, modify the URL directly in the input box that appears (e.g. `http://localhost:8080/api`).
