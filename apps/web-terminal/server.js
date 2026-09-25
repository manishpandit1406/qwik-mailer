const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client } = require('ssh2');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const dotenv = require('dotenv');

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3001;

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// ── Master Password & Email Logic ──
let currentMasterPassword = '';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'email-smtp.ap-south-1.amazonaws.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

function generatePassword() {
    // Generate a random 8-character hex string
    return crypto.randomBytes(4).toString('hex');
}

function updateAndSendPassword() {
    currentMasterPassword = generatePassword();
    console.log("[Security] New Master Password generated.");

    const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Qwik Terminal'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@qwikmailer.in'}>`,
        to: 'work.manishpandit1406@gmail.com',
        subject: '🔒 Your New Qwik Terminal Master Password',
        text: `Hello Manish,\n\nYour new weekly Master Password for Qwik Terminal (https://terminal.qwikmailer.in) is:\n\nPassword: ${currentMasterPassword}\n\nThis password will change automatically every week.\n\nKeep it safe!\n- Qwikmailer System`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("[Email Error] Failed to send password email:", error);
        } else {
            console.log("[Email Sent] Password sent to work.manishpandit1406@gmail.com");
        }
    });
}

// 1. Generate and send password on startup
updateAndSendPassword();

// 2. Schedule cron job to run every week (Every Sunday at midnight)
cron.schedule('0 0 * * 0', () => {
    console.log("[Cron] Weekly password rotation started.");
    updateAndSendPassword();
});


// ── Socket Logic ──
io.on('connection', (socket) => {
    let sshClient = null;
    let stream = null;

    socket.on('connect_ssh', (config) => {
        // --- Security Check ---
        if (!config.masterPassword || config.masterPassword !== currentMasterPassword) {
            socket.emit('ssh_error', 'Invalid Master Password! Check your email.');
            return;
        }

        sshClient = new Client();

        sshClient.on('ready', () => {
            socket.emit('ssh_status', 'Connected!');
            sshClient.shell({ term: 'xterm-256color', rows: config.rows || 24, cols: config.cols || 80 }, (err, shellStream) => {
                if (err) {
                    socket.emit('ssh_error', err.message);
                    return;
                }
                stream = shellStream;

                // Listen for data from SSH stream and send to client
                stream.on('data', (data) => {
                    socket.emit('ssh_data', data.toString('utf-8'));
                }).on('close', () => {
                    socket.emit('ssh_status', 'Connection closed');
                    sshClient.end();
                });
            });
        }).on('error', (err) => {
            socket.emit('ssh_error', 'SSH Error: ' + err.message);
        }).on('close', () => {
            socket.emit('ssh_status', 'SSH Connection Closed');
        }).connect({
            host: config.host,
            port: config.port || 22,
            username: config.username,
            password: config.password,
            privateKey: config.privateKey,
            keepaliveInterval: 10000,
        });
    });

    socket.on('ssh_input', (data) => {
        if (stream) stream.write(data);
    });

    socket.on('ssh_resize', (size) => {
        if (stream) stream.setWindow(size.rows, size.cols, size.height || 0, size.width || 0);
    });

    socket.on('disconnect', () => {
        if (sshClient) sshClient.end();
    });
});

server.listen(PORT, () => {
    console.log(`Web Terminal Server running on http://localhost:${PORT}`);
});
