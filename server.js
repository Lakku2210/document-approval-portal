const express = require('express');
const multer = require('multer');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { PDFDocument } = require('pdf-lib');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

let db = {};

// ✅ SENDGRID EMAIL SETUP
const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  auth: {
    user: "apikey",
    pass: process.env.SENDGRID_API_KEY
  }
});

// 📤 Upload Route
app.post('/upload', upload.single('file'), (req, res) => {
  const id = Date.now();

  db[id] = {
    file: req.file.path,
    subject: req.body.subject,
    approvers: [req.body.a1, req.body.a2, req.body.a3],
    step: 0,
    history: []
  };

  sendMail(id);

  res.send("✅ File uploaded & sent for approval");
});

// 📧 Send Email Function
function sendMail(id) {
  const doc = db[id];
  const email = doc.approvers[doc.step];

  const link = `${process.env.URL}/approve/${id}`;

  transporter.sendMail({
    to: email,
    from: "lakku2210@gmail.com", //
    subject: `Approval Required: ${doc.subject}`,
    html: `<h3>Document Approval</h3>
           <p>${doc.subject}</p>
           <a href="${link}">Click to Approve</a>`
  });
}

// ✅ Approval Route
app.get('/approve/:id', async (req, res) => {
  const doc = db[req.params.id];

  const pdfBytes = fs.readFileSync(doc.file);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPages()[0];

  const text = `Approved by: ${doc.approvers[doc.step]} | ${new Date().toDateString()}`;

  page.drawText(text, {
    x: 50,
    y: 50 - (doc.history.length * 20),
    size: 10
  });

  const updated = await pdfDoc.save();
  fs.writeFileSync(doc.file, updated);

  doc.history.push(doc.approvers[doc.step]);
  doc.step++;

  if (doc.step < 3) {
    sendMail(req.params.id);
    res.send("✅ Approved & sent to next approver");
  } else {
    res.send("🎉 Final Approval Done. PDF Ready.");
  }
});

// 🚀 Start Server
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
