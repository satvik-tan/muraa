import { getPresignedPutUrl, getPresignedGetUrl, saveRecordingKey } from '../controllers/upload.controller.js';
import express from 'express'

import { stackAuthMiddleware } from "../../middleware/stackAuth.middleware.js";

const router = express.Router()

router.use(stackAuthMiddleware)

router.get('/presigned',getPresignedPutUrl)
router.get('/playback', getPresignedGetUrl)
router.post('/save',saveRecordingKey)

export default router
