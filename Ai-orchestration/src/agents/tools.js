import axios from "axios";
import { json } from "express";
import { tool } from 'langchain'
import * as z from "zod";
import { fi } from "zod/v4/locales";


export const ListFiles = tool(
    async ({ }) => {

        console.log("=================================")
        console.log("using list files tool")
        console.log("=================================")

        const response = await axios.get('http://019e2b33-4b3e-768b-b020-ed781c86aeff.preview.localhost/files')

        console.log("=================================")
        console.log("response from list files tool", response.data)
        console.log("=================================")

        return JSON.stringify(response.data.files);
    },
    {
        name: 'ListFiles',
        description: "List all the files in the project directory. This is useful for understanding what files are available to work with.",
        Schema: z.object({})
    }
)


export const ReadFiles = tool(
    async ({ files: [] }) => {

        console.log("=================================")
        console.log("using read files tool with files", files)
        console.log("=================================")

        const response = await axios.post('http://019e2b33-4b3e-768b-b020-ed781c86aeff.preview.localhost/read-files' + files.join(','))

        console.log("=================================")
        console.log("response from read files tool", response.data)
        console.log("=================================")

        return JSON.stringify(response.data);

    },
    {
        name: 'ReadFiles',
        description: "Read the contents of the specified files. This is useful for understanding the contents of the files you want to work with.",
        Schema: z.object({
            files: z.array(z.string()).describe('The list of files absolute paths to read. These should be files that were listed using the list_files tool or created later')
        })
    }
)


export const UpdateFile = tool(
    async ({ files }) => {

        console.log("=================================")
        console.log("using update files tool with files", files)
        console.log("=================================")

        const response = await axios.patch(
            'http://019e2b33-4b3e-768b-b020-ed781c86aeff.preview.localhost/update-files',
            { updates: files }
        )

        console.log("=================================")
        console.log("response from update files tool", response.data)
        console.log("=================================")

        return JSON.stringify(response.data);
    },
    {
        name: 'UpdateFile',
        description: "Update the contents of specified files. This is useful for making changes to files based on the requirements of the task at hand. this tool can also use to create new files by providing a new file name in the file field and the content to be added in the content field",
        Schema: z.object({
            files: z.array(z.object({
                file: z.string().describe("The absolute path of the file to update"),
                content: z.string().describe("The new content for the file, the content should support json format.")
            })).describe
        })
    }

)
