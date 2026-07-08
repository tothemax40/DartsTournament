// Données du tournoi (côté client)
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
    }
};

// ======================
// GESTION DE L'AUTHENTIFICATION
// ======================

// Basculer entre connexion et inscription
function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showLogin() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

// Connexion
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

// Inscription
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

// Déconnexion
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        document.getElementById('app-section').style.display = 'none';
        document.getElementById('auth-section').style.display = 'block';
    } catch (error) {
        alert('Erreur : ' + error.message);
    }
}

// Charger les tournois de l'utilisateur
async function loadUserTournaments() {
    try {
        const response = await fetch('/api/tournaments');
        if (!response.ok) {
            throw new Error('Non autorisé');
        }
        const tournaments = await response.json();
        console.log('Tournois chargés :', tournaments);
        // Ici, tu peux afficher la liste des tournois ou charger le dernier tournoi
    } catch (error) {
        console.error('Erreur :', error.message);
    }
}

// ======================
// GESTION DU TOURNOI
// ======================

// Initialisation des pools
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

    // Réinitialiser les matchs de poule et les classements
    document.getElementById('pool-matches-container').innerHTML = '';
    document.getElementById('show-rankings-btn').classList.add('hidden');
    document.getElementById('ranking-phase').classList.add('hidden');
    document.getElementById('final-phase').classList.add('hidden');
    document.getElementById('pool-phase').classList.remove('hidden');
}

// Mise à jour du nom d'un joueur
function updatePlayerName(poolIndex, playerIndex, name) {
    tournament.pools[poolIndex].players[playerIndex].name = name;
}

