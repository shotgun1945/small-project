let players = [];
let scores = {};
let round = 1;
let history = [];
let backupRoundState = null;

function updatePlayerList() {
  const listDiv = document.getElementById("playerList");
  listDiv.innerHTML = "";
  players.forEach((player) => {
    listDiv.innerHTML += `
            <div class="d-flex align-items-center mb-1">
                <span class="me-2">${player}</span>
                <button onclick="removePlayer('${player}')" class="btn btn-danger btn-sm">X</button>
            </div>
        `;
  });
}

function addPlayer() {
  const nameInput = document.getElementById("playerName");
  const name = nameInput.value.trim();
  if (name && !players.includes(name)) {
    players.push(name);
    nameInput.value = "";
    updatePlayerList();
  }
}

function removePlayer(name) {
  players = players.filter((player) => player !== name);
  updatePlayerList();
}

function startGame() {
  if (players.length === 0) return alert("플레이어를 추가하세요!");
  document.getElementById("setup").style.display = "none";
  document.getElementById("game").style.display = "block";

  players.forEach((p) => (scores[p] = 0));
  renderRoundInputs();
  renderScoreBoard();
}

function closeModal() {
  const modalElement = document.getElementById("confirmModal");
  const modal = bootstrap.Modal.getInstance(modalElement);
  modal.hide();

  const nextRoundButton = document.getElementById("nextRoundButton");
  if (nextRoundButton) {
    nextRoundButton.focus();
  }
}

function renderSelectButtons(player, type) {
  let html = '<div class="select-group">';
  for (let i = 0; i <= round; i++) {
    const id = `${type}-${player}-${i}`;
    html += `<label><input type="radio" name="${type}-${player}" id="${id}" value="${i}">${i}승</label>`;
  }

  return html;
}

function adjustBonus(player, amount) {
  const bonusInput = document.getElementById(`bonus-${player}`);
  if (bonusInput) {
    let currentBonus = parseInt(bonusInput.value, 10) || 0;
    currentBonus += amount;
    bonusInput.value = currentBonus;
    const event = new Event("change");
    bonusInput.dispatchEvent(event);
  }
}

function calculateScore(player, predict, actual, bonus, round) {
  let score = 0;

  if (predict === actual) {
    score = predict === 0 ? round * 10 : predict * 20;
    score += bonus;
  } else {
    score = -(Math.abs(predict - actual) * 10);
  }

  return score;
}

function renderRoundInputs() {
  const container = document.getElementById("roundInputs");
  container.innerHTML = "";

  // 🔥 크라켄 등장 숫자 선택 추가
  container.innerHTML += `
    <div class="kraken-inputs mb-3">
      <strong>크라켄 등장 수:</strong>
      <div class="select-group">
        <label><input type="radio" name="krakenCount" value="0" checked> 0</label>
        <label><input type="radio" name="krakenCount" value="1"> 1</label>
        <label><input type="radio" name="krakenCount" value="2"> 2</label>
      </div>
    </div>
  `;

  players.forEach((player) => {
    const bonusId = `bonus-${player}`;
    const previewId = `preview-${player}`;
    container.innerHTML += `
            <div class="player-inputs">
                <strong>${player}</strong><br>
                예측 승수:<br>${renderSelectButtons(player, "predict")}<br>
                실제 승수:<br>${renderSelectButtons(player, "actual")}
                <div class="bonus-group mt-2">
                    <label for="${bonusId}">보너스 점수:</label>
                    <div class="input-group">
                    <button class="btn btn-outline-secondary" type="button" onclick="adjustBonus('${player}', -10)">-10</button>
                    <input type="number" id="${bonusId}" class="form-control" value="0" readonly />
                    <button class="btn btn-outline-secondary" type="button" onclick="adjustBonus('${player}', 10)">+10</button>
                    </div>
                </div>
                <div class="preview-group mt-2">
                    <label>점수 미리보기:</label>
                    <div id="${previewId}" class="preview-score">0점</div>
                </div>
            </div>
        `;
  });

  players.forEach((player) => {
    const predictRadios = document.getElementsByName(`predict-${player}`);
    const actualRadios = document.getElementsByName(`actual-${player}`);
    const bonusInput = document.getElementById(`bonus-${player}`);

    const updatePreview = () => {
      const predict = getSelectedValue(player, "predict");
      const actual = getSelectedValue(player, "actual");
      const bonus = parseInt(bonusInput.value, 10) || 0;
      const previewScore = calculateScore(
        player,
        predict,
        actual,
        bonus,
        round
      );

      document.getElementById(
        `preview-${player}`
      ).innerText = `${previewScore}점`;
    };

    predictRadios.forEach((radio) =>
      radio.addEventListener("change", updatePreview)
    );
    actualRadios.forEach((radio) =>
      radio.addEventListener("change", updatePreview)
    );
    bonusInput.addEventListener("change", updatePreview);
  });
}

