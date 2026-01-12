import { NextRequest } from "next/server";
import { spawn } from "child_process";
import { NextResponse } from "next/server";
import { Readable } from "stream";
import { parseTimeToSeconds } from "@/lib/validate";


export async function POST(req:NextRequest){

    const MAX_CLIP_SECONDS= 60*5;   

    if(req.signal.aborted){
        return NextResponse.json({error : "Aborted"},{status:499});
    }

    try{
        const {url,start,end} =await req.json() as {url:string,start:string,end:string};

        if(!url  || !start || !end){
            return NextResponse.json({error:"Missing url, start, or end"},{status:400});
        }

        const startSec = parseTimeToSeconds(start);
        const endSec = parseTimeToSeconds(end);

        if(startSec<0 || endSec<0){
            return NextResponse.json(
                {error: "Invalid time format"},
                {status: 400}
            );
        }

        if(endSec<=startSec){
            return NextResponse.json(
                {error:"Ens must be greater than start"},
                {status:400},
            )
        }

        const duration = endSec-startSec;

        if(duration> MAX_CLIP_SECONDS){
            return NextResponse.json(
                {error:"clip duration exceed the limit (5 min / 300 sec)"},
                {status:413}
            )
        }

        const abortController = new AbortController();

        const ytdlp = spawn("yt-dlp",[
            "-f","bestvideo+bestaudio/best",
            "--no-playlist",
            "--quiet",
            "-o","-",
            url
        ],{signal: abortController.signal});

        const ffmpeg= spawn(
            "ffmpeg",
            [
                "-ss",start,
                "-i","pipe:0",
                "-to",end,
                "-c","copy",
                "-movflags","+faststart",
                "-f","mp4",
                "pipe:1"
            ],
            {
                signal : abortController.signal,
                stdio: ["ignore", "pipe", "pipe"]
            }
        );

        ytdlp.stderr.on("data", ()=>{});
        ffmpeg.stderr.on("data", ()=>{});

        if(ytdlp.stdout && ffmpeg.stdin) {
            ytdlp.stdout.pipe(ffmpeg.stdin);
        }

        req.signal.addEventListener("abort", ()=>{
            console.log("Client disconnected - killing processes");
            abortController.abort();
            ytdlp.kill("SIGKILL");
            ffmpeg.kill("SIGKILL");
        })

        const stream = new ReadableStream({
            start(controller){
                let closed = false;

                const safeClose =() =>{
                    if(!closed) {
                        closed =true;
                        controller.close();
                    }
                }

                ffmpeg.stdout.on("data", (chunk: Buffer)=>{
                    controller.enqueue(chunk);
                });

                ffmpeg.stdout.on("end", safeClose);

                ffmpeg.on("error", (err)=>{
                    if(!closed) controller.error(err);
                })

                ytdlp.on("close",(code)=>{
                    if(code != 0 && !closed){
                        controller.error(new Error(`yt-dlp failed with code ${code}`));

                    }
                })

                ffmpeg.on("close",(code)=>{
                    if(code!=0 && !closed){
                        controller.error(new Error(`FFmpeg failed with code ${code}`));

                    }else{
                        safeClose();
                    }
                })

                return new Response(stream,{
                    status: 200,
                    headers:{
                        "Content-type":"video/mp4",
                        "Content-Disposition": `attachment; filename-"klip-${Date.now()}.mp4"`,
                        "Cache-Control": "no-store",
                        "Access-Control-Allow-Origin": "*",
                        "Transfer-Encoding": "chunked"
                    }
                })
            }
        });
    } catch(err){
        console.log("Klip error:",err);
        return NextResponse.json({error:"Internal server error"},{status:500});
    }

}