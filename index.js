require("dotenv").config();
const colors = require("colors");
const { Dropbox } = require("dropbox");
const dbx = new Dropbox({ accessToken: process.env.dropboxToken });
const path = require("path");
const { readdirSync, statSync, readFileSync } = require("fs");
const { writeFile } = require("fs/promises");

const getDirectories = (srcPath, search) => {
    return readdirSync(srcPath).filter(
        (file) =>
            statSync(path.join(srcPath, file)).isDirectory() &&
            file.match(search)
    );
};

const writeLinks = async (basePath, fileName, links) => {
    return writeFile(
        path.join(basePath, fileName),
        `# ${process.env.repoName} - Shared Links\n\n` +
            `${Object.keys(links)
                .sort()
                .map((key) => `- [${key}](${links[key]})`)
                .join("\n")}`
    );
};

const syncDeletedFiles = (files, folders, remoteFolderPath) => {
    dbx.filesListFolder({ path: remoteFolderPath })
        .then((r) => {
            const deleteEntries = [];
            r.result.entries.forEach((entry) => {
                if (
                    entry[".tag"] === "file" &&
                    files.indexOf(entry.name) === -1
                )
                    deleteEntries.push({ path: entry.path_lower });
                else if (
                    entry[".tag"] === "folder" &&
                    folders.indexOf(entry.name) === -1
                )
                    deleteEntries.push({ path: entry.path_lower });
            });
            if (deleteEntries.length)
                dbx.filesDeleteBatch({ entries: deleteEntries })
                    .then((resp) =>
                        console.log(
                            "Delete of ".blue +
                                colors.blue(deleteEntries.map((e) => e.path)) +
                                " queued via:\n".blue +
                                colors.blue(resp.result)
                        )
                    )
                    .catch((err) => {
                        console.log(
                            `Could not delete ${deleteEntries.length} files/folders at ${remoteFolderPath} due to error!!`
                                .red
                        );
                        console.log(colors.red(err));
                    });
        })
        .catch((err) => {
            console.log(`Could not look up ${remoteFolderPath}`.red);
            console.log(colors.red(err));
        });
};

async function delay(time = 100) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

async function processArray(array, fn, ...args) {
    return array.reduce(function (p, item) {
        return p.then(function () {
            return fn(item, ...args);
        });
    }, Promise.resolve());
}

async function processArrayWithResults(array, fn, ...args) {
    var results = [];
    return array.reduce(function (p, item) {
        return p.then(function () {
            return fn(item, ...args).then(function (data) {
                results.push(data);
                return results;
            });
        });
    }, Promise.resolve([]));
}

const uploadFile = async (file, basePath, remoteBasePath) => {
    try {
        await dbx.filesUpload({
            contents: readFileSync(path.join(basePath, file)),
            path: `${remoteBasePath}/${file}`,
            mode: {
                ".tag": "overwrite",
            },
        });
        // await delay(100);
        console.log(
            `Successfully uploaded to ${remoteBasePath}/${file}`.magenta
        );
    } catch (error) {
        console.log(colors.red(error));
    }
    return Promise.resolve();
};

const syncFolder = async (folder, basePath, remoteBasePath) => {
    const dir = {};
    const folderPath = path.join(basePath, folder);
    const remoteFolderPath = `${remoteBasePath}/${folder}`;
    const directory = readdirSync(folderPath);
    const files = directory.filter((file) =>
        statSync(path.join(folderPath, file)).isFile()
    );
    const folders = directory.filter((folder) =>
        statSync(path.join(folderPath, folder)).isDirectory()
    );
    await processArray(files, uploadFile, folderPath, remoteFolderPath);
    const subDirectoryStructure = await processArrayWithResults(
        folders,
        syncFolder,
        folderPath,
        remoteFolderPath
    );
    dir[folder] = files.concat(subDirectoryStructure);
    syncDeletedFiles(files, folders, remoteFolderPath);
    return Promise.resolve(dir);
};

const syncAll = async (basePath, folderList, remoteBasePath) => {
    syncDeletedFiles([], folderList, remoteBasePath);
    return processArrayWithResults(
        folderList,
        syncFolder,
        basePath,
        remoteBasePath
    );
};

const createLink = async (basePath, folderList) => {
    const links = {};
    try {
        await Promise.all(
            folderList.map((folderName) => {
                return (async () => {
                    try {
                        const s = await dbx.sharingCreateSharedLinkWithSettings(
                            {
                                path: `${basePath}/${folderName}`,
                            }
                        );
                        links[folderName] = s.result.url;
                    } catch (err) {
                        if (
                            err.error &&
                            err.error.error &&
                            err.error.error.shared_link_already_exists &&
                            err.error.error.shared_link_already_exists
                                .metadata &&
                            err.error.error.shared_link_already_exists.metadata
                                .url
                        )
                            links[folderName] =
                                err.error.error.shared_link_already_exists.metadata.url;
                        else links[folderName] = "Error 404";
                    }
                })();
            })
        );
    } catch (error) {
        console.log(colors.red(error));
    }
    return links;
};

(async () => {
    const basePath = process.cwd();
    const remoteBasePath = "/Compiler Design";
    const folderList = getDirectories(basePath, /Assignment [0-9][1-9]/gs);

    const x = await syncAll(basePath, folderList, remoteBasePath);
    console.log("Finally resolved with directory structure:".bgCyan);
    console.dir(x, { depth: null });

    const folderLinks = await createLink(remoteBasePath, folderList);
    console.log("Folder links: ".yellow);
    console.log(colors.bold.yellow(folderLinks));

    await writeLinks(basePath, "sharing.md", folderLinks);
    console.log("Sharing links written to file successfully".bold.green);
})();
