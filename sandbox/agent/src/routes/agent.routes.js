import {Router} from 'express';
import { CreateFiles, ListFiles, ReadFiles, UpdateFiles } from '../controller/agent.controller';

const router = Router();

/**
 * @route GET /list-files
 * @queryParam {string} files - Comma-separated list of file paths to read.
 * @returns {object} JSON object containing the content of the requested files.
 * @description Lists all files in the working directory and its subdirectories, excluding certain directories like 'node_modules', '.git', and 'dist'. The response includes a JSON object with the list of files relative to the working directory.
 * - eg. /list-files
 */

router.get('/list-files', ListFiles);

/**
 * @route GET /read-files
 * @description Reads the content of all files requested in the query parameter 'files' and returns their content as a JSON object.
 * - eg. /read-files?files=file1.txt,/src/file2.txt
 */

router.get('/read-files',ReadFiles);

/**
 * @route PATCH /update-files
 * @description Updates the content of files specified in the request body. The request body should container a property 'updates' with a JSON Array of object, each object should have a 'file' property specifying the file path (relative to the working directory) and a 'content' property specifying the new content for the file.
 */

router.patch('/update-files', UpdateFiles);

/**
 * @route POST /create-files
 * @description Creates new files with the content specified in the request body. The request body should contain a property 'files' with a JSON Array of objects, each object should have a 'file' property specifying the file path (relative to the working directory) and a 'content' property specifying the content for the new file.
 */

router.post('/create-files', CreateFiles);

export default router;