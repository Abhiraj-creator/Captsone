import { Router } from 'express';
import {
    getActiveSandbox,
    healthCheck,
    listFiles,
    readFiles,
    startSandbox,
    updateFiles
} from '../controller/sandbox.controller.js';

const router = Router();

router.get('/health', healthCheck);
router.get('/active', getActiveSandbox);
router.post('/start', startSandbox);
router.get('/:sandboxId/list-files', listFiles);
router.get('/:sandboxId/read-files', readFiles);
router.patch('/:sandboxId/update-files', updateFiles);

export default router;
