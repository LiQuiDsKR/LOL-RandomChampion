// 메인 애플리케이션 진입점
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎮 칼바람 랜덤 픽/밴 툴 시작');
  
  // 초기화
  await init();
});

async function init() {
  // 이벤트 리스너 바인딩
  bindEventListeners();
  
  // Data Dragon 미리 로딩 (백그라운드)
  datadragon.loadChampions().catch(err => {
    console.error('챔피언 데이터 로딩 실패:', err);
  });
  
  // 내 픽 복원
  restoreMyPick();
}

function bindEventListeners() {
  // 시작 화면 버튼들
  Utils.$('#createRoomBtn').addEventListener('click', () => {
    createRoomModal.show();
  });

  Utils.$('#joinRoomBtn').addEventListener('click', () => {
    const roomCode = Utils.$('#joinRoomCode').value.trim();
    if (!roomCode) {
      Utils.toast('방 코드를 입력해주세요.');
      Utils.$('#joinRoomCode').focus();
      return;
    }
    joinRoomModal.show(roomCode);
  });

  // 게임 화면 버튼들
  const copyRoomLinkBtn = Utils.$('#copyRoomLinkBtn');
  if (copyRoomLinkBtn) {
    copyRoomLinkBtn.addEventListener('click', copyRoomLink);
  }

  const leaveRoomBtn = Utils.$('#leaveRoomBtn');
  if (leaveRoomBtn) {
    leaveRoomBtn.addEventListener('click', () => {
      if (confirm('정말 방을 나가시겠습니까?')) {
        gameManager.leaveRoom();
      }
    });
  }

  // 팀 이동 버튼들
  const toTeam1Btn = Utils.$('#toTeam1Btn');
  const toTeam2Btn = Utils.$('#toTeam2Btn');
  
  if (toTeam1Btn) {
    toTeam1Btn.addEventListener('click', () => moveTeam('team1'));
  }
  
  if (toTeam2Btn) {
    toTeam2Btn.addEventListener('click', () => moveTeam('team2'));
  }

  // 투표 버튼들
  const voteTeam1Btn = Utils.$('#voteTeam1Btn');
  const voteTeam2Btn = Utils.$('#voteTeam2Btn');
  const voteGlobalBtn = Utils.$('#voteGlobalBtn');

  if (voteTeam1Btn) {
    voteTeam1Btn.addEventListener('click', () => toggleVote('team1Reroll'));
  }
  
  if (voteTeam2Btn) {
    voteTeam2Btn.addEventListener('click', () => toggleVote('team2Reroll'));
  }
  
  if (voteGlobalBtn) {
    voteGlobalBtn.addEventListener('click', () => toggleVote('globalReroll'));
  }

  // 밴 버튼들
  const chooseBanBtn = Utils.$('#chooseBanBtn');
  const clearBanBtn = Utils.$('#clearBanBtn');

  if (chooseBanBtn) {
    chooseBanBtn.addEventListener('click', openBanModal);
  }
  
  if (clearBanBtn) {
    clearBanBtn.addEventListener('click', clearMyBan);
  }

  // 호스트 전용 버튼들
  const forceRollBtn = Utils.$('#forceRollBtn');
  const forceTeam1Btn = Utils.$('#forceTeam1Btn');
  const forceTeam2Btn = Utils.$('#forceTeam2Btn');
  const resetVotesBtn = Utils.$('#resetVotesBtn');

  if (forceRollBtn) {
    forceRollBtn.addEventListener('click', hostRollBoth);
  }
  
  if (forceTeam1Btn) {
    forceTeam1Btn.addEventListener('click', async () => {
      await hostRollTeam('team1');
      await gameManager.clearTeamVotesOnly('team1');
    });
  }
  
  if (forceTeam2Btn) {
    forceTeam2Btn.addEventListener('click', async () => {
      await hostRollTeam('team2');
      await gameManager.clearTeamVotesOnly('team2');
    });
  }
  
  if (resetVotesBtn) {
    resetVotesBtn.addEventListener('click', resetAllVotes);
  }

  // 밴 모달 이벤트
  const banSearch = Utils.$('#banSearch');
  if (banSearch) {
    banSearch.addEventListener('input', renderBanGrid);
  }

  // Enter 키로 방 참가
  Utils.$('#joinRoomCode').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      Utils.$('#joinRoomBtn').click();
    }
  });
}

