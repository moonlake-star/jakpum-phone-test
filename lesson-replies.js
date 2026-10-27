/* 레슨별 비공개 답신. 인증/공개 범위는 서버에서 재검증한다. */
(function (root) {
  const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const time = n => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
  function mount(box, {request, teacher = false, getClip = () => null, playClip = () => {}}) {
    let pending = null, clip = null, busy = false;
    box.innerHTML = `<h2>💬 레슨 답신</h2><p class="muted">수강생과 선생님이 이 레슨에 관해 이야기하는 공간이에요.</p>
      <button type="button" data-refresh>대화 불러오기</button><div data-messages></div>
      <label> ${teacher ? '수강생에게 답장' : '선생님께 답신하기'}<textarea data-text maxlength="2000" rows="4" style="width:100%;font:inherit;background:#22262c;color:#eceff3;padding:12px" placeholder="${teacher ? '직접 확인한 내용으로 답장을 남겨주세요.' : '직접 연습해 보니 어떠셨나요? 어려웠던 부분이나 새롭게 느낀 점을 남겨주세요.'}"></textarea></label>
      ${teacher ? '' : '<div data-prompts><button type="button">🎵 따라 불러봤어요</button> <button type="button">🙋 이 부분이 궁금해요</button> <button type="button">🌱 이런 변화가 느껴졌어요</button></div><button type="button" data-attach>지금 듣는 녹음 위치 첨부</button><button type="button" data-clear>첨부 해제</button><p data-clip></p>'}
      <button type="button" data-send>답신 보내기</button><p data-status role="status" aria-live="polite"></p>`;
    const q = s => box.querySelector(s), input = q('[data-text]'), status = q('[data-status]');
    const action = a => teacher ? 't_' + a : a;
    function show(j) {
      if (!Array.isArray(j.messages)) throw new Error('답신 기능 연결을 확인해 주세요. 입력한 내용은 유지됩니다.');
      q('[data-messages]').innerHTML = j.messages.map((m, i) => `<div style="border-top:1px solid #555;padding:12px 0"><b>${m.role === 'teacher' ? '선생님' : '수강생'}</b><div style="white-space:pre-wrap">${escape(m.text)}</div><small>${escape(m.at)}</small>${m.clip ? `<button type="button" data-play="${i}">▶ ${time(m.clip.seconds)} 위치 듣기</button>` : ''}</div>`).join('') || '<p>아직 답신이 없어요. 편하게 이야기를 남겨주세요.</p>';
      box.querySelectorAll('[data-play]').forEach(b => b.onclick = () => Promise.resolve(playClip(j.messages[Number(b.dataset.play)].clip)).catch(e => { status.textContent = e.message; }));
    }
    q('[data-refresh]').onclick = async () => { try { show(await request(action('replies'))); status.textContent = ''; } catch(e) { status.textContent = e.message; } };
    box.querySelectorAll('[data-prompts] button').forEach(b => b.onclick = () => { input.value += (input.value ? '\n' : '') + b.textContent.slice(3).trim() + ' '; input.focus(); });
    if (!teacher) {
      q('[data-attach]').onclick = () => { clip = getClip(); q('[data-clip]').textContent = clip ? `${time(clip.seconds)} 위치 첨부됨` : '이 레슨의 녹음을 재생한 뒤 눌러주세요.'; };
      q('[data-clear]').onclick = () => { clip = null; q('[data-clip]').textContent = ''; };
    }
    q('[data-send]').onclick = async () => {
      if (busy) return;
      const text = input.value.trim();
      if (!text || text.length > 2000) { status.textContent = '답신은 1~2000자로 입력해 주세요.'; return; }
      const fingerprint = JSON.stringify({text, clip});
      if (!pending || pending.fingerprint !== fingerprint) pending = {fingerprint, request_id: crypto.randomUUID()};
      busy = true; box.querySelectorAll('button,textarea').forEach(el => el.disabled = true);
      try {
        show(await request(action('reply_send'), {text, clip, request_id: pending.request_id}));
        input.value = ''; pending = null; clip = null; if(q('[data-clip]')) q('[data-clip]').textContent = '';
        status.textContent = '답신을 저장했어요.';
      } catch (e) { status.textContent = e.message + ' 입력한 내용은 그대로 있어요. 다시 보내기를 눌러주세요.'; }
      finally { busy = false; box.querySelectorAll('button,textarea').forEach(el => el.disabled = false); }
    };
  }
  root.LessonReplies = {mount, escape};
})(globalThis);