function getSelectedValue(player, type) {
  const radios = document.getElementsByName(`${type}-${player}`);
  for (const radio of radios) {
    if (radio.checked) {
      return parseInt(radio.value);
    }
  }
  return null;
}

function calculateRound() {
  const roundData = [];

  players.forEach((player) => {
    const predict = getSelectedValue(player, "predict");
    const actual = getSelectedValue(player, "actual");
    const bonus =
      parseInt(document.getElementById(`bonus-${player}`).value, 10) || 0;

    if (predict === null || actual === null) return;

    const gainedScore = calculateScore(player, predict, actual, bonus, round);
    scores[player] += gainedScore;

    roundData.push({ player, predict, actual, gainedScore, bonus });
  });

  const rankedPlayers = players
    .map((player) => ({
      name: player,
      score: scores[player],
    }))
    .sort((a, b) => b.score - a.score);

  roundData.forEach((entry) => {
    const rank = rankedPlayers.findIndex((rp) => rp.name === entry.player) + 1;
    history.push({
      round,
      player: entry.player,
      predict: entry.predict,
      actual: entry.actual,
      gainedScore: entry.gainedScore,
      rank,
    });
  });
}

function renderScoreBoard() {
  const header = document.getElementById("scoreHeader");
  const tbody = document.querySelector("tbody");

  const rankedPlayers = players
    .map((player) => ({
      name: player,
      score: scores[player],
    }))
    .sort((a, b) => b.score - a.score);

  header.innerHTML = "<th>순위</th><th>플레이어</th><th>점수</th>";
  tbody.innerHTML = "";

  rankedPlayers.forEach((playerObj, index) => {
    tbody.innerHTML += `
            <tr>
                <td>${index + 1}위</td>
                <td>${playerObj.name}</td>
                <td>${playerObj.score}점</td>
            </tr>
        `;
  });
}

function resetGame() {
  // Reset all game variables
  scores = {};
  round = 1;
  history = [];
  backupRoundState = null;

  // Reset UI elements
  document.getElementById("setup").style.display = "block";
  document.getElementById("game").style.display = "none";
  document.querySelector("tbody").innerHTML = "";
}

function renderFinalRanking() {
  const gameDiv = document.getElementById("game");
  gameDiv.innerHTML = "<h2>최종 랭킹</h2>";

  const rankedPlayers = players
    .map((player) => ({
      name: player,
      score: scores[player],
    }))
    .sort((a, b) => b.score - a.score);

  let html = `<table class="table table-bordered">
        <thead><tr><th>순위</th><th>플레이어</th><th>점수</th></tr></thead><tbody>`;

  rankedPlayers.forEach((playerObj, index) => {
    html += `<tr><td>${index + 1}위</td><td>${playerObj.name}</td><td>${
      playerObj.score
    }점</td></tr>`;
  });

  html += `</tbody></table>`;

  html += "<h2 class='mt-4'>라운드별 결과</h2>";

  const rounds = [...new Set(history.map((record) => record.round))];

  html += `<div class="accordion" id="roundAccordion">`;
  rounds.forEach((r) => {
    html += `
        <div class="accordion-item">
            <h2 class="accordion-header" id="heading${r}">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${r}" aria-expanded="false" aria-controls="collapse${r}">
                    ${r} 라운드
                </button>
            </h2>
            <div id="collapse${r}" class="accordion-collapse collapse" aria-labelledby="heading${r}" data-bs-parent="#roundAccordion">
                <div class="accordion-body">
                    <table class="table table-bordered">
                        <thead><tr><th>플레이어</th><th>예측</th><th>실제</th><th>획득 점수</th><th>보너스</th><th>현재 순위</th></tr></thead>
                        <tbody>`;
    history
      .filter((record) => record.round === r)
      .forEach((record) => {
        html += `<tr>
                        <td>${record.player}</td>
                        <td>${record.predict}</td>
                        <td>${record.actual}</td>
                        <td>${record.gainedScore}점</td>
                        <td>${record.bonus}점</td>
                        <td>${record.rank}위</td>
                     </tr>`;
      });
    html += `</tbody>
                    </table>
                </div>
            </div>
        </div>`;
  });
  html += `</div>`;

  // Add a button to reset the game
  html += `<button onclick="resetGame()" class="btn btn-primary mt-4">처음으로 돌아가기</button>`;

  gameDiv.innerHTML += html;
}

