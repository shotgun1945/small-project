const express = require("express");
const session = require("express-session");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();
const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ 서버 설정
app.use(cors({ origin: "http://localhost:5500", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 세션 설정
app.use(
  session({
    secret: "your-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "none",
      secure: process.env.NODE_ENV === "production", // ✅ 배포 시엔 true, 개발 시엔 false
    },
  })
);

// ✅ 허용된 사용자 이메일 목록
const allowedEmails = ["shotgun1945@gmail.com"];

// 🔐 로그인 처리
const jwt = require("jsonwebtoken"); // 설치 필요: npm install jsonwebtoken
const JWT_SECRET = process.env.JWT_SECRET || "my-jwt-secret";

app.post("/auth/login", async (req, res) => {
  const idToken = req.body.credential;
  if (!idToken) return res.status(400).send("Missing ID token");

  try {
    const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`;
    const response = await axios.get(verifyUrl);
    const { email, name } = response.data;

    if (!allowedEmails.includes(email)) {
      return res.status(403).json({ success: false });
    }

    // JWT 발급
    const token = jwt.sign({ email, name }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ success: true, token });
  } catch (err) {
    console.error("ID token 검증 실패:", err.response?.data || err.message);
    res.status(401).send("Invalid ID token");
  }
});

class BoardGame {
  constructor(
    index = 0,
    name = "",
    baseGame = "",
    maxPlayers = "",
    weight = "",
    price = "",
    notes = ""
  ) {
    this.index = index;
    this.name = name;
    this.baseGame = baseGame;
    this.maxPlayers = maxPlayers;
    this.weight = weight;
    this.price = price;
    this.notes = notes;
  }
}

// 📊 데이터 요청 처리
app.get("/api/data", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).send("Missing token");
  }

  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!allowedEmails.includes(decoded.email)) {
      return res.status(403).send("Unauthorized");
    }
  } catch (err) {
    console.error("Token 검증 실패:", err.message);
    res.status(401).send("Invalid token");
  }

  try {
    const sheetRange = encodeURIComponent(`보드게임!A2:F200`);
    const sheetUri = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SHEET_ID}/values/${sheetRange}?key=${process.env.API_KEY}`;
    console.log("Fetching data from Google Sheets...", sheetUri);

    const sheetRes = await axios.get(sheetUri);
    const rows = sheetRes.data.values;

    // 데이터를 BoardGame 객체로 변환
    const boardGames = rows.map(
      (r, index) => new BoardGame(index, r[0], r[1], r[2], r[3], r[4], r[5])
    );

    res.json(boardGames);
  } catch (err) {
    console.error("Error fetching data from Google Sheets:", err.message);
    res.status(500).send("Error fetching data");
  }
});

app.listen(PORT, () => {
  console.log(`OAuth2 server running: http://localhost:${PORT}`);
});
