import "./style.css";
import { createClient } from "@supabase/supabase-js";
import { Share } from "@capacitor/share";

// 1. Add your Supabase project URL and anon/publishable key here.
const SUPABASE_URL = 'https://sgapmziszldmbaqizwrm.supabase.co';
const SUPABASE_ANON_KEY = "sb_publishable_76V1fpaaMHqh1t7a3y958A_nmQSny_l";
const supabaseReady =
  SUPABASE_URL.startsWith("https://") && !SUPABASE_ANON_KEY.includes("YOUR_");
const supabase = supabaseReady
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const questions = [
  {
    q: "Your ideal weekend looks like…",
    options: [
      "A quiet day at home",
      "Exploring somewhere new",
      "Meeting friends",
      "A little bit of everything",
    ],
  },
  {
    q: "When making a big decision, you trust…",
    options: [
      "Logic and facts",
      "My feelings",
      "Advice from people I trust",
      "A mix of everything",
    ],
  },
  {
    q: "Which place would you choose to live?",
    options: [
      "A busy city",
      "A peaceful village",
      "Near the ocean",
      "Somewhere in the mountains",
    ],
  },
  {
    q: "You are more likely to…",
    options: [
      "Plan everything",
      "Go with the flow",
      "Plan the important things",
      "Decide at the last minute",
    ],
  },
  {
    q: "Which superpower would you pick?",
    options: [
      "Read minds",
      "Pause time",
      "Teleport anywhere",
      "See the future",
    ],
  },
  {
    q: "In a group, you are usually the…",
    options: ["Listener", "Storyteller", "Problem solver", "Quiet observer"],
  },
  {
    q: "What matters most in a friendship?",
    options: ["Honesty", "Loyalty", "Having fun", "Understanding each other"],
  },
  {
    q: "If you had a free plane ticket, you would…",
    options: [
      "Visit a country I have never seen",
      "Return to a favourite place",
      "Visit family or friends",
      "Choose a random destination",
    ],
  },
  {
    q: "Which describes you better?",
    options: [
      "More introverted",
      "More extroverted",
      "Somewhere in between",
      "It depends on the day",
    ],
  },
  {
    q: "What motivates you most?",
    options: [
      "Achieving a goal",
      "Making people happy",
      "Learning something new",
      "Freedom and new experiences",
    ],
  },
];

const app = document.querySelector("#app");
let currentUser = null;
let activeMatch = null;
let myAnswers = {};
let pollTimer = null;

