import type { Request, Response } from "express";
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "../../services/prisma.js";

const s3 = new S3Client({
    region: process.env.AWS_REGION
})

const BUCKET = process.env.S3_BUCKET_NAME

async function getUserByStackId(stackUserId: string) {
    return prisma.user.findUnique({ where: { stackUserId } });
}

function getSingleQueryValue(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim() ? value : null;
  }

  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
    return value[0].trim() ? value[0] : null;
  }

  return null;
}

export const getPresignedPutUrl = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = await getUserByStackId(req.user!.sub)
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }

        const sessionId = req.query.sessionId as string | undefined;
        if (!sessionId || typeof sessionId !== 'string') {
            res.status(400).json({ success: false, message: "sessionId is required" });
            return;
        }

        const key = `recordings/${user.id}/${sessionId}.webm`;

        const url = await getSignedUrl(s3,
            new PutObjectCommand({
                Bucket: BUCKET!,
                Key: key,
                ContentType: 'audio/webm'
            }),
            {
                expiresIn: 7200
            }
        )

        res.status(200).json({ success: true, data: { url, key } });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to generate presigned URL",
            error: error instanceof Error ? error.message : String(error),
        });
    }
}


export const saveRecordingKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getUserByStackId(req.user!.sub);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const sessionId = getSingleQueryValue(req.query.sessionId);
    const { recordingKey } = req.body;

    if (!sessionId) {
      res.status(400).json({ success: false, message: "sessionId is required" });
      return;
    }

    if (!recordingKey) {
      res.status(400).json({ success: false, message: "recordingKey is required" });
      return;
    }

    const session = await prisma.interviewSession.findFirst({
      where: {
        id: sessionId,
        job: { userId: user.id },
      },
      select: { id: true },
    });

    if (!session) {
      res.status(404).json({ success: false, message: "Interview session not found" });
      return;
    }

    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { recordingKey },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to save recording key",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getPresignedGetUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getUserByStackId(req.user!.sub);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const sessionId = getSingleQueryValue(req.query.sessionId);
    if (!sessionId) {
      res.status(400).json({ success: false, message: "sessionId is required" });
      return;
    }

    const session = await prisma.interviewSession.findFirst({
      where: {
        id: sessionId,
        job: { userId: user.id },
      },
      select: { recordingKey: true },
    });

    if (!session) {
      res.status(404).json({ success: false, message: "Interview session not found" });
      return;
    }

    if (!session.recordingKey) {
      res.status(404).json({ success: false, message: "No recording has been saved for this session" });
      return;
    }

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: BUCKET!,
        Key: session.recordingKey,
      }),
      {
        expiresIn: 7200,
      }
    );

    res.status(200).json({ success: true, data: { url, key: session.recordingKey } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate presigned playback URL",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

