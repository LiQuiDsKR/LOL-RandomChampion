// 모달 관리 클래스
class ModalManager {
  constructor() {
    this.activeModal = null;
  }

  show(modalId) {
    this.hideAll();
    const modal = Utils.$(modalId);
    if (modal) {
      modal.hidden = false;
      this.activeModal = modal;
      
      // ESC 키로 모달 닫기
      const handleKeydown = (e) => {
        if (e.key === 'Escape') {
          this.hide(modalId);
          document.removeEventListener('keydown', handleKeydown);
        }
      };
      document.addEventListener('keydown', handleKeydown);

      // 모달 배경 클릭으로 닫기
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hide(modalId);
        }
      });
    }
  }

  hide(modalId) {
    const modal = Utils.$(modalId);
    if (modal) {
      modal.hidden = true;
      if (this.activeModal === modal) {
        this.activeModal = null;
      }
    }
  }

  hideAll() {
    Utils.$$('.modal').forEach(modal => {
      modal.hidden = true;
    });
    this.activeModal = null;
  }

  isVisible(modalId) {
    const modal = Utils.$(modalId);
    return modal && !modal.hidden;
  }
}

// 방 생성 모달
class CreateRoomModal {
  constructor() {
    this.modal = null;
    this.init();
  }

  init() {
    // 모달 HTML 생성
    const modalHtml = `
      <div id="createRoomModal" class="modal" hidden>
        <div class="modal-content">
          <div class="modal-header">
            <h2>새 방 만들기</h2>
            <button class="close-btn" onclick="modals.hide('#createRoomModal')">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="gameNameInput">게임 이름 (선택사항)</label>
              <input id="gameNameInput" type="text" class="input" placeholder="예: 내전, 랭크게임 등">
              <div class="hint">빈칸으로 두면 기본 이름이 사용됩니다.</div>
            </div>
            <div class="form-group">
              <label for="hostNameInput">방장 이름 *</label>
              <input id="hostNameInput" type="text" class="input" placeholder="방장 닉네임을 입력하세요" required>
            </div>
            <div class="form-group">
              <label for="roomPasswordInput">방 비밀번호 (선택사항)</label>
              <input id="roomPasswordInput" type="password" class="input" placeholder="비밀번호를 설정하려면 입력하세요">
              <div class="hint">비밀번호를 설정하면 참가할 때 비밀번호를 입력해야 합니다.</div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn ghost" onclick="modals.hide('#createRoomModal')">취소</button>
            <button id="confirmCreateRoom" class="btn primary">방 만들기</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.modal = Utils.$('#createRoomModal');

    // 이벤트 리스너 바인딩
    Utils.$('#confirmCreateRoom').addEventListener('click', () => this.createRoom());
    
    // Enter 키 처리
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        this.createRoom();
      }
    });
  }

  show() {
    // 기존 입력값 초기화
    Utils.$('#gameNameInput').value = '';
    Utils.$('#hostNameInput').value = Utils.getUrlParam('name') || '';
    Utils.$('#roomPasswordInput').value = '';
    
    modals.show('#createRoomModal');
    Utils.$('#hostNameInput').focus();
  }

  async createRoom() {
    const gameName = Utils.$('#gameNameInput').value.trim();
    const hostName = Utils.$('#hostNameInput').value.trim();
    const password = Utils.$('#roomPasswordInput').value.trim();

    if (!hostName) {
      Utils.toast('방장 이름을 입력해주세요.');
      Utils.$('#hostNameInput').focus();
      return;
    }

    try {
      Utils.$('#confirmCreateRoom').disabled = true;
      Utils.$('#confirmCreateRoom').textContent = '생성 중...';

      await gameManager.createRoom({
        gameName: gameName || '칼바람 랜덤 게임',
        hostName,
        password: password || null
      });

      modals.hide('#createRoomModal');
    } catch (error) {
      console.error('방 생성 실패:', error);
      Utils.toast('방 생성에 실패했습니다.');
    } finally {
      Utils.$('#confirmCreateRoom').disabled = false;
      Utils.$('#confirmCreateRoom').textContent = '방 만들기';
    }
  }
}

// 방 참가 모달
class JoinRoomModal {
  constructor() {
    this.modal = null;
    this.roomData = null;
    this.init();
  }

  init() {
    const modalHtml = `
      <div id="joinRoomModal" class="modal" hidden>
        <div class="modal-content">
          <div class="modal-header">
            <h2>방 참가하기</h2>
            <button class="close-btn" onclick="modals.hide('#joinRoomModal')">&times;</button>
          </div>
          <div class="modal-body">
            <div id="roomPreview" class="form-group">
              <div class="text-muted">방 정보를 확인하고 있습니다...</div>
            </div>
            <div class="form-group">
              <label for="playerNameInput">플레이어 이름 *</label>
              <input id="playerNameInput" type="text" class="input" placeholder="닉네임을 입력하세요" required>
            </div>
            <div id="passwordGroup" class="form-group" style="display:none;">
              <label for="joinPasswordInput">방 비밀번호 *</label>
              <input id="joinPasswordInput" type="password" class="input" placeholder="비밀번호를 입력하세요">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn ghost" onclick="modals.hide('#joinRoomModal')">취소</button>
            <button id="confirmJoinRoom" class="btn primary">참가하기</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.modal = Utils.$('#joinRoomModal');

    Utils.$('#confirmJoinRoom').addEventListener('click', () => this.joinRoom());
    
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        this.joinRoom();
      }
    });
  }

  async show(roomId) {
    if (!roomId) {
      Utils.toast('잘못된 방 코드입니다.');
      return;
    }

    // 방 정보 미리보기
    try {
      this.roomData = await gameManager.getRoomInfo(roomId);
      
      const previewEl = Utils.$('#roomPreview');
      if (this.roomData) {
        previewEl.innerHTML = `
          <div style="padding: 0.75rem; background: var(--card); border-radius: 0.5rem; border: 1px solid var(--divider);">
            <div><strong>${Utils.escapeHtml(this.roomData.gameName || '칼바람 랜덤 게임')}</strong></div>
            <div class="text-muted">방장: ${Utils.escapeHtml(this.roomData.hostName || '알 수 없음')}</div>
            <div class="text-muted">현재 인원: ${this.roomData.playerCount || 0}명</div>
          </div>
        `;
        
        // 비밀번호 필드 표시/숨김
        const passwordGroup = Utils.$('#passwordGroup');
        if (this.roomData.hasPassword) {
          passwordGroup.style.display = 'block';
        } else {
          passwordGroup.style.display = 'none';
        }
      } else {
        previewEl.innerHTML = '<div class="text-muted" style="color: var(--danger);">존재하지 않는 방입니다.</div>';
        Utils.$('#confirmJoinRoom').disabled = true;
      }
    } catch (error) {
      Utils.$('#roomPreview').innerHTML = '<div class="text-muted" style="color: var(--danger);">방 정보를 불러올 수 없습니다.</div>';
      Utils.$('#confirmJoinRoom').disabled = true;
    }

    // 입력값 초기화
    Utils.$('#playerNameInput').value = Utils.getUrlParam('name') || '';
    Utils.$('#joinPasswordInput').value = '';
    
    modals.show('#joinRoomModal');
    Utils.$('#playerNameInput').focus();
  }

  async joinRoom() {
    if (!this.roomData) {
      Utils.toast('방 정보가 없습니다.');
      return;
    }

    const playerName = Utils.$('#playerNameInput').value.trim();
    const password = Utils.$('#joinPasswordInput').value.trim();

    if (!playerName) {
      Utils.toast('플레이어 이름을 입력해주세요.');
      Utils.$('#playerNameInput').focus();
      return;
    }

    if (this.roomData.hasPassword && !password) {
      Utils.toast('비밀번호를 입력해주세요.');
      Utils.$('#joinPasswordInput').focus();
      return;
    }

    try {
      Utils.$('#confirmJoinRoom').disabled = true;
      Utils.$('#confirmJoinRoom').textContent = '참가 중...';

      await gameManager.joinRoom(this.roomData.roomId, {
        playerName,
        password: password || null
      });

      modals.hide('#joinRoomModal');
    } catch (error) {
      console.error('방 참가 실패:', error);
      Utils.toast(error.message || '방 참가에 실패했습니다.');
    } finally {
      Utils.$('#confirmJoinRoom').disabled = false;
      Utils.$('#confirmJoinRoom').textContent = '참가하기';
    }
  }
}

// 전역 모달 관리자 인스턴스
window.modals = new ModalManager();
window.createRoomModal = new CreateRoomModal();
window.joinRoomModal = new JoinRoomModal();