// Génération des matchs de poule
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

        // Créer les matchs pour ce pool
        for (let matchNum = 1; matchNum <= tournament.config.matchesPerPool; matchNum++) {
            const matchDiv = document.createElement('div');
            matchDiv.className = 'match';
            matchDiv.id = `match-${poolIndex}-${matchNum - 1}`;

            // Générer les options de rang en fonction du nombre de joueurs
            const rankOptions = [];
            for (let rank = 1; rank <= pool.players.length; rank++) {
                const points = pool.players.length - rank + 1;
                rankOptions.push(`<option value="${rank}">${rank}ème (${points} pt${points > 1 ? 's' : ''})</option>`);
            }

            const matchHtml = `
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
            matchDiv.innerHTML = matchHtml;
            matchesDiv.appendChild(matchDiv);
        }

        poolMatchesDiv.appendChild(matchesDiv);
        matchesContainer.appendChild(poolMatchesDiv);
    });

    document.getElementById('show-rankings-btn').classList.remove('hidden');
}

// Mise à jour des options de rang en fonction des sélections
function updateRankOptions(poolIndex, matchIndex) {
    const pool = tournament.pools[poolIndex];
    const selectedRanks = [];

    // Récupérer tous les rangs déjà sélectionnés dans ce match
    for (let i = 0; i < pool.players.length; i++) {
        const rank = parseInt(document.getElementById(`rank-${poolIndex}-${matchIndex}-${i}`).value);
        if (rank) selectedRanks.push(rank);
    }

    // Masquer les rangs déjà sélectionnés pour les autres joueurs
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

// Enregistrement du résultat d'un match de poule
function recordPoolMatch(poolIndex, matchIndex) {
    const pool = tournament.pools[poolIndex];
    const matchDiv = document.getElementById(`match-${poolIndex}-${matchIndex}`);
    const button = document.getElementById(`match-btn-${poolIndex}-${matchIndex}`);

    // Vérifier que tous les rangs sont attribués
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

    // Attribuer les points et mettre à jour les stats
    for (let i = 0; i < pool.players.length; i++) {
        const rank = parseInt(document.getElementById(`rank-${poolIndex}-${matchIndex}-${i}`).value);
        const player = pool.players[i];
        const points = pool.players.length - rank + 1;
        player.totalPoints += points;
        player.matchesPlayed++;
        if (rank === 1) player.wins++;
    }

    // Mise à jour de l'affichage des points
    updatePoolPoints(poolIndex);

    // Changer le style du match et du bouton
    matchDiv.classList.add('recorded');
    button.textContent = 'Modifier';
    button.className = 'modify-btn';
    button.onclick = function() { modifyPoolMatch(poolIndex, matchIndex, button, matchDiv); };
}

// Modifier un match de poule
function modifyPoolMatch(poolIndex, matchIndex, button, matchDiv) {
    const pool = tournament.pools[poolIndex];

    // Réinitialiser les points et stats des joueurs pour ce match
    for (let i = 0; i < pool.players.length; i++) {
        const rank = parseInt(document.getElementById(`rank-${poolIndex}-${matchIndex}-${i}`).value);
        const player = pool.players[i];
        const points = pool.players.length - rank + 1;
        player.totalPoints -= points;
        player.matchesPlayed--;
        if (rank === 1) player.wins--;
    }

    // Réinitialiser les options des menus déroulants
    for (let i = 0; i < pool.players.length; i++) {
        const select = document.getElementById(`rank-${poolIndex}-${matchIndex}-${i}`);
        const options = select.querySelectorAll('option');
        options.forEach(opt => opt.style.display = '');
        select.value = '0';
    }

    // Mise à jour de l'affichage des points
    updatePoolPoints(poolIndex);

    // Réinitialiser le style du match et du bouton
    matchDiv.classList.remove('recorded');
    button.textContent = 'Enregistrer le match';
    button.className = '';
    button.onclick = function() { recordPoolMatch(poolIndex, matchIndex); };
}

// Mise à jour des points des joueurs dans un pool
function updatePoolPoints(poolIndex) {
    const pool = tournament.pools[poolIndex];
    pool.players.forEach((player, index) => {
        document.getElementById(`points-${poolIndex}-${index}`).textContent = player.totalPoints;
    });
}

// Afficher les classements des pools
function showPoolRankings() {
    // Vérifier que tous les matchs sont enregistrés
    for (let poolIndex = 0; poolIndex < tournament.pools.length; poolIndex++) {
        for (let matchIndex = 0; matchIndex < tournament.config.matchesPerPool; matchIndex++) {
            const matchDiv = document.getElementById(`match-${poolIndex}-${matchIndex}`);
            if (!matchDiv.classList.contains('recorded')) {
                alert(`Veuillez enregistrer tous les matchs de poule avant de continuer.`);
                return;
            }
        }
    }

    // Trier les joueurs de chaque pool par points
    tournament.pools.forEach(pool => {
        pool.players.sort((a, b) => b.totalPoints - a.totalPoints);
    });

    // Afficher les classements
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

    // Afficher les statistiques globales
    displayGlobalStats();

    // Masquer la phase de poule et afficher les classements
    document.getElementById('pool-phase').classList.add('hidden');
    document.getElementById('ranking-phase').classList.remove('hidden');
}

// Afficher les statistiques globales
function displayGlobalStats() {
    const statsContainer = document.getElementById('stats-container');
    statsContainer.innerHTML = '';

    // Calculer les statistiques globales
    const allPlayers = [];
    tournament.pools.forEach(pool => {
        allPlayers.push(...pool.players);
    });

    // Trier par points
    allPlayers.sort((a, b) => b.totalPoints - a.totalPoints);

    // Top 3 joueurs
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

    // Statistiques générales
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

// Retour à la phase de poule
function backToPoolPhase() {
    document.getElementById('pool-phase').classList.remove('hidden');
    document.getElementById('ranking-phase').classList.add('hidden');
}

// Finalisation de la phase de poule
function finalizePoolPhase() {
    // Récupérer les 2 premiers de chaque pool pour la phase finale
    const finalists = [];
    tournament.pools.forEach(pool => {
        finalists.push(pool.players[0]);
        finalists.push(pool.players[1]);
    });

    // Générer le bracket
    generateBracket(finalists);

    // Masquer les classements et afficher la phase finale
    document.getElementById('ranking-phase').classList.add('hidden');
    document.getElementById('final-phase').classList.remove('hidden');
}

// Génération du bracket dynamique
function generateBracket(players) {
    const bracketContainer = document.getElementById('bracket-container');
    bracketContainer.innerHTML = '';

    // Déterminer le nombre de tours nécessaires
    const numRounds = Math.ceil(Math.log2(players.length));
    tournament.finalBracket = [];

    // Initialiser les matchs pour chaque tour
    for (let round = 0; round < numRounds; round++) {
        tournament.finalBracket[round] = [];
    }

    // Remplir le premier tour avec les joueurs
    for (let i = 0; i < players.length; i += 2) {
        if (i + 1 < players.length) {
            tournament.finalBracket[0].push({
                player1: players[i],
                player2: players[i + 1],
                winner: null,
                selectedWinner: null
            });
        } else {
            // Si nombre impair, le dernier joueur a un "bye"
            tournament.finalBracket[0].push({
                player1: players[i],
                player2: { name: 'Bye', isBye: true },
                winner: players[i],
                selectedWinner: 0
            });
        }
    }

    // Afficher chaque tour
    for (let round = 0; round < numRounds; round++) {
        const roundDiv = document.createElement('div');
        roundDiv.className = 'bracket-round';

        let roundName;
        switch (round) {
            case 0:
                roundName = numRounds > 3 ? 'Tour 1' : (numRounds === 3 ? 'Quarts de Finale' : (numRounds === 2 ? 'Demi-Finales' : 'Finale'));
                break;
            case 1:
                roundName = numRounds > 3 ? 'Tour 2' : (numRounds === 3 ? 'Demi-Finales' : 'Finale');
                break;
            case 2:
                roundName = numRounds > 3 ? 'Quarts de Finale' : 'Finale';
                break;
            default:
                roundName = `Tour ${round + 1}`;
        }

        roundDiv.innerHTML = `<h3>${roundName}</h3>`;

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
                    <div class="team ${match.winner === match.player1 ? 'winner' : ''}"
                         onclick="${match.player2.isBye ? '' : `selectWinner(${round}, ${matchIndex}, 0)`}">
                        ${player1Name}
                    </div>
                    <div class="team ${match.winner === match.player2 ? 'winner' : ''} ${match.player2.isBye ? 'by' : ''}"
                         onclick="${match.player2.isBye ? '' : `selectWinner(${round}, ${matchIndex}, 1)`}">
                        ${player2Name}
                    </div>
                </div>
                ${match.player2.isBye ? '' : `<button onclick="confirmWinner(${round}, ${matchIndex})" id="confirm-btn-${round}-${matchIndex}" ${match.winner ? 'disabled' : ''}>Confirmer le vainqueur</button>`}
            `;
            rowDiv.appendChild(matchDiv);
        });

        roundDiv.appendChild(rowDiv);
        bracketContainer.appendChild(roundDiv);

        // Ajouter un connecteur visuel (sauf après le dernier tour)
        if (round < numRounds - 1) {
            const connector = document.createElement('div');
            connector.className = 'bracket-connector';
            bracketContainer.appendChild(connector);
        }
    }
}

