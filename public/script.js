// =============================================
// DONNÉES GLOBALES DU TOURNOI
// =============================================
const tournament = {
    name: '',
    pools: [],
    poolMatches: [],
    finalBracket: [],
    currentRound: 0,
    config: {
        numPools: 4,
        playersPerPool: 4,
        matchesPerPool: 3
    },
    thirdPlaceMatch: null // Pour la petite finale
};

// =============================================
// FONCTIONS D'AUTHENTIFICATION (inchangées)
// =============================================
function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showLogin() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('app-section').style.display = 'block';
            document.getElementById('user-email').textContent = email;
            loadUserTournaments();
        } else {
            alert(data.error || 'Erreur de connexion');
        }
    } catch (error) {
        alert('Erreur réseau : ' + error.message);
    }
});

document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Compte créé ! Connectez-vous.');
            showLogin();
        } else {
            alert(data.error || "Erreur d'inscription");
        }
    } catch (error) {
        alert('Erreur réseau : ' + error.message);
    }
});

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        document.getElementById('app-section').style.display = 'none';
        document.getElementById('auth-section').style.display = 'block';
    } catch (error) {
        alert('Erreur : ' + error.message);
    }
}

async function loadUserTournaments() {
    try {
        const response = await fetch('/api/tournaments');
        if (!response.ok) throw new Error('Non autorisé');
        const tournaments = await response.json();
        console.log('Tournois chargés :', tournaments);
    } catch (error) {
        console.error('Erreur :', error.message);
    }
}

// =============================================
// FONCTIONS POUR LA PHASE DE POULES (inchangées)
// =============================================
function initPools() {
    const tournamentName = document.getElementById('tournament-name').value || 'Mon Tournoi Darts';
    const numPools = parseInt(document.getElementById('num-pools').value) || 4;
    const playersPerPool = parseInt(document.getElementById('players-per-pool').value) || 4;
    const matchesPerPool = parseInt(document.getElementById('matches-per-pool').value) || 3;

    tournament.name = tournamentName;
    tournament.config = { numPools, playersPerPool, matchesPerPool };
    tournament.pools = [];
    tournament.poolMatches = [];

    const poolsContainer = document.getElementById('pools-container');
    poolsContainer.innerHTML = '';

    for (let i = 0; i < numPools; i++) {
        const pool = {
            id: i + 1,
            name: `Pool ${String.fromCharCode(65 + i)}`,
            players: [],
            matches: []
        };

        for (let j = 0; j < playersPerPool; j++) {
            pool.players.push({ id: j + 1, name: '', totalPoints: 0, wins: 0, matchesPlayed: 0 });
        }

        tournament.pools.push(pool);

        const poolDiv = document.createElement('div');
        poolDiv.className = 'pool-group';
        poolDiv.innerHTML = `
            <h3>${pool.name}</h3>
            ${pool.players.map((player, index) => `
                <div class="player">
                    <input type="text" placeholder="Joueur ${index + 1}"
                           onchange="updatePlayerName(${i}, ${index}, this.value)">
                    <span class="points" id="points-${i}-${index}">0</span>
                </div>
            `).join('')}
        `;
        poolsContainer.appendChild(poolDiv);
    }

    document.getElementById('pool-matches-container').innerHTML = '';
    document.getElementById('show-rankings-btn').classList.add('hidden');
    document.getElementById('ranking-phase').classList.add('hidden');
    document.getElementById('final-phase').classList.add('hidden');
    document.getElementById('pool-phase').classList.remove('hidden');
}

function updatePlayerName(poolIndex, playerIndex, name) {
    tournament.pools[poolIndex].players[playerIndex].name = name;
}

