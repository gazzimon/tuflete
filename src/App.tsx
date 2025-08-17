import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./index.css"; // asegúrate de importar Tailwind (en Vite ya viene desde main.tsx)

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <section className="mx-auto max-w-3xl p-6">
        {/* Logos */}
        <div className="flex items-center justify-center gap-6">
          <a href="https://vite.dev" target="_blank">
            <img src={viteLogo} className="h-12 w-12 drop-shadow" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="h-12 w-12 drop-shadow" alt="React logo" />
          </a>
        </div>

        {/* Título */}
        <h1 className="mt-8 text-center text-3xl font-bold tracking-tight">
          Vite + React + Tailwind
        </h1>

        {/* Card */}
        <div className="mx-auto mt-6 w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
          <button
            onClick={() => setCount((c) => c + 1)}
            className="w-full rounded-xl border px-4 py-2 font-medium transition hover:border-indigo-400 hover:bg-indigo-50 active:scale-95"
          >
            count is {count}
          </button>
          <p className="mt-3 text-sm text-gray-600">
            Editá <code className="rounded bg-gray-100 px-1 py-0.5">src/App.tsx</code> y guardá para probar HMR.
          </p>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Click en los logos para aprender más
        </p>
      </section>
    </main>
  );
}
