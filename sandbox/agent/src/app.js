import express from 'express';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { log } from 'console';

const app = express();
const WORKING_DIR = "/workspace"

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Hello from sandbox agent!',
        status: 'success',
    });
});

/**
 * @route Get /list-files
 * @description list all the files in the working directory and its subdirectories returns a json object with file path of the working directory and its subdirectories .exclude the node_modules directory and .git directory and dist directory if they exist
 * eg.{
 *  "files":[
 *  "file1.txt",
 * "subdir/file2.txt",
 * "subdir/file3.txt"]
 * }
*/
app.get('/list-files', async (req, res) => {


    const ListFiles = async (Dir, baseDir) => {
        const entries = await fs.promises.readdir(Dir, { withFileTypes: true });
        const files = [];

        for (const entry of entries) {
            const fullPath = path.join(Dir, entry.name);
            const relativePath = path.relative(baseDir, fullPath);

            if (entry.isDirectory() && ['node_modules', '.git', 'dist'].includes(entry.name)) {
                continue;
            }
            if (entry.isDirectory()) {
                files.push(...await ListFiles(fullPath, baseDir))
            } else {
                files.push(relativePath);
            }
        }
        return files;
    }
    try {
        const files = await ListFiles(WORKING_DIR, WORKING_DIR);
        res.status(200).json({
            message: "Files listed successfully",
            status: "ok",
            files
        })
    } catch (error) {
        res.status(500).json({
            message: "Error listing files",
            status: "error",
            error: error.message
        })
    }

});

/**
 * @route get /read-files
 * @description read all the conent of the files passed in the query parameter and return a json object with file path and its content eg. {
 *  eg. /read-files?files=file1.txt,subdir/file2.txt
 */

app.get('/read-files', async (req, res) => {
    const files = req.query.files;

    if (!files) {
        return res.status(400).json({
            message: "No files provided",
            status: "error"
        })
    }

    const FileList = files.split(',');

    const results = await Promise.all(FileList.map(async (file) => {
        const filePath = path.join(WORKING_DIR, file);

        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            return {
                [filePath.replace(WORKING_DIR, '')]: content,
            }
        } catch (error) {
            return {
                [filePath.replace(WORKING_DIR, '')]: `Error reading file: ${err.message}`,
            }
        }
    }))
    res.status(200).json({
        message: "Files read successfully",
        status: "ok",
        files: results
    });
});


/**
 * @route patch update-files
 * @description update the content of the files passed in request body and return a json object containing an property "updates" with a json array of objects ,each object should have an "file "property with file path and a "content" property with the updated content of the file eg. {
 * "updates:[
 * {
 *  "file":"file1.txt",
 * "content":"updated content of file1.txt"
 * },
 * {
 * "file":"subdir/file2.txt",
 * "content":"updated content of subdir/file2.txt"
 * }
 * ]"
 */

app.patch('/update-files', async (req, res) => {
    const updates = req.body.updates;

    if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({
            message: "Invalid updates format. Expected an array of updates.",
            status: "error"
        });
    }
    const results = await Promise.all(updates.map(async (update) => {
        const { file, content } = update;
        const filePath = path.join(WORKING_DIR, file);

        try {
            console.log(`Updating file: ${filePath}`);

            await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
            await fs.promises.writeFile(filePath, content, 'utf-8');

            return {
                file: path.relative(WORKING_DIR, filePath),
                content: content,
                status: "success"
            }

        }
        catch (error) {
            console.error(`Error updating file ${file}:`, error);
            return {
                file: file,
                status: "error",
                message: error.message
            }
        }
    }))
    res.status(200).json({
        message: "Files updated successfully",
        status: "ok",
        results
    })
});


/**
 * @route post /create-files
 * @description create new files with the content passed in request body and return a json object containing an property "files" with a json array of objects ,each object should have an "file "property with file path and a "content" property with the content of the created file eg. {
 */

app.post('/create-files', async (req, res) => {
    const files = req.body.files;

    if (!files || !Array.isArray(files)) {
        return res.status(400).json({
            message: "Invalid files format. Expected an array of files.",
            status: "error"
        });
    }
    const results = await Promise.all(files.map(async (fileObj) => {
        const { file, content } = fileObj;
        const filepath = path.join(WORKING_DIR, file);

        try {
            await fs.promises.mkdir(path.dirname(filepath), { recursive: true });
            await fs.promises.writeFile(filepath, content, 'utf-8');

            return {
                file: path.relative(WORKING_DIR, filepath),
                content: content,
                status: "success"
            }
        }
        catch (error) {
            console.error(`Error creating file ${file}:`, error);
            return {
                file: file,
                status: "error",
                message: error.message
            }
        }
    }))
    res.status(200).json({
        message: "Files created successfully",
        status: "ok",
        files: results
    });
});


export default app;