// 방 링크 복사
async function copyRoomLink() {
  if (!gameManager.roomId) return;
  
  const url = new URL(window.location.href);
  url.searchParams.set('room', gameManager.roomId);
  if (gameManager.playerData.name) {
    url.searchParams.set('name', gameManager.playerData.name);
  }
  
  await Utils.copyToClipboard(url.toString());
}

// 팀 이동
async function moveTeam(team) {
  if (!gameManager.roomId) return;
  
  try {
    await window.db.ref(`rooms/${gameManager.roomId}/players/${gameManager.uid}`).update({
      team: team || "team1",
      lastActive: firebase.database.ServerValue.TIMESTAMP
    });
    gameManager.playerData.team = team;
    Utils.toast(`${team === 'team1' ? '팀 1' : '팀 2'}로 이동했습니다.`);
  } catch (error) {
    console.error('팀 이동 실패:', error);
    Utils.toast('팀 이동에 실패했습니다.');
  }
}

// 투표
async function toggleVote(voteType) {
  if (!gameManager.roomId) return;
  
  try {
    const voteRef = window.db.ref(`rooms/${gameManager.roomId}/votes/${voteType}/${gameManager.uid}`);
    const currentVote = await voteRef.once('value');
    
    if (currentVote.exists()) {
      await voteRef.remove();
      Utils.toast('투표를 취소했습니다.');
    } else {
      await voteRef.set(true);
      Utils.toast('투표했습니다.');
    }
  } catch (error) {
    console.error('투표 실패:', error);
    Utils.toast('투표에 실패했습니다.');
  }
}

// 밴 모달 열기
function openBanModal() {
  if (!datadragon.flatList.length) {
    Utils.toast('챔피언 데이터를 아직 불러오지 못했습니다.');
    return;
  }
  
  Utils.$('#banSearch').value = '';
  renderBanGrid();
  modals.show('#banModal');
}

// 밴 그리드 렌더링
function renderBanGrid() {
  const banGrid = Utils.$('#banGrid');
  if (!banGrid) return;
  
  banGrid.innerHTML = '';
  
  const query = Utils.$('#banSearch').value.toLowerCase();
  const champions = datadragon.searchChampions(query);
  
  champions.forEach(champ => {
    const div = document.createElement('div');
    div.className = 'champ';
    div.innerHTML = `
      <img src="${datadragon.champIconUrl(champ.imageFull)}" alt="${Utils.escapeHtml(champ.name)}" />
      <div class="meta">${Utils.escapeHtml(champ.name)}</div>
    `;
    div.onclick = () => setMyBan(champ.id);
    banGrid.appendChild(div);
  });
}

// 내 밴 설정
async function setMyBan(champId) {
  if (!gameManager.roomId) return;
  
  try {
    await window.db.ref(`rooms/${gameManager.roomId}/players/${gameManager.uid}`).update({
      ban: champId || null
    });
    modals.hide('#banModal');
    
    const champ = datadragon.getChampion(champId);
    Utils.toast(`${champ ? champ.name : '알 수 없는 챔피언'}을(를) 밴했습니다.`);
  } catch (error) {
    console.error('밴 설정 실패:', error);
    Utils.toast('밴 설정에 실패했습니다.');
  }
}

// 내 밴 해제
async function clearMyBan() {
  if (!gameManager.roomId) return;
  
  try {
    await window.db.ref(`rooms/${gameManager.roomId}/players/${gameManager.uid}`).update({
      ban: null
    });
    Utils.toast('밴을 해제했습니다.');
  } catch (error) {
    console.error('밴 해제 실패:', error);
    Utils.toast('밴 해제에 실패했습니다.');
  }
}