function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}
function codeFromUrl() {
  return new URLSearchParams(location.search).get("match");
}
function makeCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(5)))
    .map((n) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n % 32])
    .join("");
}
function inviteUrl(code) {
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("match", code);
  return url.toString();
}
function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}
function header() {
  return `<header class="topbar">
    <a class="brand" href="#" data-action="home">twyn<span>.</span></a>
    <span class="top-note">TWO MINDS. ONE CONNECTION.</span>
    <span class="brand-mark" aria-hidden="true"><i></i><i></i></span>
  </header>`;
}
function shell(content) {
  app.innerHTML = `${header()}<main>${content}</main><footer>MADE FOR THE SPACE BETWEEN TWO PEOPLE <span>✳</span></footer>`;
}
function showSetup() {
  shell(`<section class="hero">
      <p class="eyebrow"><b>01</b> / GET CURIOUS</p>
      <h1>How alike<br>are you <em>really?</em></h1>
      <p class="intro">Ten questions. Two perspectives. One unexpected connection.</p>
      <div class="hero-art" aria-hidden="true"><div class="circle circle-red"></div><div class="circle circle-blue"></div><div class="circle circle-yellow"></div><span>YOU<br>×<br>ME</span></div>
      <div class="hero-actions">
        <button class="button button-dark" data-action="create">Create a match <span>↗</span></button>
        <button class="button button-outline" data-action="join-prompt">Join with a code <span>＋</span></button>
      </div>
      <p class="microcopy">NO ACCOUNT · NO PROFILE · JUST TWO PEOPLE</p>
    </section>
    <section class="how-grid">
      <article><b>01</b><h3>Make a match</h3><p>Create a private room and invite someone.</p></article>
      <article><b>02</b><h3>Answer honestly</h3><p>Choose what feels most like you.</p></article>
      <article><b>03</b><h3>See the difference</h3><p>Compare your answers when both are done.</p></article>
    </section>`);
}
function showJoinPrompt() {
  shell(`<section class="simple-panel">
    <p class="eyebrow"><b>JOIN A MATCH</b> / ENTER INVITE CODE</p>
    <h1>Someone sent<br>you a <em>Twyn.</em></h1>
    <p class="intro">Enter the short code from your invitation.</p>
    <form id="join-form" class="join-form">
      <input id="join-code" maxlength="5" autocomplete="off" placeholder="ABCDE" aria-label="Invite code" required>
      <button class="button button-dark">Join match ↗</button>
    </form>
    <button class="text-button" data-action="home">← Back home</button>
  </section>`);
}
function showQuiz() {
  const n = Object.keys(myAnswers).length;
  const firstUnanswered = questions.findIndex(
    (_, i) => myAnswers[i] === undefined,
  );
  const index = firstUnanswered < 0 ? 0 : firstUnanswered;
  const q = questions[index];
  shell(`<section class="quiz-wrap">
    <div class="quiz-top"><p class="eyebrow">YOUR TURN / ${activeMatch.role === "creator" ? "MATCH CREATOR" : "GUEST"}</p><span class="counter">${String(n).padStart(2, "0")} / 10</span></div>
    <div class="progress-line"><span style="width:${n * 10}%"></span></div>
    <p class="question-index">QUESTION ${String(index + 1).padStart(2, "0")}</p>
    <h1 class="question-title">${escapeHtml(q.q)}</h1>
    <div class="options">${q.options.map((option, i) => `<button class="option ${myAnswers[index] === i ? "selected" : ""}" data-answer="${i}"><span class="option-letter">${"ABCD"[i]}</span><span>${escapeHtml(option)}</span><span class="option-check">↗</span></button>`).join("")}</div>
    <div class="quiz-bottom"><span>Choose the answer that feels most like you.</span><button class="button button-dark" data-action="next" ${myAnswers[index] === undefined ? "disabled" : ""}>${n === 10 ? "Finish answers" : "Next question"} ↗</button></div>
  </section>`);
  app.querySelectorAll("[data-answer]").forEach((btn) =>
    btn.addEventListener("click", () => {
      myAnswers[index] = Number(btn.dataset.answer);
      showQuiz();
    }),
  );
}
async function ensureGuest() {
  if (!supabase)
    throw new Error("Add your Supabase URL and anon key in src/main.js first.");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    return currentUser;
  }
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  currentUser = data.user;
  return currentUser;
}
async function createMatch() {
  try {
    await ensureGuest();
    const code = makeCode();
    const { data, error } = await supabase
      .from("matches")
      .insert({ code, creator_id: currentUser.id })
      .select()
      .single();
    if (error) throw error;
    activeMatch = { ...data, role: "creator" };
    myAnswers = {};
    await showInvite();
  } catch (e) {
    showError(e.message);
  }
}
async function joinMatch(code) {
  try {
    await ensureGuest();
    const { data, error } = await supabase.rpc("join_match", {
      p_code: code.toUpperCase(),
    });
    if (error) throw error;
    const matchId = data;
    const { data: match, error: readError } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();
    if (readError) throw readError;
    activeMatch = { ...match, role: "guest" };
    myAnswers = {};
    showQuiz();
  } catch (e) {
    showError(
      e.message ||
        "We could not join that match. Check the code and try again.",
    );
  }
}
async function showInvite() {
  const url = inviteUrl(activeMatch.code);
  shell(`<section class="invite-panel">
    <p class="eyebrow"><b>MATCH CREATED</b> / YOUR INVITATION</p>
    <div class="invite-symbol">↗</div>
    <h1>Your person<br>is <em>one link away.</em></h1>
    <p class="intro">Send this invitation to someone. You can answer your questions while they join.</p>
    <div class="code-box"><span>YOUR MATCH CODE</span><strong>${activeMatch.code}</strong><button data-action="copy-code">COPY</button></div>
    <div class="share-grid">
      <button class="share-button whatsapp" data-share="whatsapp">WhatsApp ↗</button>
      <button class="share-button telegram" data-share="telegram">Telegram ↗</button>
      <button class="share-button viber" data-share="viber">Viber ↗</button>
      <button class="share-button copy" data-share="copy">Copy link ↗</button>
    </div>
    <button class="button button-dark full-button" data-action="start">Answer my questions ↗</button>
    <p class="microcopy">YOUR MATCH STAYS OPEN UNTIL BOTH PEOPLE FINISH.</p>
  </section>`);
  app
    .querySelectorAll("[data-share]")
    .forEach((btn) =>
      btn.addEventListener("click", () => shareInvite(btn.dataset.share, url)),
    );
}
async function shareInvite(channel, url) {
  const message = `I made a Twyn match. Answer 10 questions and let's see how alike we are! ${url}`;
  if (channel === "copy") {
    await navigator.clipboard.writeText(url);
    toast("Invitation link copied.");
  } else if (channel === "whatsapp") {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  } else if (channel === "telegram") {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent("I made a Twyn match. Join me!")}`,
      "_blank",
    );
  } else if (channel === "viber") {
    try {
      await Share.share({ title: "Join my Twyn match", text: message, url });
    } catch {
      window.location.href = `viber://forward?text=${encodeURIComponent(message)}`;
    }
  }
}
async function saveAnswers() {
  try {
    const { error } = await supabase.from("answers").upsert(
      {
        match_id: activeMatch.id,
        participant_id: currentUser.id,
        answers: myAnswers,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "match_id,participant_id" },
    );
    if (error) throw error;
    showWaiting();
  } catch (e) {
    showError(e.message);
  }
}
function showWaiting() {
  shell(`<section class="waiting-panel">
    <div class="waiting-orbit"><span>YOU</span><b>+</b><span>THEM</span></div>
    <p class="eyebrow">ANSWERS SAVED</p>
    <h1>Now we wait<br>for <em>the other mind.</em></h1>
    <p class="intro">Your answers are safe. We'll reveal the comparison as soon as your partner finishes.</p>
    <div class="waiting-status"><i></i><span>WAITING FOR YOUR MATCH</span></div>
    <button class="button button-outline" data-action="check">Check again ↻</button>
    <button class="text-button" data-action="home">Back to home</button>
  </section>`);
  checkResults();
  stopPolling();
  pollTimer = setInterval(checkResults, 3500);
}
async function checkResults() {
  if (!activeMatch || !currentUser) return;
  const { data, error } = await supabase
    .from("answers")
    .select("*")
    .eq("match_id", activeMatch.id);
  if (error) return;
  if (data?.length >= 2) {
    stopPolling();
    showResults(data);
  }
}
async function showResults(answerRows) {
  const mine = answerRows.find((a) => a.participant_id === currentUser.id);
  const theirs = answerRows.find((a) => a.participant_id !== currentUser.id);
  if (!mine || !theirs) return;
  const mineAnswers = mine.answers;
  const theirAnswers = theirs.answers;
  let same = 0;
  questions.forEach((_, i) => {
    if (Number(mineAnswers[i]) === Number(theirAnswers[i])) same++;
  });
  const percent = Math.round((same / questions.length) * 100);
  const resultTitle =
    percent >= 80
      ? "Same wavelength."
      : percent >= 50
        ? "A little alike, a lot to discover."
        : "Beautifully different.";
  shell(`<section class="results">
    <p class="eyebrow"><b>THE REVEAL</b> / MATCH ${activeMatch.code}</p>
    <div class="score-stamp"><strong>${percent}<small>%</small></strong><span>IN SYNC</span></div>
    <h1>${escapeHtml(resultTitle)}</h1>
    <p class="intro">You matched on <b>${same} out of 10</b> answers. Similarity is fun — differences make the story.</p>
    <div class="result-list">${questions
      .map((q, i) => {
        const a = Number(mineAnswers[i]),
          b = Number(theirAnswers[i]),
          matched = a === b;
        return `<article class="result-row ${matched ? "match" : "different"}">
        <div class="result-question"><span>0${i + 1}</span><b>${escapeHtml(q.q)}</b><i>${matched ? "SAME" : "DIFFERENT"}</i></div>
        <div class="answer-pair"><p><small>YOU</small>${escapeHtml(q.options[a] ?? "—")}</p><p><small>THEM</small>${escapeHtml(q.options[b] ?? "—")}</p></div>
      </article>`;
      })
      .join("")}</div>
    <button class="button button-dark full-button" data-action="home">Make another match ↗</button>
  </section>`);
}
function showError(message) {
  shell(
    `<section class="simple-panel error-panel"><p class="eyebrow">OOPS / SOMETHING WENT WRONG</p><h1>Let's try<br><em>that again.</em></h1><p class="intro">${escapeHtml(message)}</p><button class="button button-dark" data-action="home">Back home ↗</button></section>`,
  );
}
function toast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 2200);
}

app.addEventListener("click", async (event) => {
  const actionEl = event.target.closest("[data-action]");
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  if (action === "home") {
    stopPolling();
    history.replaceState({}, "", location.pathname);
    activeMatch = null;
    showSetup();
  }
  if (action === "create") await createMatch();
  if (action === "join-prompt") showJoinPrompt();
  if (action === "next") {
    const n = Object.keys(myAnswers).length;
    if (n >= questions.length) await saveAnswers();
    else showQuiz();
  }
  if (action === "start") showQuiz();
  if (action === "copy-code") {
    await navigator.clipboard.writeText(activeMatch.code);
    toast("Match code copied.");
  }
  if (action === "check") await checkResults();
});

app.addEventListener("submit", async (event) => {
  if (event.target.id !== "join-form") return;
  event.preventDefault();
  const code = document.querySelector("#join-code").value.trim();
  if (code.length !== 5)
    return showError("Please enter the five-character invitation code.");
  await joinMatch(code);
});

async function boot() {
  showSetup();
  const code = codeFromUrl();
  if (code) await joinMatch(code);
}
boot();
