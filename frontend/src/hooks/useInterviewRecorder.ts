"use client"
import { useRef, useCallback } from "react";

export function useInterviewRecorder() {
    const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])

    const start = useCallback((micStream: MediaStream | null, getAudioContext: () => AudioContext | null) => {
        const audioCtx = getAudioContext()
        if (!audioCtx) return

        const destination = audioCtx.createMediaStreamDestination()

        destinationRef.current = destination

        if (micStream) {
            const micSource = audioCtx.createMediaStreamSource(micStream)
            micSource.connect(destination)
        }

        chunksRef.current = []
        const recorder = new MediaRecorder(destination.stream, {
            mimeType: "audio/webm;codecs=opus"
        })

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data)
        }

        mediaRecorderRef.current = recorder
        recorder.start(250)
    }, [])

    const connectToNova = useCallback((source: AudioBufferSourceNode) => {
        if (!destinationRef.current) return
        source.connect(destinationRef.current)
}, [])

    const stop = useCallback(():Promise<Blob>=>{
        return new Promise((resolve)=>{
            const recorder = mediaRecorderRef.current
            if(!recorder) return resolve(new Blob([]))

            recorder.onstop = ()=>{
                const blob = new Blob(chunksRef.current,{
                    type:"audio/webm;codecs=opus" 
                })
            
            chunksRef.current = []
            destinationRef.current = null
            mediaRecorderRef.current = null
            resolve(blob)
            }

            recorder.stop()
        })
    },[])

    return {start,connectToNova , stop}
}



// changes in useAudioPlayer and useMediaRecorder done
// new hook useInterviewRecorder is made 
// Wiring into the interview page 