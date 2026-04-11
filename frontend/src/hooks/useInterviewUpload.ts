"use client"
import { useMutation } from "@tanstack/react-query";
import { useStackApp } from "@stackframe/stack";

const API = 'http://localhost:8000'

async function authedFetch(url: string, token: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-stack-access-token": token,
      ...(init?.headers ?? {}),
    }
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function useGetToken() {
  const stackApp = useStackApp()
  return async () => {
    const user = await stackApp.getUser()
    if (!user) throw new Error('Not authenticated')
    const { accessToken } = await user.getAuthJson()
    return accessToken
  }
}

export function useInterviewUpload() {
  const getToken = useGetToken()

  const getPresignedUrl = useMutation({
    mutationFn: async (sessionId: string) => {
      const token = await getToken()
      const data = await authedFetch(
        `${API}/api/upload/presigned?sessionId=${sessionId}`,
        token!
      )
      return data.data as { url: string; key: string }
    }
  })

  const uploadToS3 = useMutation({
    mutationFn: async (params: { presignedUrl: string; blob: Blob }) => {
      const res = await fetch(params.presignedUrl, {
        method: "PUT",
        body: params.blob,
        headers: {
          "Content-Type": "audio/webm",
        }
      })
      if (!res.ok) throw new Error("S3 upload failed")
    }
  })

  const saveRecordingKey = useMutation({
    mutationFn: async (params: { sessionId: string; recordingKey: string }) => {
      const token = await getToken()
      const data = await authedFetch(
        `${API}/api/upload/save?sessionId=${params.sessionId}`,
        token!,
        {
          method: "POST",
          body: JSON.stringify({ recordingKey: params.recordingKey })
        }
      )
      return data
    }
  })

  const getPlaybackUrl = useMutation({
    mutationFn: async (sessionId: string) => {
      const token = await getToken()
      const data = await authedFetch(
        `${API}/api/upload/playback?sessionId=${sessionId}`,
        token!
      )
      return data.data as { url: string; key: string }
    }
  })

  // Convenience fn that chains all 3 steps
  const uploadRecording = async (sessionId: string, blob: Blob) => {
    const { url, key } = await getPresignedUrl.mutateAsync(sessionId)
    await uploadToS3.mutateAsync({ presignedUrl: url, blob })
    await saveRecordingKey.mutateAsync({ sessionId, recordingKey: key })
    return key
  }

  return { uploadRecording, getPlaybackUrl }
}