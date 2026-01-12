import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { Readable } from "stream";
import { parseTimeToSeconds } from "@/lib/validate";

export async function POST(req: NextRequest) {
  const MAX_CLIP_SECONDS = 60 * 5;

  if (req.signal.aborted) {
    return NextResponse.json({ error: "Aborted" }, { status: 499 });
  }

  try {
    const { url, start, end } = await req.json();

    if (!url || !start || !end) {
      return NextResponse.json({ error: "Missing input" }, { status: 400 });
    }

    const startSec = parseTimeToSeconds(start);
    const endSec = parseTimeToSeconds(end);

    if (startSec < 0 || endSec < 0) {
      return NextResponse.json({ error: "Invalid time format" }, { status: 400 });
    }

    if (endSec <= startSec) {
      return NextResponse.json(
        { error: "End must be greater than start" },
        { status: 400 }
      );
    }

    if (endSec - startSec > MAX_CLIP_SECONDS) {
      return NextResponse.json(
        { error: "Clip exceeds 5 minutes" },
        { status: 413 }
      );
    }

    const abortController = new AbortController();

    
    const ytdlp = spawn(
      "yt-dlp",
      ["-f", "bestvideo+bestaudio/best", "--no-playlist", "-o", "-", url],
      { signal: abortController.signal }
    );

    
const duration = endSec - startSec;

const ffmpeg = spawn(
  "ffmpeg",
  [
    "-i", "pipe:0",
    "-ss", start,
    "-t", String(duration),
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "frag_keyframe+empty_moov",
    "-f", "mp4",
    "pipe:1"
  ],
  { signal: abortController.signal }
);



   
    ytdlp.stderr.on("data", () => {});
    ffmpeg.stderr.on("data", () => {});

  
    ytdlp.stdout.pipe(ffmpeg.stdin);

    
    ffmpeg.stdin.on("error", () => {});

 
    ffmpeg.once("close", () => {
      try {
        ytdlp.stdout.unpipe(ffmpeg.stdin);
      } catch {}
      ytdlp.kill("SIGKILL");
    });

 
    req.signal.addEventListener("abort", () => {
      abortController.abort();
      ytdlp.kill("SIGKILL");
      ffmpeg.kill("SIGKILL");
    });

  
    const stream = new ReadableStream({
      start(controller) {
        let closed = false;

        const safeClose = () => {
          if (closed) return;
          closed = true;
          try { controller.close(); } catch {}
        };

        ffmpeg.stdout.on("data", chunk => controller.enqueue(chunk));
        ffmpeg.stdout.on("end", safeClose);

        ffmpeg.on("error", err => {
          controller.error(err);
          safeClose();
        });

        ytdlp.on("error", err => {
          controller.error(err);
          safeClose();
        });

        ytdlp.on("close", code => {
          if (code !== 0) {
            controller.error(new Error("yt-dlp failed"));
            safeClose();
          }
        });
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="klip-${Date.now()}.mp4"`,
        "Cache-Control": "no-store"
      }
    });

  } catch (err) {
    console.error("Klip error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