// 호스트 전용: 전체 리롤
async function hostRollBoth() {
  if (!gameManager.roomId || !gameManager.isHost) return;
  
  try {
    Utils.$('#forceRollBtn').disabled = true;
    Utils.$('#forceRollBtn').textContent = '생성 중...';
    
    await datadragon.loadChampions();
    
    // 밴된 챔피언들 수집
    const playersSnap = await window.db.ref(`rooms/${gameManager.roomId}/players`).once('value');
    const players = playersSnap.val() || {};
    
    const bannedChamps = new Set();
    Object.values(players).forEach(p => {
      if (p.ban) bannedChamps.add(p.ban);
    });
    
    // 랜덤 풀 생성
    const team1Pool = datadragon.getRandomChampions(bannedChamps, 15);
    const team2Pool = datadragon.getRandomChampions(new Set([...bannedChamps, ...team1Pool]), 15);
    
    if (team1Pool.length < 15 || team2Pool.length < 15) {
      Utils.toast('후보 챔피언이 부족합니다. 밴을 줄여주세요.');
      return;
    }
    
    // 풀 업데이트
    await window.db.ref(`rooms/${gameManager.roomId}/pool`).update({
      team1: team1Pool,
      team2: team2Pool,
      version: datadragon.version,
      rolledAt: firebase.database.ServerValue.TIMESTAMP
    });
    
    Utils.toast('새로운 챔피언 풀을 생성했습니다!');
  } catch (error) {
    console.error('풀 생성 실패:', error);
    Utils.toast('풀 생성에 실패했습니다.');
  } finally {
    Utils.$('#forceRollBtn').disabled = false;
    Utils.$('#forceRollBtn').textContent = '전체 리롤';
  }
}

// 호스트 전용: 팀별 리롤
async function hostRollTeam(team) {
  if (!gameManager.roomId || !gameManager.isHost) return;
  
  try {
    const btn = Utils.$(`#force${team === 'team1' ? 'Team1' : 'Team2'}Btn`);
    btn.disabled = true;
    btn.textContent = '생성 중...';
    
    await datadragon.loadChampions();
    
    // 현재 풀과 밴 정보 가져오기
    const [poolSnap, playersSnap] = await Promise.all([
      window.db.ref(`rooms/${gameManager.roomId}/pool`).once('value'),
      window.db.ref(`rooms/${gameManager.roomId}/players`).once('value')
    ]);
    
    const pool = poolSnap.val() || { team1: [], team2: [] };
    const players = playersSnap.val() || {};
    
    // 제외할 챔피언들 (밴 + 상대팀 풀)
    const excluded = new Set();
    Object.values(players).forEach(p => {
      if (p.ban) excluded.add(p.ban);
    });
    
    const otherTeam = team === 'team1' ? 'team2' : 'team1';
    pool[otherTeam].forEach(id => excluded.add(id));
    
    // 새 풀 생성
    const newPool = datadragon.getRandomChampions(excluded, 15);
    
    if (newPool.length < 15) {
      Utils.toast('후보 챔피언이 부족합니다.');
      return;
    }
    
    // 풀 업데이트
    const updates = {
      [team]: newPool,
      version: datadragon.version,
      rolledAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    await window.db.ref(`rooms/${gameManager.roomId}/pool`).update(updates);
    
    Utils.toast(`${team === 'team1' ? '팀 1' : '팀 2'} 풀을 새로 생성했습니다!`);
  } catch (error) {
    console.error('팀 리롤 실패:', error);
    Utils.toast('팀 리롤에 실패했습니다.');
  } finally {
    const btn = Utils.$(`#force${team === 'team1' ? 'Team1' : 'Team2'}Btn`);
    btn.disabled = false;
    btn.textContent = `${team === 'team1' ? '팀1' : '팀2'} 리롤`;
  }
}

// 호스트 전용: 모든 투표 초기화
async function resetAllVotes() {
  if (!gameManager.roomId || !gameManager.isHost) return;
  
  try {
    const { ref, remove } = window.firebase;
    await remove(ref(window.db, `rooms/${gameManager.roomId}/votes`));
    Utils.toast('모든 투표를 초기화했습니다.');
  } catch (error) {
    console.error('투표 초기화 실패:', error);
    Utils.toast('투표 초기화에 실패했습니다.');
  }
}

// 내 픽 복원
function restoreMyPick() {
  const savedPick = localStorage.getItem('myPick');
  if (savedPick && gameManager.renderMyPick) {
    gameManager.renderMyPick(savedPick);
  }
}

// 전역 함수로 노출 (디버깅용)
window.app = {
  gameManager,
  datadragon,
  modals,
  Utils
};