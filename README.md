# Compass — OKR Dashboard

A company-wide OKR tracking dashboard built with React. All data is persisted in `localStorage` so it survives page refreshes and browser restarts.

## Features

- **Login / Register** — user accounts stored locally (swap `src/storage.js` for a real backend later)
- **Department grouping** — BD, Engineering, Product, Marketing, Operations, Design
- **Key Result progress tracking** — inline editing, supports both "higher is better" and "lower is better" metrics
- **On Track / At Risk / Off Track** — auto-calculated per OKR and per key result
- **Company-wide summary** — average progress, on-track count, active departments
- **Persistent storage** — everything saved to `localStorage`; data survives page reloads

## Getting Started

```bash
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  App.js        # All UI components and main app logic
  storage.js    # localStorage abstraction (swap for API/DB here)
  index.js      # React entry point
public/
  index.html
```

## Swapping to a Real Backend

All persistence goes through `src/storage.js`. Replace the `localStorage` calls there with `fetch`/API calls and the rest of the app stays untouched.

## Customising Departments

Edit the `DEPARTMENTS` array in `src/App.js`.

