import readline from 'readline';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import crypto from 'crypto';
import zlib from 'zlib';

let currentDir = os.homedir();
let username = '';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
});

const displayCurrentDir = () => {
    console.log(`You are currently in ${currentDir}`);
};

const parseCommand = async (input) => {
    const [cmd, ...args] = input.trim().split(' ');

    switch (cmd) {
        case 'up':
            const parent = path.dirname(currentDir);
            if (parent !== currentDir) currentDir = parent;
            break;

        case 'cd':
            if (!args[0]) {
                console.log('Invalid input');
                break;
            }
            const newPath = path.resolve(currentDir, args[0]);
            try {
                const stat = await fs.stat(newPath);
                if (stat.isDirectory()) currentDir = newPath;
                else console.log('Operation failed');
            } catch {
                console.log('Operation failed');
            }
            break;

        case 'ls':
            try {
                const items = await fs.readdir(currentDir, { withFileTypes: true });
                const dirs = items.filter(i => i.isDirectory()).map(i => ({ name: i.name, type: 'directory' }));
                const files = items.filter(i => i.isFile()).map(i => ({ name: i.name, type: 'file' }));
                const sorted = [...dirs, ...files].sort((a, b) => a.name.localeCompare(b.name));
                console.table(sorted);
            } catch {
                console.log('Operation failed');
            }
            break;

        case 'cat':
            if (!args[0]) {
                console.log('Invalid input');
                break;
            }
            const filePath = path.resolve(currentDir, args[0]);
            const readStream = createReadStream(filePath, 'utf8');
            readStream.on('data', chunk => process.stdout.write(chunk));
            readStream.on('error', () => console.log('Operation failed'));
            break;

        case 'add':
            if (!args[0]) {
                console.log('Invalid input');
                break;
            }
            const newFilePath = path.join(currentDir, args[0]);
            try {
                await fs.writeFile(newFilePath, '');
                console.log('File created');
            } catch {
                console.log('Operation failed');
            }
            break;

        case 'rn':
            if (args.length < 2) {
                console.log('Invalid input');
                break;
            }
            const oldPath = path.resolve(currentDir, args[0]);
            const newPathName = path.resolve(currentDir, args[1]);
            try {
                await fs.rename(oldPath, newPathName);
                console.log('File renamed');
            } catch {
                console.log('Operation failed');
            }
            break;

        case 'cp':
            if (args.length < 2) {
                console.log('Invalid input');
                break;
            }
            const src = path.resolve(currentDir, args[0]);
            const destDir = path.resolve(currentDir, args[1]);
            const destFile = path.join(destDir, path.basename(src));
            const readable = createReadStream(src);
            const writable = createWriteStream(destFile);
            readable.pipe(writable);
            readable.on('error', () => console.log('Operation failed'));
            writable.on('finish', () => console.log('File copied'));
            break;

        case 'mv':
            if (args.length < 2) {
                console.log('Invalid input');
                break;
            }
            const mvSrc = path.resolve(currentDir, args[0]);
            const mvDestDir = path.resolve(currentDir, args[1]);
            const mvDestFile = path.join(mvDestDir, path.basename(mvSrc));
            const mvReadable = createReadStream(mvSrc);
            const mvWritable = createWriteStream(mvDestFile);
            mvReadable.pipe(mvWritable);
            mvWritable.on('finish', async () => {
                await fs.unlink(mvSrc);
                console.log('File moved');
            });
            mvReadable.on('error', () => console.log('Operation failed'));
            break;

        case 'rm':
            if (!args[0]) {
                console.log('Invalid input');
                break;
            }
            const rmPath = path.resolve(currentDir, args[0]);
            try {
                await fs.unlink(rmPath);
                console.log('File deleted');
            } catch {
                console.log('Operation failed');
            }
            break;

        case 'os':
            if (!args[0]) {
                console.log('Invalid input');
                break;
            }
            switch (args[0]) {
                case '--EOL':
                    console.log(JSON.stringify(os.EOL));
                    break;
                case '--cpus':
                    const cpus = os.cpus();
                    console.log(`Total CPUs: ${cpus.length}`);
                    cpus.forEach((cpu, i) => {
                        console.log(`CPU ${i + 1}: ${cpu.model} @ ${cpu.speed / 1000} GHz`);
                    });
                    break;
                case '--homedir':
                    console.log(os.homedir());
                    break;
                case '--username':
                    console.log(os.userInfo().username);
                    break;
                case '--architecture':
                    console.log(os.arch());
                    break;
                default:
                    console.log('Invalid input');
            }
            break;

        case 'hash':
            if (!args[0]) {
                console.log('Invalid input');
                break;
            }
            const hashPath = path.resolve(currentDir, args[0]);
            const hashStream = createReadStream(hashPath);
            const hash = crypto.createHash('sha256');
            hashStream.on('data', chunk => hash.update(chunk));
            hashStream.on('end', () => console.log(hash.digest('hex')));
            hashStream.on('error', () => console.log('Operation failed'));
            break;

        case 'compress':
            if (args.length < 2) {
                console.log('Invalid input');
                break;
            }
            const compSrc = path.resolve(currentDir, args[0]);
            const compDest = path.resolve(currentDir, args[1]);
            const compRead = createReadStream(compSrc);
            const compWrite = createWriteStream(compDest);
            const brotliCompress = zlib.createBrotliCompress();
            compRead.pipe(brotliCompress).pipe(compWrite);
            compWrite.on('finish', () => console.log('File compressed'));
            compRead.on('error', () => console.log('Operation failed'));
            break;

        case 'decompress':
            if (args.length < 2) {
                console.log('Invalid input');
                break;
            }
            const decompSrc = path.resolve(currentDir, args[0]);
            const decompDest = path.resolve(currentDir, args[1]);
            const decompRead = createReadStream(decompSrc);
            const decompWrite = createWriteStream(decompDest);
            const brotliDecompress = zlib.createBrotliDecompress();
            decompRead.pipe(brotliDecompress).pipe(decompWrite);
            decompWrite.on('finish', () => console.log('File decompressed'));
            decompRead.on('error', () => console.log('Operation failed'));
            break;

        case '.exit':
            console.log(`Thank you for using File Manager, ${username}, goodbye!`);
            process.exit(0);
            break;

        default:
            console.log('Invalid input');
    }
};

const start = () => {
    const args = process.argv.slice(2);
    const usernameArg = args.find(arg => arg.startsWith('--username='));
    if (usernameArg) {
        username = usernameArg.split('=')[1];
    } else {
        username = 'User';
    }

    console.log(`Welcome to the File Manager, ${username}!`);
    displayCurrentDir();
    rl.prompt();

    rl.on('line', async (line) => {
        await parseCommand(line);
        displayCurrentDir();
        rl.prompt();
    }).on('close', () => {
        console.log(`Thank you for using File Manager, ${username}, goodbye!`);
        process.exit(0);
    });
};

start();