function onClickNextRound() {
  if (!validateActualWins()) {
    return; // 🔥 실제 승수 합이 맞지 않으면 진행 중단
  }
  const modalElement = document.getElementById("confirmModal");
  const modal = new bootstrap.Modal(modalElement);
  modal.show();
}

function validateActualWins() {
  const totalActualWins = players.reduce((sum, player) => {
    const actual = getSelectedValue(player, "actual");
    return sum + (actual !== null ? actual : 0);
  }, 0);

  const krakenCount =
    parseInt(
      document.querySelector('input[name="krakenCount"]:checked').value,
      10
    ) || 0;

  if (totalActualWins + krakenCount !== round) {
    alert(
      `실제 승수의 합(${totalActualWins}) + 크라켄 등장 수(${krakenCount})는 ${round}이어야 합니다.`
    );
    return false;
  }

  return true;
}

function nextRound() {
  if (!validateActualWins()) {
    return; // 🔥 실제 승수 합이 맞지 않으면 진행 중단
  }
  calculateRound();
  renderScoreBoard();

  if (round === 10) {
    renderFinalRanking();
    saveGameResults();
  } else {
    round++;
    if (round === 10) {
      document.getElementById("nextRoundButton").innerText = "게임 종료";
    }
    document.getElementById("roundNumber").innerText = round;
    renderRoundInputs();
  }
}

function saveGameResults() {
  const gameResults = JSON.parse(localStorage.getItem("gameResults")) || {};

  players.forEach((player) => {
    const playerHistory = history.filter((record) => record.player === player);
    const totalRounds = playerHistory.length;
    const correctPredictions = playerHistory.filter(
      (record) => record.predict === record.actual
    ).length;
    const predictionAccuracy = totalRounds
      ? ((correctPredictions / totalRounds) * 100).toFixed(2)
      : 0;

    // 10라운드의 순위를 최종 순위로 사용
    const finalRank = playerHistory.find((record) => record.round === 10)?.rank;

    const playerData = {
      finalScore: scores[player],
      finalRank: finalRank,
      rounds: playerHistory.map((record) => ({
        round: record.round,
        predict: record.predict,
        actual: record.actual,
        gainedScore: record.gainedScore,
        bonus: record.bonus,
        rank: record.rank,
      })),
      predictionAccuracy: `${predictionAccuracy}%`,
    };

    if (!gameResults[player]) {
      gameResults[player] = [];
    }
    gameResults[player].push(playerData);
  });

  localStorage.setItem("gameResults", JSON.stringify(gameResults));
}

function showResults() {
  const resultsDiv = document.getElementById("results");
  const setupDiv = document.getElementById("setup");
  const gameDiv = document.getElementById("game");
  const savedResultsDiv = document.getElementById("savedResults");

  setupDiv.style.display = "none";
  gameDiv.style.display = "none";
  resultsDiv.style.display = "block";

  const gameResults = JSON.parse(localStorage.getItem("gameResults")) || {};
  let html = "";

  if (Object.keys(gameResults).length === 0) {
    html = `<tr><td colspan="7">저장된 결과가 없습니다.</td></tr>`;
  } else {
    for (const player in gameResults) {
      const games = gameResults[player];
      const totalGames = games.length;
      const wins = games.filter((game) => game.finalRank === 1).length;
      const highestScore = Math.max(...games.map((game) => game.finalScore));
      const averageScore = (
        games.reduce((sum, game) => sum + game.finalScore, 0) / totalGames
      ).toFixed(2);
      const totalRounds = games.reduce(
        (sum, game) => sum + game.rounds.length,
        0
      );
      const averageRoundScore = (
        games.reduce(
          (sum, game) =>
            sum +
            game.rounds.reduce((rSum, round) => rSum + round.gainedScore, 0),
          0
        ) / totalRounds
      ).toFixed(2);
      const averagePredictionAccuracy = (
        games.reduce(
          (sum, game) => sum + parseFloat(game.predictionAccuracy),
          0
        ) / totalGames
      ).toFixed(2);

      html += `<tr>
        <td>${player}</td>
        <td>${totalGames}</td>
        <td>${wins}</td>
        <td>${highestScore}</td>
        <td>${averageScore}</td>
        <td>${averageRoundScore}</td>
        <td>${averagePredictionAccuracy}%</td>
      </tr>`;
    }
  }

  savedResultsDiv.innerHTML = html;
}

function resetToMain() {
  const resultsDiv = document.getElementById("results");
  const setupDiv = document.getElementById("setup");

  resultsDiv.style.display = "none";
  setupDiv.style.display = "block";

  // 메인 화면으로 돌아왔을 때 동일한 플레이어 유지
  updatePlayerList();
}
