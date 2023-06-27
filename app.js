const express = require('express');
const app = express();
const nodemailer = require("nodemailer");
const { google } = require('googleapis');
const multer = require('multer')
const fs = require('fs')


const port = process.env.PORT || 5000

require('dotenv').config()
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));

const clientId = process.env.YOUR_CLIENT_ID
const clientSecret = process.env.YOUR_CLIENT_SECRET
const redirectUrl = process.env.YOUR_REDIRECT_URL
const refreshToken = process.env.REFRESH_TOKEN
// console.log(refreshToken)



const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUrl)
oAuth2Client.setCredentials({
    refresh_token: refreshToken
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + './public/index.html');
});

// send mail with reply
app.post('/rule_1_2', async (req, res) => {
    const data = req.body
    // console.log(data);

    // function to send mail
    const sendMail = async () => {
        try {
            const { token } = await oAuth2Client.getAccessToken()
            // console.log(token)

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'oAuth2',
                    user: process.env.USER,
                    clientId: clientId,
                    clientSecret: clientSecret,
                    refresh_token: refreshToken,
                    accessToken: token
                }
            }
            )
            // mail to send 
            const mail = {
                from: `Hello 🙌 <${data.email}>`,
                to: process.env.USER,
                subject: 'test subject',
                text: 'success message',
                html: `<h1>${data.message} </h1>`,
            }

            const result = await transporter.sendMail(mail)
            return result

        } catch (error) {
            return error
        }
    }

    // access the mail of the user
    const gmail = google.gmail({
        version: 'v1',
        auth: oAuth2Client
    });
    // Encoding the message 
    const encodeBase64 = (string) => {
        const buff = Buffer.from(string, 'utf-8');
        return buff.toString('base64');
    }
    sendMail().then(result => {
        console.log(result)
        const replyOptions = {
            auth: oAuth2Client,
            userId: 'me',
            resource: {
                raw: encodeBase64(
                    `From: "Reply" <${result.envelope.to[0]}>\r\n` +
                    `To: <${result.envelope.from}>\r\n` +
                    `Subject: Re: Test Email\r\n` +
                    `In-Reply-To: ${result.messageId}\r\n` +
                    `References: ${result.messageId}\r\n` +
                    '\r\n' +
                    'This is the reply to the email. thank you for your feedback'
                )
            }
        };

        gmail.users.messages.send(replyOptions, (err, data) => {
            if (err) {
                res.status(404).send(err);
            } else {
                res.send(data.data)
                // console.log(res.data);
            }
        });
    })


});





const uploadPath = './uploads'

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath)
}

const upload = multer({ dest: uploadPath })
// post data with file 
// console.log(upload)
app.post('/rule_3_4', upload.single('file'), (req, res, next) => {
    const data = req.body
    const file = req.file
    // console.log(file);
    const sendMail = async () => {
        try {
            const { token } = await oAuth2Client.getAccessToken()
            // console.log(token)

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'oAuth2',
                    user: process.env.USER,
                    clientId: clientId,
                    clientSecret: clientSecret,
                    refresh_token: refreshToken,
                    accessToken: token
                }
            }
            )

            const mail = {
                from: `Hello 🙌 <${process.env.USER}>`,
                to: data.email,
                subject: 'test subject',
                text: 'success message',
                html: '<h1>hello brothers </h1>',
                list: {
                    unsubscribe: {
                        url: 'https:email.com/unsubscribe',
                        comment: 'unsubscribe'
                    },
                },
                attachments: [
                    {
                        filename: file.originalname,
                        content: `${uploadPath}/${file.filename}`,
                    }]
            }

            const result = await transporter.sendMail(mail)
            return result

        } catch (error) {
            return error
        }
    }

    sendMail().then((mail) => res.send(mail)).catch((error) => console.log(error));
});

app.listen(port, () => {
    console.log('listening on port http://localhost:%d', port);
});