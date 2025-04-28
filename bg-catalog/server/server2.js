const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/auth/login", (req, res) => {
  console.log("Login request received.");
  console.log("req.body", req.body);
  if (req.body.credential) {
    res.send("ok");
  } else {
    res.status(400).send(req.body);
  }
});
// 📌 OAuth redirect endpoint
app.post("/oauth2/callback", async (req, res) => {
  console.log("OAuth2 callback received.");
  //   console.log(req.body);
  const code = req.body.credential || req.query.code;
  if (!code) return res.status(400).send("Authorization code missing.");

  try {
    // 🔐 code → access_token 교환
    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      null,
      {
        params: {
          code,
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          redirect_uri: "http://localhost:3000/oauth2/callback",
          grant_type: "authorization_code",
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    console.log("Access Token:", accessToken);

    // ✅ 스프레드시트 요청
    const sheetRes = await axios.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SHEET_ID}/values/${process.env.SHEET_RANGE}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const rows = sheetRes.data.values || [];

    // 📄 HTML 테이블로 응답
    const htmlRows = rows
      .map(
        (row) =>
          `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td></tr>`
      )
      .join("");
    res.send(`
      <h2>Boardgame List (from Google Sheets)</h2>
      <table border="1">
        <thead><tr><th>이름</th><th>장르</th><th>플레이어 수</th></tr></thead>
        <tbody>${htmlRows}</tbody>
      </table>
    `);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Failed to fetch spreadsheet data.");
  }
});

app.listen(PORT, () => {
  console.log(`OAuth2 server running: http://localhost:${PORT}`);
});