// Sélection du vainqueur dans un match
function selectWinner(round, matchIndex, teamIndex) {
    const match = tournament.finalBracket[round][matchIndex];
    const matchDiv = document.getElementById(`bracket-match-${round}-${matchIndex}`);
    const teams = matchDiv.querySelectorAll('.team');

    // Réinitialiser les sélections
    teams.forEach(team => team.classList.remove('selected'));

    // Sélectionner le vainqueur
    teams[teamIndex].classList.add('selected');
    match.selectedWinner = teamIndex;

    // Activer le bouton de confirmation
    document.getElementById(`confirm-btn-${round}-${matchIndex}`).disabled = false;
}

// Confirmer le vainqueur d'un match
function confirmWinner(round, matchIndex) {
    const match = tournament.finalBracket[round][matchIndex];
    const matchDiv = document.getElementById(`bracket-match-${round}-${matchIndex}`);
    const teams = matchDiv.querySelectorAll('.team');

    if (match.selectedWinner === null && !match.player2.isBye) {
        alert("Veuillez sélectionner un vainqueur.");
        return;
    }

    // Marquer le vainqueur
    if (!match.player2.isBye) {
        teams[match.selectedWinner].classList.add('winner');
        teams[match.selectedWinner].classList.remove('selected');
    }
    match.winner = match.player2.isBye ? match.player1 : (match.selectedWinner === 0 ? match.player1 : match.player2);

    // Désactiver le bouton de confirmation
    if (!match.player2.isBye) {
        document.getElementById(`confirm-btn-${round}-${matchIndex}`).disabled = true;
    }

    // Vérifier si tous les matchs du tour actuel sont confirmés
    const allMatchesConfirmed = tournament.finalBracket[round].every(m => m.winner !== null);
    if (allMatchesConfirmed && round < tournament.finalBracket.length - 1) {
        // Passer au tour suivant
        const nextRound = round + 1;
        tournament.finalBracket[nextRound] = [];

        for (let i = 0; i < tournament.finalBracket[round].length; i += 2) {
            if (i + 1 < tournament.finalBracket[round].length) {
                tournament.finalBracket[nextRound].push({
                    player1: tournament.finalBracket[round][i].winner,
                    player2: tournament.finalBracket[round][i + 1].winner,
                    winner: null,
                    selectedWinner: null
                });
            } else {
                // Si nombre impair, le dernier joueur a un "bye"
                tournament.finalBracket[nextRound].push({
                    player1: tournament.finalBracket[round][i].winner,
                    player2: { name: 'Bye', isBye: true },
                    winner: tournament.finalBracket[round][i].winner,
                    selectedWinner: 0
                });
            }
        }

        // Mettre à jour l'affichage du tour suivant
        updateNextRound(nextRound);
    } else if (allMatchesConfirmed && round === tournament.finalBracket.length - 1) {
        // C'est la finale, afficher le vainqueur
        alert(`Félicitations à ${match.winner.name}, vainqueur du tournoi ${tournament.name} !`);
    }
}

// Mettre à jour l'affichage du tour suivant
function updateNextRound(round) {
    const bracketContainer = document.getElementById('bracket-container');

    // Trouver le tour suivant dans le DOM
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
                    ${match.player2.isBye ? '' : `<button onclick="confirmWinner(${round}, ${matchIndex})" id="confirm-btn-${round}-${matchIndex}" ${match.winner ? 'disabled' : ''}>Confirmer le vainqueur</button>`}
                `;
                rowDiv.appendChild(matchDiv);
            });
        }
    }
}