function generatePoolMatches() {
    const matchesContainer = document.getElementById('pool-matches-container');
    matchesContainer.innerHTML = '';
    tournament.poolMatches = [];

    tournament.pools.forEach((pool, poolIndex) => {
        const poolMatchesDiv = document.createElement('div');
        poolMatchesDiv.className = 'pool-group';
        poolMatchesDiv.innerHTML = `<h3>Matchs - ${pool.name}</h3>`;

        const matchesDiv = document.createElement('div');
        matchesDiv.className = 'pool-matches';

        for (let matchNum = 1; matchNum <= tournament.config.matchesPerPool; matchNum++) {
            const matchDiv = document.createElement('div');
            matchDiv.className = 'match';
            matchDiv.id = `match-${poolIndex}-${matchNum - 1}`;

            const rankOptions = [];
            for (let rank = 1; rank <= pool.players.length; rank++) {
                const points = pool.players.length - rank + 1;
                rankOptions.push(`<option value="${rank}">${rank}ème (${points} pt${points > 1 ? 's' : ''})</option>`);
            }

            matchDiv.innerHTML = `
                <h4>Match ${matchNum}</h4>
                <div class="match-result" id="match-result-${poolIndex}-${matchNum - 1}">
                    ${pool.players.map((player, index) => `
                        <div>
                            <input type="text" value="${player.name || 'Joueur ' + (index + 1)}" readonly>
                            <select id="rank-${poolIndex}-${matchNum - 1}-${index}"
                                    onchange="updateRankOptions(${poolIndex}, ${matchNum - 1})">
                                <option value="0">--</option>
                                ${rankOptions.join('')}
                            </select>
                        </div>
                    `).join('')}
                </div>
                <button onclick="recordPoolMatch(${poolIndex}, ${matchNum - 1})" id="match-btn-${poolIndex}-${matchNum - 1}">Enregistrer le match</button>
            `;
            matchesDiv.appendChild(matchDiv);
        }

        poolMatchesDiv.appendChild(matchesDiv);
        matchesContainer.appendChild(poolMatchesDiv);
    });

    document.getElementById('show-rankings-btn').classList.remove('hidden');
}

function updateRankOptions(poolIndex, matchIndex) {
    const pool = tournament.pools[poolIndex];
    const selectedRanks = [];

    for (let i = 0; i < pool.players.length; i++) {
        const rank = parseInt(document.getElementById(`rank-${poolIndex}-${matchIndex}-${i}`).value);
        if (rank) selectedRanks.push(rank);
    }

    for (let i = 0; i < pool.players.length; i++) {
        const select = document.getElementById(`rank-${poolIndex}-${matchIndex}-${i}`);
        const currentRank = parseInt(select.value);
        const options = select.querySelectorAll('option');

        options.forEach(opt => {
            const rankValue = parseInt(opt.value);
            if (rankValue && selectedRanks.includes(rankValue) && rankValue !== currentRank) {
                opt.style.display = 'none';
            } else {
                opt.style.display = '';
            }
        });
    }
}

function recordPoolMatch(poolIndex, matchIndex) {
    const pool = tournament.pools[poolIndex];
    const matchDiv = document.getElementById(`match-${poolIndex}-${matchIndex}`);
    const button = document.getElementById(`match-btn-${poolIndex}-${matchIndex}`);

    const ranks = [];
    for (let i = 0; i < pool.players.length; i++) {
        const rank = parseInt(document.getElementById(`rank-${poolIndex}-${matchIndex}-${i}`).value);
        ranks.push(rank);
    }

    const expectedRanks = Array.from({ length: pool.players.length }, (_, i) => i + 1);
    if (!ranks.every(r => r >= 1 && r <= pool.players.length) || new Set(ranks).size !== pool.players.length) {
        alert(`Veuillez attribuer un rang unique (1 à ${pool.players.length}) à chaque joueur.`);
        return;
    }

    for (let i = 0; i < pool.players.length; i++) {
        const rank = parseInt(document.getElementById(`rank-${poolIndex}-${matchIndex}-${i}`).value);
        const player = pool.players[i];
        const points = pool.players.length - rank + 1;
        player.totalPoints += points;
        player.matchesPlayed++;
        if (rank === 1) player.wins++;
    }

    updatePoolPoints(poolIndex);
    matchDiv.classList.add('recorded');
    button.textContent = 'Modifier';
    button.className = 'modify-btn';
    button.onclick = function() { modifyPoolMatch(poolIndex, matchIndex, button, matchDiv); };
}

