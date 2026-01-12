"use client";

import { useState } from "react";
import TimeInput from "./timeInput";
import { LoadingButton } from "./LoadingButton";

export default function ClipForm() {
  const [url, setUrl] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!url || !start || !end) {
      setError("All fields required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/clip", {
        method: "POST",
        body: JSON.stringify({ url, start, end })
      });

      if (!res.ok) throw new Error();

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "clip.mp4";
      a.click();
    } catch {
      setError("Failed to clip video");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-md space-y-4 rounded-xl border p-6"
    >
      <h1 className="text-xl font-semibold">YouTube Clipper</h1>

      <input
        className="w-full rounded border p-2"
        placeholder="YouTube URL"
        value={url}
        onChange={e => setUrl(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <TimeInput label="Start" value={start} onChange={setStart} />
        <TimeInput label="End" value={end} onChange={setEnd} />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <LoadingButton loading={loading} text="Clip Video" />
    </form>
  );
}
