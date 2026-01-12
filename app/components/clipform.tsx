"use client";

import { useState } from "react";

export default function ClipForm() {
  const [url, setUrl] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!url || !start || !end) {
      setError("All fields are required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, start, end })
      });

      if (!res.ok) throw new Error("Clipping failed");

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "clip.mp4";
      a.click();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto max-w-md space-y-4 rounded-xl border p-6"
    >
      <h1 className="text-xl font-semibold">Video Clipper</h1>

      <input
        className="w-full rounded border p-2"
        placeholder="YouTube URL"
        value={url}
        onChange={e => setUrl(e.target.value)}
      />

      <div className="flex gap-2">
        <input
          className="w-full rounded border p-2"
          placeholder="Start (hh:mm:ss)"
          value={start}
          onChange={e => setStart(e.target.value)}
        />
        <input
          className="w-full rounded border p-2"
          placeholder="End (hh:mm:ss)"
          value={end}
          onChange={e => setEnd(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        disabled={loading}
        className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
      >
        {loading ? "Clipping..." : "Clip Video"}
      </button>
    </form>
  );
}