function modifyPoolMatch(poolIndex, matchIndex, button, matchDiv) {
    const pool = tournament.pools[poolIndex];

    for (let i = 0; i < pool.players.length; i++) {
        const rank = parseInt(document.getElementById(`rank-${poolIndex}-${matchIndex}-${i}`).value);
        const player = pool.players[i];
        const points = pool.players.length - rank + 1;
        player.totalPoints -= points;
        player.matchesPlayed--;
        if (rank === 1) player.wins--;
    }

    for (let i = 0; i < pool.players.length; i++) {
        const select = document.getElementById(`rank-${poolIndex}-${matchIndex}-${i}`);
        const options = select.querySelectorAll('option');
        options.forEach(opt => opt.style.display = '');
        select.value = '0';
    }

    updatePoolPoints(poolIndex);
    matchDiv.classList.remove('recorded');
    button.textContent = 'Enregistrer le match';
    button.className = '';
    button.onclick = function() { recordPoolMatch(poolIndex, matchIndex); };
}

function updatePoolPoints(poolIndex) {
    const pool = tournament.pools[poolIndex];
    pool.players.forEach((player, index) => {
        document.getElementById(`points-${poolIndex}-${index}`).textContent = player.totalPoints;
    });
}

function showPoolRankings() {
    for (let poolIndex = 0; poolIndex < tournament.pools.length; poolIndex++) {
        for (let matchIndex = 0; matchIndex < tournament.config.matchesPerPool; matchIndex++) {
            const matchDiv = document.getElementById(`match-${poolIndex}-${matchIndex}`);
            if (!matchDiv.classList.contains('recorded')) {
                alert(`Veuillez enregistrer tous les matchs de poule avant de continuer.`);
                return;
            }
        }
    }

    tournament.pools.forEach(pool => {
        pool.players.sort((a, b) => b.totalPoints - a.totalPoints);
    });

    const rankingsContainer = document.getElementById('rankings-container');
    rankingsContainer.innerHTML = '';

    tournament.pools.forEach((pool, poolIndex) => {
        const poolRankingDiv = document.createElement('div');
        poolRankingDiv.className = 'pool-group';
        poolRankingDiv.innerHTML = `<h3>${pool.name}</h3>`;

        const table = document.createElement('table');
        table.className = 'ranking-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Position</th>
                    <th>Joueur</th>
                    <th>Points</th>
                    <th>Victoires</th>
                    <th>Matchs joués</th>
                </tr>
            </thead>
            <tbody>
                ${pool.players.map((player, index) => `
                    <tr class="${index < 2 ? 'qualified' : ''}">
                        <td>${index + 1}</td>
                        <td>${player.name || 'Joueur ' + player.id}</td>
                        <td>${player.totalPoints}</td>
                        <td>${player.wins}</td>
                        <td>${player.matchesPlayed}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        poolRankingDiv.appendChild(table);
        rankingsContainer.appendChild(poolRankingDiv);
    });

    displayGlobalStats();
    document.getElementById('pool-phase').classList.add('hidden');
    document.getElementById('ranking-phase').classList.remove('hidden');
}

function displayGlobalStats() {
    const statsContainer = document.getElementById('stats-container');
    statsContainer.innerHTML = '';

    const allPlayers = [];
    tournament.pools.forEach(pool => {
        allPlayers.push(...pool.players);
    });

    allPlayers.sort((a, b) => b.totalPoints - a.totalPoints);

    const topPlayers = allPlayers.slice(0, 3);
    topPlayers.forEach((player, index) => {
        const statCard = document.createElement('div');
        statCard.className = 'stat-card';
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        statCard.innerHTML = `
            <h4>${medal} ${player.name || 'Joueur ' + player.id}</h4>
            <p>${player.totalPoints} pts</p>
            <p style="font-size: 14px; margin-top: 5px;">${player.wins} victoires</p>
        `;
        statsContainer.appendChild(statCard);
    });

    const totalMatches = tournament.pools.length * tournament.config.matchesPerPool;
    const avgPoints = (allPlayers.reduce((sum, player) => sum + player.totalPoints, 0) / allPlayers.length).toFixed(1);

    const totalStatsCard = document.createElement('div');
    totalStatsCard.className = 'stat-card';
    totalStatsCard.innerHTML = `
        <h4>📊 Statistiques Générales</h4>
        <p>${allPlayers.length} joueurs</p>
        <p style="font-size: 14px; margin-top: 5px;">${totalMatches} matchs joués</p>
        <p style="font-size: 14px; margin-top: 5px;">${avgPoints} pts/joueur</p>
    `;
    statsContainer.appendChild(totalStatsCard);
}

function backToPoolPhase() {
    document.getElementById('pool-phase').classList.remove('hidden');
    document.getElementById('ranking-phase').classList.add('hidden');
}

// =============================================
// FONCTIONS POUR LE BRACKET (AMÉLIORÉ AVEC SEEDING CROISÉ)
// =============================================

function finalizePoolPhase() {
    // Trier les pools par nom (Pool A, Pool B, etc.)
    tournament.pools.sort((a, b) => a.name.localeCompare(b.name));

    // Récupérer les 2 premiers de chaque pool
    const poolWinners = [];
    const poolRunnersUp = [];
    tournament.pools.forEach(pool => {
        poolWinners.push(pool.players[0]);
        poolRunnersUp.push(pool.players[1]);
    });

    // Créer le seeding croisé : 1er Pool A vs 2ème Pool B, 1er Pool B vs 2ème Pool C, etc.
    const finalists = [];
    for (let i = 0; i < poolWinners.length; i++) {
        const nextIndex = (i + 1) % poolRunnersUp.length;
        finalists.push(poolWinners[i]);
        finalists.push(poolRunnersUp[nextIndex]);
    }

    // Générer le bracket avec ce seeding
    generateBracket(finalists);
    document.getElementById('ranking-phase').classList.add('hidden');
    document.getElementById('final-phase').classList.remove('hidden');
}

function generateBracket(players) {
    const bracketContainer = document.getElementById('bracket-container');
    bracketContainer.innerHTML = '';

    // Calculer le nombre de tours nécessaires
    const numRounds = Math.ceil(Math.log2(players.length));
    tournament.finalBracket = [];

    // Initialiser les matchs pour chaque tour
    for (let round = 0; round < numRounds; round++) {
        tournament.finalBracket[round] = [];
    }

    // Remplir le premier tour avec les joueurs (seeding croisé déjà fait)
    for (let i = 0; i < players.length; i += 2) {
        if (i + 1 < players.length) {
            tournament.finalBracket[0].push({
                player1: players[i],
                player2: players[i + 1],
                winner: null,
                selectedWinner: null,
                recorded: false
            });
        } else {
            // Si nombre impair, le dernier joueur a un "bye"
            tournament.finalBracket[0].push({
                player1: players[i],
                player2: { name: 'Bye', isBye: true },
                winner: players[i],
                selectedWinner: 0,
                recorded: true
            });
        }
    }

    // Afficher chaque tour
    for (let round = 0; round < numRounds; round++) {
        const roundDiv = document.createElement('div');
        roundDiv.className = 'bracket-round';

        // Nom du tour
        let roundName;
        switch (round) {
            case 0:
                roundName = numRounds > 3 ? '1/8 Finale' :
                           (numRounds === 3 ? 'Quarts de Finale' : 'Demi-Finales');
                break;
            case 1:
                roundName = numRounds > 3 ? 'Quarts de Finale' :
                           (numRounds === 3 ? 'Demi-Finales' : 'Finale');
                break;
            case 2:
                roundName = numRounds > 3 ? 'Demi-Finales' : 'Finale';
                break;
            case 3:
                roundName = 'Finale';
                break;
            default:
                roundName = `Tour ${round + 1}`;
        }

        // Pour la petite finale (si on est en finale)
        if (round === numRounds - 1 && tournament.thirdPlaceMatch) {
            roundName = 'Finale';
            const thirdPlaceRoundDiv = document.createElement('div');
            thirdPlaceRoundDiv.className = 'bracket-round';
            thirdPlaceRoundDiv.innerHTML = '<h3>Petite Finale</h3>';

            const thirdPlaceRowDiv = document.createElement('div');
            thirdPlaceRowDiv.className = 'bracket-row';

            const thirdPlaceMatchDiv = document.createElement('div');
            thirdPlaceMatchDiv.className = 'bracket-match';
            thirdPlaceMatchDiv.id = `third-place-match`;

            const loser1 = tournament.thirdPlaceMatch.player1;
            const loser2 = tournament.thirdPlaceMatch.player2;

            thirdPlaceMatchDiv.innerHTML = `
                <div class="teams">
                    <div class="team ${tournament.thirdPlaceMatch.winner === loser1 ? 'winner' : ''}"
                         onclick="selectThirdPlaceWinner(0)">
                        ${loser1.name || `Joueur ${loser1.id}`}
                    </div>
                    <div class="team ${tournament.thirdPlaceMatch.winner === loser2 ? 'winner' : ''}"
                         onclick="selectThirdPlaceWinner(1)">
                        ${loser2.name || `Joueur ${loser2.id}`}
                    </div>
                </div>
                <button onclick="confirmThirdPlaceWinner()"
                        id="confirm-third-place-btn"
                        ${tournament.thirdPlaceMatch.recorded ? 'disabled class="validated"' : ''}>
                    ${tournament.thirdPlaceMatch.recorded ? '✓ Validé' : 'Valider le vainqueur'}
                </button>
            `;
            thirdPlaceRowDiv.appendChild(thirdPlaceMatchDiv);
            thirdPlaceRoundDiv.appendChild(thirdPlaceRowDiv);
            bracketContainer.appendChild(thirdPlaceRoundDiv);
        }

        const roundTitle = document.createElement('h3');
        roundTitle.textContent = roundName;
        roundDiv.appendChild(roundTitle);

        const rowDiv = document.createElement('div');
        rowDiv.className = 'bracket-row';

        tournament.finalBracket[round].forEach((match, matchIndex) => {
            const matchDiv = document.createElement('div');
            matchDiv.className = 'bracket-match';
            matchDiv.id = `bracket-match-${round}-${matchIndex}`;

            const player1Name = match.player1.name || `Joueur ${match.player1.id}`;
            const player2Name = match.player2.isBye ? 'Bye' : (match.player2.name || `Joueur ${match.player2.id}`);

            matchDiv.innerHTML = `
                <div class="teams">
                    <div class="team ${match.winner === match.player1 ? 'winner' : ''} ${match.selectedWinner === 0 ? 'selected' : ''}"
                         onclick="${match.player2.isBye ? '' : `selectWinner(${round}, ${matchIndex}, 0)`}">
                        ${player1Name}
                    </div>
                    <div class="team ${match.winner === match.player2 ? 'winner' : ''} ${match.selectedWinner === 1 ? 'selected' : ''} ${match.player2.isBye ? 'by' : ''}"
                         onclick="${match.player2.isBye ? '' : `selectWinner(${round}, ${matchIndex}, 1)`}">
                        ${player2Name}
                    </div>
                </div>
                ${match.player2.isBye ? '' : `
                <button onclick="confirmWinner(${round}, ${matchIndex})"
                        id="confirm-btn-${round}-${matchIndex}"
                        ${match.recorded ? 'disabled class="validated"' : ''}>
                    ${match.recorded ? '✓ Validé' : 'Valider le vainqueur'}
                </button>
                `}
            `;
            rowDiv.appendChild(matchDiv);

            // Ajouter un connecteur entre les matchs (sauf pour le dernier tour)
            if (round < numRounds - 1 && matchIndex % 2 === 0) {
                const connector = document.createElement('div');
                connector.className = 'bracket-connector';
                rowDiv.appendChild(connector);
            }
        });

        roundDiv.appendChild(rowDiv);
        bracketContainer.appendChild(roundDiv);
    }
}

// Sélection du vainqueur dans un match
function selectWinner(round, matchIndex, teamIndex) {
    const match = tournament.finalBracket[round][matchIndex];
    const matchDiv = document.getElementById(`bracket-match-${round}-${matchIndex}`);
    const teams = matchDiv.querySelectorAll('.team');

    teams.forEach(team => {
        team.classList.remove('selected');
        team.classList.remove('winner');
    });

    teams[teamIndex].classList.add('selected');
    match.selectedWinner = teamIndex;

    const confirmBtn = document.getElementById(`confirm-btn-${round}-${matchIndex}`);
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('validated');
        confirmBtn.textContent = 'Valider le vainqueur';
    }
}

// Confirmer le vainqueur d'un match
function confirmWinner(round, matchIndex) {
    const match = tournament.finalBracket[round][matchIndex];
    const matchDiv = document.getElementById(`bracket-match-${round}-${matchIndex}`);
    const teams = matchDiv.querySelectorAll('.team');
    const confirmBtn = document.getElementById(`confirm-btn-${round}-${matchIndex}`);

    if (match.selectedWinner === null && !match.player2.isBye) {
        alert("Veuillez sélectionner un vainqueur.");
        return;
    }

    if (!match.player2.isBye) {
        teams[match.selectedWinner].classList.add('winner');
        teams[match.selectedWinner].classList.remove('selected');
    }
    match.winner = match.player2.isBye ? match.player1 : (match.selectedWinner === 0 ? match.player1 : match.player2);
    match.recorded = true;

    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.classList.add('validated');
        confirmBtn.textContent = '✓ Validé';
    }

    // Si c'est une demi-finale, préparer la petite finale
    if (round === numRounds - 2) {
        prepareThirdPlaceMatch(matchIndex, match.winner);
    }

    const allMatchesConfirmed = tournament.finalBracket[round].every(m => m.winner !== null);
    if (allMatchesConfirmed && round < tournament.finalBracket.length - 1) {
        const nextRound = round + 1;
        tournament.finalBracket[nextRound] = [];

        for (let i = 0; i < tournament.finalBracket[round].length; i += 2) {
            if (i + 1 < tournament.finalBracket[round].length) {
                tournament.finalBracket[nextRound].push({
                    player1: tournament.finalBracket[round][i].winner,
                    player2: tournament.finalBracket[round][i + 1].winner,
                    winner: null,
                    selectedWinner: null,
                    recorded: false
                });
            } else {
                tournament.finalBracket[nextRound].push({
                    player1: tournament.finalBracket[round][i].winner,
                    player2: { name: 'Bye', isBye: true },
                    winner: tournament.finalBracket[round][i].winner,
                    selectedWinner: 0,
                    recorded: true
                });
            }
        }

        updateNextRound(nextRound);
    } else if (allMatchesConfirmed && round === tournament.finalBracket.length - 1) {
        // C'est la finale, afficher le vainqueur et préparer la petite finale
        const winner = match.winner;
        const loser = match.winner === match.player1 ? match.player2 : match.player1;

        // Stocker le perdant de la finale pour la petite finale
        if (!tournament.thirdPlaceMatch) {
            tournament.thirdPlaceMatch = {
                player1: tournament.finalBracket[round - 1][0].winner === loser ? tournament.finalBracket[round - 1][1].winner : tournament.finalBracket[round - 1][0].winner,
                player2: loser,
                winner: null,
                selectedWinner: null,
                recorded: false
            };
        }

        // Afficher le scoreboard final
        showFinalScoreboard(winner, loser);
    }
}

// Préparer la petite finale
function prepareThirdPlaceMatch(matchIndex, winner) {
    // Cette fonction est appelée automatiquement lors de la confirmation des demi-finales
    // On ne fait rien ici, car la petite finale est générée dans generateBracket
}

// Sélection du vainqueur de la petite finale
function selectThirdPlaceWinner(teamIndex) {
    const match = tournament.thirdPlaceMatch;
    const matchDiv = document.getElementById('third-place-match');
    const teams = matchDiv.querySelectorAll('.team');

    teams.forEach(team => team.classList.remove('selected'));
    teams[teamIndex].classList.add('selected');
    match.selectedWinner = teamIndex;

    const confirmBtn = document.getElementById('confirm-third-place-btn');
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('validated');
        confirmBtn.textContent = 'Valider le vainqueur';
    }
}

// Confirmer le vainqueur de la petite finale
function confirmThirdPlaceWinner() {
    const match = tournament.thirdPlaceMatch;
    const matchDiv = document.getElementById('third-place-match');
    const teams = matchDiv.querySelectorAll('.team');
    const confirmBtn = document.getElementById('confirm-third-place-btn');

    if (match.selectedWinner === null) {
        alert("Veuillez sélectionner un vainqueur.");
        return;
    }

    teams[match.selectedWinner].classList.add('winner');
    match.winner = match.selectedWinner === 0 ? match.player1 : match.player2;
    match.recorded = true;

    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.classList.add('validated');
        confirmBtn.textContent = '✓ Validé';
    }

    // Mettre à jour le scoreboard final
    updateFinalScoreboard();
}

// Mettre à jour l'affichage du tour suivant
function updateNextRound(round) {
    const bracketContainer = document.getElementById('bracket-container');
    const rounds = bracketContainer.querySelectorAll('.bracket-round');

    if (rounds[round]) {
        const rowDiv = rounds[round].querySelector('.bracket-row');
        if (rowDiv) {
            rowDiv.innerHTML = '';

            tournament.finalBracket[round].forEach((match, matchIndex) => {
                const matchDiv = document.createElement('div');
                matchDiv.className = 'bracket-match';
                matchDiv.id = `bracket-match-${round}-${matchIndex}`;

                const player1Name = match.player1.name || `Joueur ${match.player1.id}`;
                const player2Name = match.player2.isBye ? 'Bye' : (match.player2.name || `Joueur ${match.player2.id}`);

                matchDiv.innerHTML = `
                    <div class="teams">
                        <div class="team ${match.winner === match.player1 ? 'winner' : ''}"
                             onclick="${match.player2.isBye ? '' : `selectWinner(${round}, ${matchIndex}, 0)`}">
                            ${player1Name}
                        </div>
                        <div class="team ${match.winner === match.player2 ? 'winner' : ''} ${match.player2.isBye ? 'by' : ''}"
                             onclick="${match.player2.isBye ? '' : `selectWinner(${round}, ${matchIndex}, 1)`}">
                            ${player2Name}
                        </div>
                    </div>
                    ${match.player2.isBye ? '' : `
                    <button onclick="confirmWinner(${round}, ${matchIndex})"
                            id="confirm-btn-${round}-${matchIndex}"
                            ${match.recorded ? 'disabled class="validated"' : ''}>
                        ${match.recorded ? '✓ Validé' : 'Valider le vainqueur'}
                    </button>
                    `}
                `;
                rowDiv.appendChild(matchDiv);

                if (round < tournament.finalBracket.length - 1 && matchIndex % 2 === 0) {
                    const connector = document.createElement('div');
                    connector.className = 'bracket-connector';
                    rowDiv.appendChild(connector);
                }
            });
        }
    }
}

// Afficher le scoreboard final
function showFinalScoreboard(winner, loser) {
    // Créer une section pour le scoreboard
    const scoreboardSection = document.createElement('div');
    scoreboardSection.id = 'scoreboard-section';
    scoreboardSection.className = 'scoreboard-section';

    scoreboardSection.innerHTML = `
        <h2>🏆 Classement Final</h2>
        <div class="scoreboard">
            <div class="podium">
                <div class="podium-place first">
                    <div class="place">1</div>
                    <div class="player-name">${winner.name || `Joueur ${winner.id}`}</div>
                    <div class="medal">🥇</div>
                </div>
                <div class="podium-place second">
                    <div class="place">2</div>
                    <div class="player-name">${loser.name || `Joueur ${loser.id}`}</div>
                    <div class="medal">🥈</div>
                </div>
                <div class="podium-place third">
                    <div class="place">3</div>
                    <div class="player-name">À déterminer</div>
                    <div class="medal">🥉</div>
                </div>
            </div>
            <div class="other-players">
                <h3>Autres joueurs</h3>
                <div id="other-players-list"></div>
            </div>
        </div>
    `;

    // Ajouter le scoreboard à la fin du bracket
    const bracketContainer = document.getElementById('bracket-container');
    bracketContainer.appendChild(scoreboardSection);

    // Masquer le bouton de retour (optionnel)
    document.getElementById('back-to-pool-btn').classList.add('hidden');
}

// Mettre à jour le scoreboard final (après la petite finale)
function updateFinalScoreboard() {
    const thirdPlaceWinner = tournament.thirdPlaceMatch.winner;
    const thirdPlaceLoser = tournament.thirdPlaceMatch.winner === tournament.thirdPlaceMatch.player1 ?
                          tournament.thirdPlaceMatch.player2 : tournament.thirdPlaceMatch.player1;

    const scoreboardSection = document.getElementById('scoreboard-section');
    if (scoreboardSection) {
        const thirdPlaceElement = scoreboardSection.querySelector('.third .player-name');
        if (thirdPlaceElement) {
            thirdPlaceElement.textContent = thirdPlaceWinner.name || `Joueur ${thirdPlaceWinner.id}`;
        }

        // Ajouter les autres joueurs (4ème place, etc.)
        const otherPlayersList = document.getElementById('other-players-list');
        if (otherPlayersList) {
            otherPlayersList.innerHTML = '';
            // Récupérer tous les joueurs éliminés en quart ou demi
            const eliminatedPlayers = getEliminatedPlayers();
            eliminatedPlayers.forEach((player, index) => {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'other-player';
                playerDiv.innerHTML = `
                    <span class="place">${index + 4}</span>
                    <span class="player-name">${player.name || `Joueur ${player.id}`}</span>
                `;
                otherPlayersList.appendChild(playerDiv);
            });
        }
    }
}

// Récupérer les joueurs éliminés (pour le scoreboard)
function getEliminatedPlayers() {
    const allPlayers = [];
    tournament.pools.forEach(pool => {
        allPlayers.push(...pool.players);
    });

    // Filtrer les joueurs qui ne sont pas dans le top 3
    const top3 = [
        tournament.finalBracket[tournament.finalBracket.length - 1][0].winner,
        tournament.finalBracket[tournament.finalBracket.length - 1][0].winner === tournament.finalBracket[tournament.finalBracket.length - 1][0].player1 ?
            tournament.finalBracket[tournament.finalBracket.length - 1][0].player2 : tournament.finalBracket[tournament.finalBracket.length - 1][0].player1,
        tournament.thirdPlaceMatch.winner
    ];

    return allPlayers.filter(player =>
        !top3.includes(player) &&
        player.name !== 'Bye'
    );
}